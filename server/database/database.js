// 로컬 컴퓨터에서 실행할 때 .env 파일의 값을 읽어옴
// (Render 같은 배포 사이트에서는 이 줄이 있어도 무시되고,
//  배포 사이트에 직접 등록한 환경변수를 사용함)
require("dotenv").config();

const { createClient } = require("@libsql/client");

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

console.log("✅ Turso(SQLite) 데이터베이스 연결 완료");

module.exports = client;
