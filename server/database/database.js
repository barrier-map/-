const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "darakbang.db");

const db = new Database(dbPath);

console.log("✅ SQLite 연결 완료");

module.exports = db;
