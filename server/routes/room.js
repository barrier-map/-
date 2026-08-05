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
        password
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


module.exports = router;
