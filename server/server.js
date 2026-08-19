const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const db = require("./database/database");

const authRouter = require("./routes/auth");
const roomRouter = require("./routes/room");
const studyRouter = require("./routes/study");
const calendarRouter = require("./routes/calendar");
const statsRouter = require("./routes/stats");

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
app.use("/api/calendar", calendarRouter);
app.use("/api/stats", statsRouter);

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

  // 출석 기록 (캠스터디 방에 접속한 날짜, 하루 1줄)
  // seconds 칸에 그날 방에 머문 시간이 초 단위로 계속 더해짐
  await db.execute(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      seconds INTEGER DEFAULT 0,
      UNIQUE(user_id, date)
    )
  `);

  // 이미 attendance 표를 쓰고 있던 경우엔 seconds 칸만 새로 붙여줌
  // (이미 있으면 오류가 나는데, 그건 정상이라 무시함)
  try {
    await db.execute(`ALTER TABLE attendance ADD COLUMN seconds INTEGER DEFAULT 0`);
    console.log("✅ attendance 표에 seconds 칸을 추가했습니다.");
  } catch (err) {
    // 이미 있으면 여기로 옴 → 그냥 넘어감
  }

  // 하루 목표 공부량 (분 단위), 사용자당 1줄
  await db.execute(`
    CREATE TABLE IF NOT EXISTS study_targets (
      user_id INTEGER PRIMARY KEY,
      daily_minutes INTEGER DEFAULT 120,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 사용자가 비밀번호를 입력해 들어간(또는 입장한) 방 기록 ("내 방" 탭용)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS room_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      room_id INTEGER NOT NULL,
      visited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, room_id)
    )
  `);

  // 달력 디데이 이벤트 (시험 일정 등)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 캠스터디 채팅 기록 보관
  await db.execute(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

}

// 한국 시간(KST) 기준으로 오늘 날짜를 'YYYY-MM-DD' 형태로 반환
function getTodayKST() {
  const now = new Date();

  const kstString = now.toLocaleDateString("sv-SE", {
    timeZone: "Asia/Seoul",
  });

  return kstString; // 'sv-SE' 로케일은 YYYY-MM-DD 형식을 그대로 줌
}

// 캠스터디 방 접속 시 출석 기록 (하루에 한 번만 기록되도록 UNIQUE 제약 활용)
async function markAttendance(userId) {
  if (!userId) return;

  try {
    await db.execute({
      sql: "INSERT OR IGNORE INTO attendance (user_id, date, seconds) VALUES (?, ?, 0)",
      args: [userId, getTodayKST()],
    });
  } catch (err) {
    console.error("출석 기록 실패:", err);
  }
}

// 방에 머문 시간을 오늘 출석 기록에 더함
async function addStudySeconds(userId, seconds) {
  if (!userId || !seconds || seconds <= 0) return;

  try {
    await db.execute({
      sql: `
        INSERT INTO attendance (user_id, date, seconds)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, date)
        DO UPDATE SET seconds = seconds + excluded.seconds
      `,
      args: [userId, getTodayKST(), seconds],
    });
  } catch (err) {
    console.error("공부시간 기록 실패:", err);
  }
}

// 마지막으로 기록한 시점부터 지금까지의 시간을 계산해서 저장
// (1분마다 한 번씩 + 방을 나갈 때 한 번 더 호출됨)
function flushStudyTime(socket) {
  if (!socket.userId || !socket.lastFlush) return;

  const now = Date.now();
  const seconds = Math.floor((now - socket.lastFlush) / 1000);

  socket.lastFlush = now;

  if (seconds > 0) {
    addStudySeconds(socket.userId, seconds);
  }
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

  socket.on("join-room", ({ roomId, username, userId }) => {

    const finalUsername = username || "익명";

    // ==========================
    // 닉네임 중복 방지
    // 같은 방 안에 이미 똑같은 닉네임을 쓰는 "다른" 사람이 있으면 입장을 막음
    // (같은 계정이 새로고침 등으로 다시 들어오는 경우는 예외로 허용)
    // ==========================
    const existingUsers = rooms[roomId] || [];
    const nameTaken = existingUsers.some(
      (p) => p.username === finalUsername && p.userId !== userId
    );

    if (nameTaken) {
      socket.emit("join-rejected", { reason: "duplicate-username" });
      return;
    }

    socket.roomId = roomId;
    socket.username = finalUsername;
    socket.userId = userId;

    // 출석 기록 (하루 1번만 기록됨, 실패해도 방 입장에는 영향 없음)
    markAttendance(userId);

    // ==========================
    // 공부시간 측정 시작
    // 1분마다 조금씩 저장해두기 때문에, 브라우저가 갑자기 꺼져도
    // 최대 1분치만 손해보고 나머지는 남습니다.
    // ==========================
    socket.joinedAt = Date.now();
    socket.lastFlush = Date.now();

    if (socket.flushTimer) clearInterval(socket.flushTimer);
    socket.flushTimer = setInterval(() => flushStudyTime(socket), 60 * 1000);

    // 화면에 "접속한 지 몇 분 지났는지" 표시할 수 있도록 시작 시각을 알려줌
    socket.emit("study-started", { startedAt: socket.joinedAt });

    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    // ==========================
    // WebRTC - 기존 참가자 목록(닉네임 포함)을 새로 들어온 사람에게만 전송
    // (반드시 push 하기 전에 보내야 "나 자신"이 목록에 안 들어감)
    // ==========================
    socket.emit("existing-users", rooms[roomId]);

    if (!rooms[roomId].some((p) => p.id === socket.id)) {
      rooms[roomId].push({ id: socket.id, username: socket.username, userId });
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
      userId,
    });

  });

  // 방장이 다른 참가자를 내보냄
  socket.on("kick-user", async ({ roomId, targetSocketId }) => {
    try {
      const result = await db.execute({
        sql: "SELECT owner_id FROM rooms WHERE id = ?",
        args: [roomId],
      });

      const room = result.rows[0];

      // 요청한 사람이 방장이 아니면 무시
      if (!room || Number(room.owner_id) !== Number(socket.userId)) {
        return;
      }

      const targetSocket = io.sockets.sockets.get(targetSocketId);

      // 내보내지는 사람의 공부시간도 마무리 저장
      if (targetSocket) {
        flushStudyTime(targetSocket);
        if (targetSocket.flushTimer) {
          clearInterval(targetSocket.flushTimer);
          targetSocket.flushTimer = null;
        }
      }

      io.to(targetSocketId).emit("kicked");

      if (targetSocket) {
        targetSocket.leave(roomId);
      }

      if (rooms[roomId]) {
        rooms[roomId] = rooms[roomId].filter((p) => p.id !== targetSocketId);
        io.to(roomId).emit("user-count", rooms[roomId].length);
      }

      socket.to(roomId).emit("user-left", { socketId: targetSocketId });
    } catch (err) {
      console.error("강퇴 처리 실패:", err);
    }
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

  socket.on("send-message", async (data) => {

    io.to(data.roomId).emit("receive-message", data);

    try {
      await db.execute({
        sql: "INSERT INTO chat_messages (room_id, username, message) VALUES (?, ?, ?)",
        args: [data.roomId, data.user, data.message],
      });
    } catch (err) {
      console.error("채팅 기록 저장 실패:", err);
    }

  });

  socket.on("disconnect", () => {

    console.log("퇴장 :", socket.id);

    // ==========================
    // 공부시간 마무리 저장
    // ==========================
    flushStudyTime(socket);

    if (socket.flushTimer) {
      clearInterval(socket.flushTimer);
      socket.flushTimer = null;
    }

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
      console.log("⏱  공부시간 측정 ON (1분마다 저장)");
      console.log("=======================================");

    });
  })
  .catch((err) => {
    console.error("❌ 데이터베이스 연결/초기화 실패:", err);
    console.error("TURSO_DATABASE_URL / TURSO_AUTH_TOKEN 환경변수를 확인해주세요.");
  });
