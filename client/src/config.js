// 서버 주소를 한 곳에서 관리하는 파일
// 배포할 때는 .env 파일에 VITE_API_URL을 설정하면 그 주소를 사용하고,
// 없으면 개발용 주소(localhost:5000)를 사용합니다.
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";
