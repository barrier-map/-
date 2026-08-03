export default function Home() {
  return (
    <div>
      <h1>홈</h1>
      <p>다락방 메인 대시보드입니다.</p>
    </div>
  );
}import Layout from "../components/Layout";

export default function Home() {
  return (
    <Layout>

      <div className="cards">

        <div className="card">
          <h3>📚 오늘 공부</h3>
          <h2>0시간 00분</h2>
        </div>

        <div className="card">
          <h3>🔥 연속 공부</h3>
          <h2>0일</h2>
        </div>

        <div className="card">
          <h3>🎯 오늘 목표</h3>
          <h2>0%</h2>
        </div>

        <div className="card">
          <h3>📈 이번 주</h3>
          <h2>0시간</h2>
        </div>

      </div>

      <div className="recent">

        <h2>최근 공부</h2>

        <div className="recentCard">

          아직 공부 기록이 없습니다.

        </div>

      </div>

    </Layout>
  );
}