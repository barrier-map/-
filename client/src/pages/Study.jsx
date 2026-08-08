import { useEffect, useRef, useState } from "react";

import Sidebar from "../components/Sidebar";
import PomodoroSettingsModal from "../components/PomodoroSettingsModal";
import { useAuth } from "../context/AuthContext";
import { useAlert } from "../context/AlertContext";
import { usePomodoro } from "../context/PomodoroContext";

import "../styles/Study.css";
import { API_BASE_URL } from "../config";

const API_URL = `${API_BASE_URL}/api/study`;

export default function Study() {
  const { user } = useAuth();
  const userId = user?.id;
  const { alert } = useAlert();

  // ==========================
  // 포모도로 타이머 (앱 전체에서 공유되는 타이머, 다른 페이지/캠스터디에서도 유지됨)
  // ==========================
  const {
    mode,
    timeLeft,
    running,
    cycleCount,
    setRunning,
    resetPomodoro,
    formatTime,
  } = usePomodoro();

  const [showSettings, setShowSettings] = useState(false);

  // ==========================
  // 공부메모 (자동저장)
  // ==========================
  const [memo, setMemo] = useState("");
  const [saveStatus, setSaveStatus] = useState(""); // "저장 중..." / "저장됨"
  const memoTimer = useRef(null);

  // 메모 불러오기
  useEffect(() => {
    if (!userId) return;

    fetch(`${API_URL}/memo/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setMemo(data.content || "");
        }
      })
      .catch((err) => console.error(err));
  }, [userId]);

  // 메모 자동저장 (입력 멈추고 1초 후 저장)
  const handleMemoChange = (e) => {
    const value = e.target.value;
    setMemo(value);
    setSaveStatus("저장 중...");

    if (memoTimer.current) clearTimeout(memoTimer.current);

    memoTimer.current = setTimeout(() => {
      if (!userId) return;

      fetch(`${API_URL}/memo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, content: value }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setSaveStatus(
              "저장됨 · " +
                new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
            );
          }
        })
        .catch((err) => console.error(err));
    }, 1000);
  };

  // ==========================
  // 목표 체크리스트
  // ==========================
  const [goals, setGoals] = useState([]);
  const [newGoal, setNewGoal] = useState("");

  const loadGoals = () => {
    if (!userId) return;

    fetch(`${API_URL}/goals/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setGoals(data.goals);
        }
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadGoals();
  }, [userId]);

  const addGoal = () => {
    if (!newGoal.trim()) return;
    if (!userId) return;

    fetch(`${API_URL}/goals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, content: newGoal }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setGoals((prev) => [data.goal, ...prev]);
          setNewGoal("");
        } else {
          alert(data.message);
        }
      })
      .catch((err) => console.error(err));
  };

  const toggleGoal = (goal) => {
    const nextDone = goal.done ? 0 : 1;

    fetch(`${API_URL}/goals/${goal.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: nextDone }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setGoals((prev) =>
            prev.map((g) =>
              g.id === goal.id ? { ...g, done: nextDone } : g
            )
          );
        }
      })
      .catch((err) => console.error(err));
  };

  const deleteGoal = (id) => {
    fetch(`${API_URL}/goals/${id}`, { method: "DELETE" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setGoals((prev) => prev.filter((g) => g.id !== id));
        }
      })
      .catch((err) => console.error(err));
  };

  return (
    <>
      <Sidebar />

      <div className="study-page">
        <div className="study-header">
          <h1>📚 공부</h1>
          <p>포모도로로 집중하고, 메모와 목표를 관리해보세요.</p>
        </div>

        <div className="study-grid">
          {/* 포모도로 */}
          <div className="study-box pomodoro-box">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2>⏱ 포모도로</h2>

              <button
                onClick={() => setShowSettings(true)}
                style={{
                  border: "none",
                  background: "#f0f0f5",
                  borderRadius: 8,
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                ⚙️ 설정
              </button>
            </div>

            <div className={`pomodoro-mode ${mode}`}>
              {mode === "work" ? "🧠 공부 시간" : "☕ 휴식 시간"}
            </div>

            <div className="pomodoro-time">{formatTime(timeLeft)}</div>

            <div className="pomodoro-buttons">
              {!running ? (
                <button onClick={() => setRunning(true)}>▶ 시작</button>
              ) : (
                <button onClick={() => setRunning(false)}>⏸ 일시정지</button>
              )}

              <button className="secondary" onClick={resetPomodoro}>
                ⏹ 초기화
              </button>
            </div>

            <div className="pomodoro-count">
              오늘 완료한 포모도로 : {cycleCount}회
            </div>

            <p style={{ fontSize: 12, color: "#999", marginTop: 8 }}>
              💡 이 타이머는 캠스터디 방에 들어가도 계속 돌아가요.
            </p>
          </div>

          {/* 공부메모 */}
          <div className="study-box memo-box">
            <h2>📝 공부메모</h2>

            <textarea
              placeholder="오늘 공부할 내용, 배운 것들을 자유롭게 적어보세요. 자동으로 저장됩니다."
              value={memo}
              onChange={handleMemoChange}
            />

            <div className="memo-status">{saveStatus}</div>
          </div>

          {/* 목표 체크리스트 */}
          <div className="study-box goal-box">
            <h2>🎯 목표 체크리스트</h2>

            <div className="goal-input-row">
              <input
                type="text"
                placeholder="오늘의 목표를 입력하세요"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addGoal();
                }}
              />

              <button onClick={addGoal}>➕ 추가</button>
            </div>

            <div className="goal-list">
              {goals.length === 0 ? (
                <p className="goal-empty">아직 등록된 목표가 없습니다.</p>
              ) : (
                goals.map((goal) => (
                  <div
                    className={`goal-item ${goal.done ? "done" : ""}`}
                    key={goal.id}
                  >
                    <input
                      type="checkbox"
                      checked={!!goal.done}
                      onChange={() => toggleGoal(goal)}
                    />

                    <span>{goal.content}</span>

                    <button onClick={() => deleteGoal(goal.id)}>삭제</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {showSettings && (
        <PomodoroSettingsModal onClose={() => setShowSettings(false)} />
      )}
    </>
  );
}
