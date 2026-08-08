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

        res.json(result.rows);

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
            roomIds: result.rows.map((row) => row.room_id),
        });

    } catch (err) {
        console.log(err);
        return res.json({
            success: false,
            message: "DB 오류"
        });
    }

});


module.exports = router;
