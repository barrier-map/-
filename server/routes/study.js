const express = require("express");
const db = require("../database/database");

const router = express.Router();


// ======================
// 출석 날짜 목록
// GET /api/study/attendance/:userId
//
// ★ 통계 화면이 원래 이 주소로 요청을 보내고 있었는데
//   서버에 이 부분이 없어서 출석이 항상 0일로 보였습니다.
//   (더 자세한 통계는 /api/stats/:userId 쪽을 쓰세요)
// ======================

router.get("/attendance/:userId", async (req, res) => {

    const { userId } = req.params;

    try {
        const result = await db.execute({
            sql: "SELECT date, seconds FROM attendance WHERE user_id=? ORDER BY date ASC",
            args: [userId],
        });

        res.json({
            success: true,
            dates: result.rows.map((row) => row.date),
            records: result.rows.map((row) => ({
                date: row.date,
                seconds: Number(row.seconds || 0),
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
// 공부메모 불러오기
// GET /api/study/memo/:userId
// ======================

router.get("/memo/:userId", async (req, res) => {

    const { userId } = req.params;

    try {
        const result = await db.execute({
            sql: "SELECT content FROM study_memos WHERE user_id=?",
            args: [userId],
        });

        const row = result.rows[0];

        res.json({
            success: true,
            content: row ? row.content : ""
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
// 공부메모 저장 (자동저장 - 있으면 수정, 없으면 새로 만듦)
// POST /api/study/memo
// ======================

router.post("/memo", async (req, res) => {

    const { userId, content } = req.body;

    if (!userId) {
        return res.json({
            success: false,
            message: "userId가 필요합니다."
        });
    }

    try {
        await db.execute({
            sql: `
            INSERT INTO study_memos (user_id, content, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id)
            DO UPDATE SET content=excluded.content, updated_at=CURRENT_TIMESTAMP
            `,
            args: [userId, content || ""],
        });

        res.json({ success: true });

    } catch (err) {
        console.log(err);
        return res.json({
            success: false,
            message: "메모 저장 실패"
        });
    }

});


// ======================
// 목표 체크리스트 불러오기
// GET /api/study/goals/:userId
// ======================

router.get("/goals/:userId", async (req, res) => {

    const { userId } = req.params;

    try {
        const result = await db.execute({
            sql: "SELECT * FROM study_goals WHERE user_id=? ORDER BY id DESC",
            args: [userId],
        });

        res.json({
            success: true,
            goals: result.rows
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
// 목표 추가
// POST /api/study/goals
// ======================

router.post("/goals", async (req, res) => {

    const { userId, content } = req.body;

    if (!userId || !content || !content.trim()) {
        return res.json({
            success: false,
            message: "목표 내용을 입력해주세요."
        });
    }

    try {
        const result = await db.execute({
            sql: "INSERT INTO study_goals (user_id, content) VALUES (?, ?)",
            args: [userId, content],
        });

        res.json({
            success: true,
            goal: {
                id: Number(result.lastInsertRowid),
                user_id: userId,
                content,
                done: 0
            }
        });

    } catch (err) {
        console.log(err);
        return res.json({
            success: false,
            message: "목표 추가 실패"
        });
    }

});


// ======================
// 목표 완료 체크 토글
// PUT /api/study/goals/:id
// ======================

router.put("/goals/:id", async (req, res) => {

    const { id } = req.params;
    const { done } = req.body;

    try {
        await db.execute({
            sql: "UPDATE study_goals SET done=? WHERE id=?",
            args: [done ? 1 : 0, id],
        });

        res.json({ success: true });

    } catch (err) {
        console.log(err);
        return res.json({
            success: false,
            message: "목표 수정 실패"
        });
    }

});


// ======================
// 목표 삭제
// DELETE /api/study/goals/:id
// ======================

router.delete("/goals/:id", async (req, res) => {

    const { id } = req.params;

    try {
        await db.execute({
            sql: "DELETE FROM study_goals WHERE id=?",
            args: [id],
        });

        res.json({ success: true });

    } catch (err) {
        console.log(err);
        return res.json({
            success: false,
            message: "목표 삭제 실패"
        });
    }

});


module.exports = router;
