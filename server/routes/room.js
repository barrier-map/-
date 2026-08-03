const express = require("express");
const db = require("../database/database");

const router = express.Router();


// ======================
// 방 생성
// ======================

router.post("/create", (req, res) => {

    const {
        title,
        password,
        owner_id,
        max_users
    } = req.body;

    db.run(
        `
        INSERT INTO rooms
        (title,password,owner_id,max_users)
        VALUES(?,?,?,?)
        `,
        [
            title,
            password || "",
            owner_id || 0,
            max_users || 12
        ],
        function (err) {

            if (err) {

                console.log(err);

                return res.json({
                    success: false,
                    message: "방 생성 실패"
                });

            }

            res.json({
                success: true,
                roomId: this.lastID
            });

        }

    );

});


// ======================
// 방 목록
// ======================

router.get("/", (req, res) => {

    db.all(
        `
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
        `,
        [],
        (err, rows) => {

            if (err) {

                console.log(err);

                return res.json({
                    success: false
                });

            }

            res.json(rows);

        }

    );

});


// ======================
// 방 입장
// ======================

router.post("/join", (req, res) => {

    const {
        roomId,
        password
    } = req.body;

    db.get(

        "SELECT * FROM rooms WHERE id=?",

        [roomId],

        (err, room) => {

            if (err) {

                return res.json({
                    success: false,
                    message: "DB 오류"
                });

            }

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

        }

    );

});


module.exports = router;