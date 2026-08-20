const express = require("express");
const db = require("../database/database");

const router = express.Router();

// 고를 수 있는 색상 목록 (이상한 값이 들어오는 걸 막기 위해 여기 있는 색만 허용함)
const COLOR_PALETTE = [
  "#4f46e5", // 보라
  "#ef4444", // 빨강
  "#f97316", // 주황
  "#eab308", // 노랑
  "#22c55e", // 초록
  "#06b6d4", // 하늘
  "#3b82f6", // 파랑
  "#ec4899", // 분홍
];

function safeColor(color) {
  return COLOR_PALETTE.includes(color) ? color : COLOR_PALETTE[0];
}



// ======================
// 디데이 목록 불러오기
// GET /api/calendar/:userId
// ======================

router.get("/:userId", async (req, res) => {

    const { userId } = req.params;

    try {
        const result = await db.execute({
            sql: "SELECT * FROM calendar_events WHERE user_id=? ORDER BY date ASC",
            args: [userId],
        });

        res.json({
            success: true,
            events: result.rows.map((row) => ({
                id: Number(row.id),
                title: row.title,
                date: row.date,
                color: safeColor(row.color),
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
// 디데이 추가
// POST /api/calendar
// ======================

router.post("/", async (req, res) => {

    const { userId, title, date, color } = req.body;

    if (!userId || !title || !title.trim() || !date) {
        return res.json({
            success: false,
            message: "제목과 날짜를 입력해주세요."
        });
    }

    const finalColor = safeColor(color);

    try {
        const result = await db.execute({
            sql: "INSERT INTO calendar_events (user_id, title, date, color) VALUES (?, ?, ?, ?)",
            args: [userId, title.trim(), date, finalColor],
        });

        res.json({
            success: true,
            event: {
                id: Number(result.lastInsertRowid),
                title: title.trim(),
                date,
                color: finalColor,
            },
        });

    } catch (err) {
        console.log(err);
        return res.json({
            success: false,
            message: "추가 실패"
        });
    }

});


// ======================
// 디데이 삭제
// DELETE /api/calendar/:id
// ======================

router.delete("/:id", async (req, res) => {

    const { id } = req.params;

    try {
        await db.execute({
            sql: "DELETE FROM calendar_events WHERE id=?",
            args: [id],
        });

        res.json({ success: true });

    } catch (err) {
        console.log(err);
        return res.json({
            success: false,
            message: "삭제 실패"
        });
    }

});


module.exports = router;
