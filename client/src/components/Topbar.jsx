export default function Topbar() {
  return (
    <header className="topbar">
      <div>
        <h2>안녕하세요 👋</h2>
        <p>오늘도 다락방에서 집중해볼까요?</p>
      </div>

      <div className="topRight">
        <input
          className="search"
          placeholder="검색"
        />

        <button className="iconBtn">🔔</button>

        <button className="iconBtn">🌙</button>

        <div className="profile">
          Y
        </div>

        <button className="studyBtn">
          공부 시작
        </button>
      </div>
    </header>
  );
}