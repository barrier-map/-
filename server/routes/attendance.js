const express = require("express");
const router = express.Router();

const db = require("../database/database");

// ==========================
// 오늘 출석 체크
// POST /api/attendance/check
// ==========================
router.post("/check", async (req, res) => {

    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({
            success: false,
            message: "userId가 없습니다."
        });
    }

    const today = new Date().toISOString().slice(0, 10);

    try {

        const existing = await db.execute({
            sql: `
                SELECT *
                FROM attendance
                WHERE user_id = ?
                AND attendance_date = ?
            `,
            args: [userId, today]
        });

        if (existing.rows.length > 0) {

            return res.json({
                success: true,
                message: "이미 출석했습니다."
            });

        }

        await db.execute({
            sql: `
                INSERT INTO attendance(user_id, attendance_date)
                VALUES(?,?)
            `,
            args: [userId, today]
        });

        res.json({
            success: true,
            message: "출석 완료"
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: "DB 오류"
        });

    }

});

module.exports = router;