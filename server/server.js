const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const db = require("./database/database");

const authRouter = require("./routes/auth");
const roomRouter = require("./routes/room");
const studyRouter = require("./routes/study");

const app = express();
const server = http.createServer(app);

// ==========================
// Socket.IO
// ==========================
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// ==========================
// 기본 설정
// ==========================
app.use(cors());
app.use(express.json());

// ==========================
// API
// ==========================
app.use("/api/auth", authRouter);
app.use("/api/rooms", roomRouter);
app.use("/api/study", studyRouter);

// ==========================
// DB 생성
// ==========================
db.serialize(() => {

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT UNIQUE,
      password TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      password TEXT,
      owner_id INTEGER,
      max_users INTEGER DEFAULT 12,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 사용자 1명당 메모 1개 (자동저장이라 계속 덮어씀)
  db.run(`
    CREATE TABLE IF NOT EXISTS study_memos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      content TEXT DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 목표 체크리스트 (여러 개 가능)
  db.run(`
    CREATE TABLE IF NOT EXISTS study_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      done INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

});

// ==========================
// 기본 페이지
// ==========================
app.get("/", (req, res) => {
  res.send("🏠 DarakBang Server Running");
});

// ==========================
// Health Check
// ==========================
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server OK",
    time: new Date(),
  });
});

// ==========================
// Socket.IO
// ==========================

const rooms = {};

io.on("connection", (socket) => {

  console.log("접속 :", socket.id);

  socket.on("join-room", (roomId) => {

    socket.roomId = roomId;

    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    // ==========================
    // WebRTC - 기존 참가자 목록을 새로 들어온 사람에게만 전송
    // (반드시 push 하기 전에 보내야 "나 자신"이 목록에 안 들어감)
    // ==========================
    socket.emit("existing-users", rooms[roomId]);

    if (!rooms[roomId].includes(socket.id)) {
      rooms[roomId].push(socket.id);
    }

    socket.join(roomId);

    io.to(roomId).emit(
      "user-count",
      rooms[roomId].length
    );

    // 기존 참가자들에게 새 참가자 입장을 알림 (peer 연결 준비)
    socket.to(roomId).emit("user-joined", socket.id);

  });

  // ==========================
  // WebRTC 시그널 중계 (offer/answer/ice candidate 모두
  // simple-peer의 signal 데이터 하나로 통일해서 중계)
  // ==========================
  socket.on("signal", ({ target, signal }) => {

    io.to(target).emit("signal", {
      sender: socket.id,
      signal,
    });

  });

  socket.on("send-message", (data) => {

    io.to(data.roomId).emit("receive-message", data);

  });

  socket.on("disconnect", () => {

    console.log("퇴장 :", socket.id);

    const roomId = socket.roomId;

    if (!roomId || !rooms[roomId]) return;

    rooms[roomId] = rooms[roomId].filter(
      (id) => id !== socket.id
    );

    io.to(roomId).emit(
      "user-count",
      rooms[roomId].length
    );

    socket.to(roomId).emit("user-left", {
      socketId: socket.id,
    });

    if (rooms[roomId].length === 0) {
      delete rooms[roomId];
    }

  });

});

// ==========================
// 실행
// ==========================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {

  console.log("=======================================");
  console.log("🏠 DarakBang Server Started");
  console.log(`🚀 http://localhost:${PORT}`);
  console.log("💬 Socket.IO Ready");
  console.log("=======================================");

});