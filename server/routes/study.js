const express = require("express");
const db = require("../database/database");

const router = express.Router();


// ======================
// 공부메모 불러오기
// GET /api/study/memo/:userId
// ======================

router.get("/memo/:userId", (req, res) => {

    const { userId } = req.params;

    db.get(
        "SELECT content FROM study_memos WHERE user_id=?",
        [userId],
        (err, row) => {

            if (err) {
                return res.json({
                    success: false,
                    message: "DB 오류"
                });
            }

            res.json({
                success: true,
                content: row ? row.content : ""
            });

        }
    );

});


// ======================
// 공부메모 저장 (자동저장 - 있으면 수정, 없으면 새로 만듦)
// POST /api/study/memo
// ======================

router.post("/memo", (req, res) => {

    const { userId, content } = req.body;

    if (!userId) {
        return res.json({
            success: false,
            message: "userId가 필요합니다."
        });
    }

    db.run(
        `
        INSERT INTO study_memos (user_id, content, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id)
        DO UPDATE SET content=excluded.content, updated_at=CURRENT_TIMESTAMP
        `,
        [userId, content || ""],
        (err) => {

            if (err) {
                console.log(err);

                return res.json({
                    success: false,
                    message: "메모 저장 실패"
                });
            }

            res.json({
                success: true
            });

        }
    );

});


// ======================
// 목표 체크리스트 불러오기
// GET /api/study/goals/:userId
// ======================

router.get("/goals/:userId", (req, res) => {

    const { userId } = req.params;

    db.all(
        "SELECT * FROM study_goals WHERE user_id=? ORDER BY id DESC",
        [userId],
        (err, rows) => {

            if (err) {
                return res.json({
                    success: false,
                    message: "DB 오류"
                });
            }

            res.json({
                success: true,
                goals: rows
            });

        }
    );

});


// ======================
// 목표 추가
// POST /api/study/goals
// ======================

router.post("/goals", (req, res) => {

    const { userId, content } = req.body;

    if (!userId || !content || !content.trim()) {
        return res.json({
            success: false,
            message: "목표 내용을 입력해주세요."
        });
    }

    db.run(
        "INSERT INTO study_goals (user_id, content) VALUES (?, ?)",
        [userId, content],
        function (err) {

            if (err) {
                return res.json({
                    success: false,
                    message: "목표 추가 실패"
                });
            }

            res.json({
                success: true,
                goal: {
                    id: this.lastID,
                    user_id: userId,
                    content,
                    done: 0
                }
            });

        }
    );

});


// ======================
// 목표 완료 체크 토글
// PUT /api/study/goals/:id
// ======================

router.put("/goals/:id", (req, res) => {

    const { id } = req.params;
    const { done } = req.body;

    db.run(
        "UPDATE study_goals SET done=? WHERE id=?",
        [done ? 1 : 0, id],
        (err) => {

            if (err) {
                return res.json({
                    success: false,
                    message: "목표 수정 실패"
                });
            }

            res.json({ success: true });

        }
    );

});


// ======================
// 목표 삭제
// DELETE /api/study/goals/:id
// ======================

router.delete("/goals/:id", (req, res) => {

    const { id } = req.params;

    db.run(
        "DELETE FROM study_goals WHERE id=?",
        [id],
        (err) => {

            if (err) {
                return res.json({
                    success: false,
                    message: "목표 삭제 실패"
                });
            }

            res.json({ success: true });

        }
    );

});


module.exports = router;
