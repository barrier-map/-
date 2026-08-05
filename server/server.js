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
// DB 생성 (Turso는 비동기 방식이라 async 함수로 감싸서 실행)
// ==========================
async function initTables() {

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT UNIQUE,
      password TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
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
  await db.execute(`
    CREATE TABLE IF NOT EXISTS study_memos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      content TEXT DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 목표 체크리스트 (여러 개 가능)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS study_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      done INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

}

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

  socket.on("join-room", ({ roomId, username }) => {

    socket.roomId = roomId;
    socket.username = username || "익명";

    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    // ==========================
    // WebRTC - 기존 참가자 목록(닉네임 포함)을 새로 들어온 사람에게만 전송
    // (반드시 push 하기 전에 보내야 "나 자신"이 목록에 안 들어감)
    // ==========================
    socket.emit("existing-users", rooms[roomId]);

    if (!rooms[roomId].some((p) => p.id === socket.id)) {
      rooms[roomId].push({ id: socket.id, username: socket.username });
    }

    socket.join(roomId);

    io.to(roomId).emit(
      "user-count",
      rooms[roomId].length
    );

    // 기존 참가자들에게 새 참가자 입장을 알림 (peer 연결 준비)
    socket.to(roomId).emit("user-joined", {
      id: socket.id,
      username: socket.username,
    });

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

  // 마이크 on/off 상태를 같은 방 사람들에게 알림
  socket.on("mic-status", ({ micOn }) => {
    if (!socket.roomId) return;

    socket.to(socket.roomId).emit("mic-status", {
      socketId: socket.id,
      micOn,
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
      (p) => p.id !== socket.id
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
// 실행 (DB 테이블 준비가 끝난 뒤에 서버를 켬)
// ==========================

const PORT = process.env.PORT || 5000;

initTables()
  .then(() => {
    server.listen(PORT, () => {

      console.log("=======================================");
      console.log("🏠 DarakBang Server Started");
      console.log(`🚀 http://localhost:${PORT}`);
      console.log("💬 Socket.IO Ready");
      console.log("=======================================");

    });
  })
  .catch((err) => {
    console.error("❌ 데이터베이스 연결/초기화 실패:", err);
    console.error("TURSO_DATABASE_URL / TURSO_AUTH_TOKEN 환경변수를 확인해주세요.");
  });