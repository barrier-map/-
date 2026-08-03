const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "darakbang.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("DB 연결 실패", err);
  } else {
    console.log("✅ SQLite 연결 완료");
  }
});

module.exports = db;