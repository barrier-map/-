const express = require("express");
const db = require("../database/database");

const router = express.Router();


// 한국 시간(KST) 기준 오늘 날짜 'YYYY-MM-DD'
function getTodayKST() {
    return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}


// 'YYYY-MM-DD' 문자열을 하루 전으로 되돌림
function previousDay(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 1);

    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}


// ======================
// 연속 출석일수 계산
//
// 오늘부터 하루씩 거꾸로 내려가면서 출석 기록이 있는지 확인하고,
// 기록이 끊기는 순간 멈춥니다.
// (오늘 아직 공부 안 했으면 어제부터 세기 시작 → 하루 종일 0으로 안 보이게)
// ======================
function calcStreak(dateSet) {
    const today = getTodayKST();

    let cursor = dateSet.has(today) ? today : previousDay(today);
    let streak = 0;

    while (dateSet.has(cursor)) {
        streak++;
        cursor = previousDay(cursor);
    }

    return streak;
}


// ======================
// 통계 한 번에 불러오기
// GET /api/stats/:userId
//
// 화면에서 필요한 걸 한 번에 다 내려줍니다.
//  - records : [{ date, seconds }]  날짜별 공부시간
//  - dates   : ["2026-08-01", ...]  출석한 날짜 목록
//  - streak  : 연속 출석일수
//  - totalDays / totalSeconds : 전체 누적
//  - todaySeconds : 오늘 공부한 시간(초)
//  - targetMinutes : 하루 목표 공부량(분)
// ======================

router.get("/:userId", async (req, res) => {

    const { userId } = req.params;

    try {
        const result = await db.execute({
            sql: `
                SELECT date, seconds
                FROM attendance
                WHERE user_id = ?
                ORDER BY date ASC
            `,
            args: [userId],
        });

        const records = result.rows.map((row) => ({
            date: row.date,
            seconds: Number(row.seconds || 0),
        }));

        const dates = records.map((r) => r.date);
        const dateSet = new Set(dates);

        const today = getTodayKST();
        const todayRecord = records.find((r) => r.date === today);

        // 목표 공부량 (설정 안 했으면 기본 120분)
        let targetMinutes = 120;

        try {
            const targetResult = await db.execute({
                sql: "SELECT daily_minutes FROM study_targets WHERE user_id = ?",
                args: [userId],
            });

            if (targetResult.rows.length > 0) {
                targetMinutes = Number(targetResult.rows[0].daily_minutes);
            }
        } catch (targetErr) {
            console.log(targetErr);
        }

        res.json({
            success: true,
            records,
            dates,
            streak: calcStreak(dateSet),
            totalDays: dates.length,
            totalSeconds: records.reduce((sum, r) => sum + r.seconds, 0),
            todaySeconds: todayRecord ? todayRecord.seconds : 0,
            targetMinutes,
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
// 하루 목표 공부량 저장
// POST /api/stats/target
// { userId, minutes }
// ======================

router.post("/target", async (req, res) => {

    const { userId, minutes } = req.body;

    if (!userId) {
        return res.json({
            success: false,
            message: "userId가 필요합니다."
        });
    }

    // 10분 ~ 1440분(24시간) 사이로 제한
    const safeMinutes = Math.min(1440, Math.max(10, Number(minutes) || 120));

    try {
        await db.execute({
            sql: `
                INSERT INTO study_targets (user_id, daily_minutes, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id)
                DO UPDATE SET
                    daily_minutes = excluded.daily_minutes,
                    updated_at = CURRENT_TIMESTAMP
            `,
            args: [userId, safeMinutes],
        });

        res.json({
            success: true,
            targetMinutes: safeMinutes
        });

    } catch (err) {
        console.log(err);
        return res.json({
            success: false,
            message: "목표 저장 실패"
        });
    }

});


module.exports = router;
