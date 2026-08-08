import { useState } from "react";
import { usePomodoro } from "../context/PomodoroContext";

export default function PomodoroSettingsModal({ onClose }) {
  const { workMinutes, breakMinutes, applySettings } = usePomodoro();

  const [work, setWork] = useState(workMinutes);
  const [brk, setBrk] = useState(breakMinutes);

  const save = () => {
    applySettings(Number(work), Number(brk));
    onClose();
  };

  return (
    <div className="modal-bg">
      <div className="modal" style={{ width: 360 }}>
        <h2 style={{ marginTop: 0 }}>⚙️ 포모도로 시간 설정</h2>

        <div style={{ marginBottom: 15 }}>
          <label
            style={{
              display: "block",
              marginBottom: 6,
              fontSize: 14,
              color: "#555",
            }}
          >
            공부 시간 (분)
          </label>
          <input
            type="number"
            min="1"
            max="120"
            value={work}
            onChange={(e) => setWork(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ddd",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: "block",
              marginBottom: 6,
              fontSize: 14,
              color: "#555",
            }}
          >
            휴식 시간 (분)
          </label>
          <input
            type="number"
            min="1"
            max="60"
            value={brk}
            onChange={(e) => setBrk(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ddd",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div className="modal-buttons">
          <button className="cancel-btn" onClick={onClose}>
            취소
          </button>
          <button className="confirm-btn" onClick={save}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
