const express = require("express");
const db = require("../database/database");

const router = express.Router();


// ======================
// 방 생성
// ======================

router.post("/create", async (req, res) => {

    const {
        title,
        password,
        owner_id,
        max_users
    } = req.body;

    if (!title || !title.trim()) {
        return res.json({
            success: false,
            message: "방 이름을 입력해주세요."
        });
    }

    try {
        // 방 이름 중복 체크
        const existing = await db.execute({
            sql: "SELECT id FROM rooms WHERE title = ?",
            args: [title.trim()],
        });

        if (existing.rows.length > 0) {
            return res.json({
                success: false,
                message: "이미 사용 중인 방 이름입니다."
            });
        }

        const result = await db.execute({
            sql: `
            INSERT INTO rooms
            (title,password,owner_id,max_users)
            VALUES(?,?,?,?)
            `,
            args: [
                title.trim(),
                password || "",
                owner_id || 0,
                max_users || 12,
            ],
        });

        // 내가 만든 방도 "내 방" 탭에 보이도록 입장 기록에 같이 남김
        if (owner_id) {
            try {
                await db.execute({
                    sql: "INSERT OR IGNORE INTO room_visits (user_id, room_id) VALUES (?, ?)",
                    args: [owner_id, Number(result.lastInsertRowid)],
                });
            } catch (visitErr) {
                console.log(visitErr);
            }
        }

        res.json({
            success: true,
            roomId: Number(result.lastInsertRowid)
        });

    } catch (err) {
        console.log(err);
        return res.json({
            success: false,
            message: "방 생성 실패"
        });
    }

});


// ======================
// 방 목록
// ======================

router.get("/", async (req, res) => {

    try {
        const result = await db.execute(`
            SELECT
                id,
                title,
                owner_id,
                max_users,
                created_at,
                CASE
                    WHEN password IS NULL OR password=''
                    THEN 0
                    ELSE 1
                END AS hasPassword
            FROM rooms
            ORDER BY id DESC
        `);

        res.json(
            result.rows.map((row) => ({
                ...row,
                id: Number(row.id),
                owner_id: row.owner_id ? Number(row.owner_id) : null,
                max_users: Number(row.max_users),
                hasPassword: Number(row.hasPassword),
            }))
        );

    } catch (err) {
        console.log(err);
        return res.json({
            success: false
        });
    }

});


// ======================
// 방 입장
// ======================

router.post("/join", async (req, res) => {

    const {
        roomId,
        password,
        userId
    } = req.body;

    try {
        const result = await db.execute({
            sql: "SELECT * FROM rooms WHERE id=?",
            args: [roomId],
        });

        const room = result.rows[0];

        if (!room) {
            return res.json({
                success: false,
                message: "방이 존재하지 않습니다."
            });
        }

        if (room.password && room.password !== "") {
            if (room.password !== password) {
                return res.json({
                    success: false,
                    message: "비밀번호가 올바르지 않습니다."
                });
            }
        }

        // "내 방" 탭에서 볼 수 있도록 입장 기록 저장 (실패해도 입장 자체는 계속 진행)
        if (userId) {
            try {
                await db.execute({
                    sql: "INSERT OR IGNORE INTO room_visits (user_id, room_id) VALUES (?, ?)",
                    args: [userId, roomId],
                });
            } catch (visitErr) {
                console.log(visitErr);
            }
        }

        res.json({
            success: true,
            room: {
                id: room.id,
                title: room.title,
                max_users: room.max_users
            }
        });

    } catch (err) {
        console.log(err);
        return res.json({
            success: false,
            message: "DB 오류"
        });
    }

});


// ======================
// 내가 입장했던 방 목록
// GET /api/rooms/joined/:userId
// ======================

router.get("/joined/:userId", async (req, res) => {

    const { userId } = req.params;

    try {
        const result = await db.execute({
            sql: "SELECT room_id FROM room_visits WHERE user_id=?",
            args: [userId],
        });

        res.json({
            success: true,
            roomIds: result.rows.map((row) => Number(row.room_id)),
        });

    } catch (err) {
        console.log(err);
        return res.json({
            success: false,
            message: "DB 오류"
        });
    }

});


// ======================
// 방 상세 정보 (방장 확인용)
// GET /api/rooms/:id
// ======================

router.get("/:id", async (req, res) => {

    const { id } = req.params;

    try {
        const result = await db.execute({
            sql: "SELECT id, title, owner_id, max_users FROM rooms WHERE id=?",
            args: [id],
        });

        const room = result.rows[0];

        if (!room) {
            return res.json({
                success: false,
                message: "방이 존재하지 않습니다."
            });
        }

        res.json({
            success: true,
            room: {
                id: Number(room.id),
                title: room.title,
                owner_id: room.owner_id ? Number(room.owner_id) : null,
                max_users: Number(room.max_users),
            },
        });

    } catch (err) {
        console.log(err);
        return res.json({
            success: false,
            message: "DB 오류"
        });
    }

});


// ======================
// 방 채팅 기록 불러오기
// GET /api/rooms/:id/messages
// ======================

router.get("/:id/messages", async (req, res) => {

    const { id } = req.params;

    try {
        const result = await db.execute({
            sql: `
                SELECT username, message, created_at
                FROM chat_messages
                WHERE room_id=?
                ORDER BY id ASC
            `,
            args: [id],
        });

        res.json({
            success: true,
            messages: result.rows.map((row) => ({
                user: row.username,
                message: row.message,
                time: new Date(row.created_at).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
            })),
        });

    } catch (err) {
        console.log(err);
        return res.json({
            success: false,
            message: "DB 오류"
        });
    }

});


// ======================
// 방 삭제 (방장만 가능)
// DELETE /api/rooms/:id
// ======================

router.delete("/:id", async (req, res) => {

    const { id } = req.params;
    const { userId } = req.body;

    try {
        const result = await db.execute({
            sql: "SELECT owner_id FROM rooms WHERE id=?",
            args: [id],
        });

        const room = result.rows[0];

        if (!room) {
            return res.json({
                success: false,
                message: "방이 존재하지 않습니다."
            });
        }

        if (Number(room.owner_id) !== Number(userId)) {
            return res.json({
                success: false,
                message: "방장만 삭제할 수 있습니다."
            });
        }

        await db.execute({
            sql: "DELETE FROM rooms WHERE id=?",
            args: [id],
        });

        await db.execute({
            sql: "DELETE FROM room_visits WHERE room_id=?",
            args: [id],
        });

        res.json({ success: true });

    } catch (err) {
        console.log(err);
        return res.json({
            success: false,
            message: "방 삭제 실패"
        });
    }

});


module.exports = router;
