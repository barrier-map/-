const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("../database/database");

const router = express.Router();

// JWT 비밀키 (나중에 .env 파일로 이동)
const SECRET_KEY = "DARAKBANG_SECRET_KEY";


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

    try {
        const existing = await db.execute({
            sql: "SELECT id FROM users WHERE email = ?",
            args: [email],
        });

        if (existing.rows.length > 0) {
            return res.json({
                success: false,
                message: "이미 가입된 이메일입니다."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.execute({
            sql: `INSERT INTO users(username,email,password)
                  VALUES(?,?,?)`,
            args: [username, email, hashedPassword],
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
                id: user.id,
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
// 토큰 확인 (자동 로그인용)
// GET /api/auth/verify
// ===========================
router.get("/verify", (req, res) => {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: "토큰이 없습니다."
        });
    }

    const token = authHeader.split(" ")[1];

    try {

const decoded = jwt.verify(token, SECRET_KEY);

db.execute({
    sql: "SELECT id, username, email FROM users WHERE id = ?",
    args: [decoded.id],
})
.then((result) => {

    if (result.rows.length === 0) {
        return res.status(401).json({
            success: false,
            message: "존재하지 않는 사용자입니다."
        });
    }

    res.json({
        success: true,
        user: result.rows[0]
    });

})
.catch((err) => {

    console.error(err);

    res.status(500).json({
        success: false,
        message: "DB 오류"
    });

});

    } catch (err) {

        return res.status(401).json({
            success: false,
            message: "토큰이 만료되었습니다."
        });

    }

});

module.exports = router;
