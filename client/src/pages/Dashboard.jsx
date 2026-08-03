import { useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import StudyTimer from "../components/StudyTimer";

import "../styles/Dashboard.css";

export default function Dashboard() {

  const navigate = useNavigate();

  return (
    <>
      <Sidebar />

      <div className="dashboard">

        <h1 className="title">
          안녕하세요 👋
        </h1>

        <p className="subtitle">
          오늘도 다락방에서 함께 공부해요.
        </p>

        <button
          onClick={() => navigate("/studyroom")}
          style={{
            padding: "14px 24px",
            background: "#6d5dfc",
            color: "white",
            border: "none",
            borderRadius: "12px",
            cursor: "pointer",
            marginBottom: "30px",
            fontSize: "15px",
            fontWeight: "600",
          }}
        >
          📹 캠스터디 입장
        </button>

        <div className="cards">

          <div className="card">
            <h3>📹 캠스터디</h3>

            <p style={{ marginTop: "15px", color: "#666" }}>
              친구들과 함께 공부해보세요.
            </p>

            <button
              onClick={() => navigate("/studyroom")}
              style={{
                marginTop: "20px",
                width: "100%",
                padding: "12px",
                border: "none",
                borderRadius: "10px",
                background: "#6d5dfc",
                color: "white",
                cursor: "pointer",
              }}
            >
              입장하기
            </button>
          </div>

          <div className="card">
            <h3>📅 출석</h3>

            <div className="value">
              0일
            </div>

            <p style={{ marginTop: "10px", color: "#666" }}>
              캠스터디 입장 시 자동으로 출석됩니다.
            </p>
          </div>

          <div className="card">
            <h3>🎯 목표 달성률</h3>

            <div className="value">
              0%
            </div>

            <p style={{ marginTop: "10px", color: "#666" }}>
              오늘 목표를 완료해보세요.
            </p>
          </div>

        </div>

        <div className="bottom">

          <div className="box">

            <h2>🎯 오늘 목표</h2>

            <br />

            <label>
              <input type="checkbox" /> 한국사
            </label>

            <br /><br />

            <label>
              <input type="checkbox" /> 영어
            </label>

            <br /><br />

            <label>
              <input type="checkbox" /> 수학
            </label>

          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >

            <StudyTimer />

            <div className="box">

              <h2>📝 오늘의 메모</h2>

              <br />

              <textarea
                placeholder="오늘 공부한 내용을 기록해보세요."
                style={{
                  width: "100%",
                  height: "220px",
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                  padding: "15px",
                  resize: "none",
                  fontSize: "15px",
                  outline: "none",
                }}
              />

            </div>

          </div>

        </div>

      </div>
    </>
  );
}