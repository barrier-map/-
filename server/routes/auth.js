const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("../database/database");

const router = express.Router();

// 로그인 도장을 찍는 비밀 문구
// .env 파일에 JWT_SECRET 을 적어두면 그 값을 쓰고, 없으면 기본값을 씁니다.
// (배포한 사이트에서는 반드시 .env 쪽에 값을 넣어주세요)
const SECRET_KEY = process.env.JWT_SECRET || "DARAKBANG_SECRET_KEY";


// ===========================
// 닉네임 사용 가능한지 확인
// GET /api/auth/check-username/:username
// ===========================
router.get("/check-username/:username", async (req, res) => {

    const username = (req.params.username || "").trim();

    if (username.length < 2) {
        return res.json({
            success: false,
            available: false,
            message: "닉네임은 2글자 이상이어야 합니다."
        });
    }

    try {
        const existing = await db.execute({
            sql: "SELECT id FROM users WHERE username = ?",
            args: [username],
        });

        const available = existing.rows.length === 0;

        res.json({
            success: true,
            available,
            message: available
                ? "사용할 수 있는 닉네임입니다."
                : "이미 사용 중인 닉네임입니다."
        });

    } catch (err) {
        console.log(err);
        return res.json({
            success: false,
            available: false,
            message: "DB 오류"
        });
    }

});


// ===========================
// 회원가입
// POST /api/auth/register
// ===========================
router.post("/register", async (req, res) => {

    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.json({
            success: false,
            message: "모든 항목을 입력해주세요."
        });
    }

    const trimmedName = username.trim();

    if (trimmedName.length < 2) {
        return res.json({
            success: false,
            message: "닉네임은 2글자 이상이어야 합니다."
        });
    }

    try {
        // 이메일 중복 확인
        const existingEmail = await db.execute({
            sql: "SELECT id FROM users WHERE email = ?",
            args: [email],
        });

        if (existingEmail.rows.length > 0) {
            return res.json({
                success: false,
                message: "이미 가입된 이메일입니다."
            });
        }

        // 닉네임 중복 확인
        const existingName = await db.execute({
            sql: "SELECT id FROM users WHERE username = ?",
            args: [trimmedName],
        });

        if (existingName.rows.length > 0) {
            return res.json({
                success: false,
                message: "이미 사용 중인 닉네임입니다."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.execute({
            sql: `INSERT INTO users(username,email,password)
                  VALUES(?,?,?)`,
            args: [trimmedName, email, hashedPassword],
        });

        res.json({
            success: true,
            message: "회원가입 완료"
        });

    } catch (err) {
        console.log(err);
        return res.json({
            success: false,
            message: "회원가입 실패"
        });
    }

});


// ===========================
// 로그인
// POST /api/auth/login
// ===========================
router.post("/login", async (req, res) => {

    const { email, password } = req.body;

    try {
        const result = await db.execute({
            sql: "SELECT * FROM users WHERE email = ?",
            args: [email],
        });

        const user = result.rows[0];

        if (!user) {
            return res.json({
                success: false,
                message: "이메일이 존재하지 않습니다."
            });
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.json({
                success: false,
                message: "비밀번호가 틀렸습니다."
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email
            },
            SECRET_KEY,
            {
                expiresIn: "7d"
            }
        );

        res.json({
            success: true,
            message: "로그인 성공",
            token,
            user: {
                id: Number(user.id),
                username: user.username,
                email: user.email
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


// ===========================
// 닉네임 변경 (설정 페이지에서 사용)
// PUT /api/auth/nickname
// { userId, username }
// ===========================
router.put("/nickname", async (req, res) => {

    const { userId, username } = req.body;

    if (!userId || !username || !username.trim()) {
        return res.json({
            success: false,
            message: "닉네임을 입력해주세요."
        });
    }

    const trimmedName = username.trim();

    if (trimmedName.length < 2 || trimmedName.length > 12) {
        return res.json({
            success: false,
            message: "닉네임은 2~12글자로 지어주세요."
        });
    }

    try {
        // 나 말고 다른 사람이 쓰고 있는지 확인
        const existing = await db.execute({
            sql: "SELECT id FROM users WHERE username = ? AND id != ?",
            args: [trimmedName, userId],
        });

        if (existing.rows.length > 0) {
            return res.json({
                success: false,
                message: "이미 사용 중인 닉네임입니다."
            });
        }

        await db.execute({
            sql: "UPDATE users SET username = ? WHERE id = ?",
            args: [trimmedName, userId],
        });

        res.json({
            success: true,
            message: "닉네임이 변경되었습니다.",
            username: trimmedName
        });

    } catch (err) {
        console.log(err);
        return res.json({
            success: false,
            message: "닉네임 변경 실패"
        });
    }

});


// ===========================
// 토큰 확인 (자동 로그인용)
// GET /api/auth/verify
// ===========================
router.get("/verify", async (req, res) => {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: "토큰이 없습니다."
        });
    }

    const token = authHeader.split(" ")[1];

    let decoded;

    try {
        decoded = jwt.verify(token, SECRET_KEY);
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: "토큰이 만료되었습니다."
        });
    }

    try {
        const result = await db.execute({
            sql: "SELECT id, username, email FROM users WHERE id = ?",
            args: [decoded.id],
        });

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "존재하지 않는 사용자입니다."
            });
        }

        const row = result.rows[0];

        // 닉네임을 바꿨을 수도 있으니, 자동로그인 때 항상 최신 정보를 내려줌
        res.json({
            success: true,
            user: {
                id: Number(row.id),
                username: row.username,
                email: row.email
            }
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            success: false,
            message: "DB 오류"
        });
    }

});


module.exports = router;
