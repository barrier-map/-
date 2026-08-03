const express = require("express");
const bcrypt = require("bcrypt");
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

    db.get(
        "SELECT * FROM users WHERE email = ?",
        [email],
        async (err, user) => {

            if (err) {
                return res.json({
                    success: false,
                    message: "DB 오류"
                });
            }

            if (user) {
                return res.json({
                    success: false,
                    message: "이미 가입된 이메일입니다."
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            db.run(
                `INSERT INTO users(username,email,password)
                 VALUES(?,?,?)`,
                [username, email, hashedPassword],
                function (err) {

                    if (err) {
                        return res.json({
                            success: false,
                            message: "회원가입 실패"
                        });
                    }

                    res.json({
                        success: true,
                        message: "회원가입 완료"
                    });

                }
            );

        }
    );

});


// ===========================
// 로그인
// POST /api/auth/login
// ===========================
router.post("/login", (req, res) => {

    const { email, password } = req.body;

    db.get(
        "SELECT * FROM users WHERE email = ?",
        [email],
        async (err, user) => {

            if (err) {
                return res.json({
                    success: false,
                    message: "DB 오류"
                });
            }

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

        }
    );

});

module.exports = router;