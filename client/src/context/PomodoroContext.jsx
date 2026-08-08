import { createContext, useContext, useEffect, useState } from "react";
import { useAlert } from "./AlertContext";

const PomodoroContext = createContext(null);

const DEFAULT_WORK_MIN = 25;
const DEFAULT_BREAK_MIN = 5;

// 페이지를 이동해도(캠스터디 방에 있어도) 타이머가 계속 돌아가도록
// 앱 전체에서 공유하는 포모도로 상태
export function PomodoroProvider({ children }) {
  const { alert } = useAlert();

  const [workMinutes, setWorkMinutes] = useState(DEFAULT_WORK_MIN);
  const [breakMinutes, setBreakMinutes] = useState(DEFAULT_BREAK_MIN);

  const [mode, setMode] = useState("work"); // "work" | "break"
  const [timeLeft, setTimeLeft] = useState(DEFAULT_WORK_MIN * 60);
  const [running, setRunning] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);

  useEffect(() => {
    if (!running) return;

    if (timeLeft <= 0) {
      if (mode === "work") {
        setCycleCount((prev) => prev + 1);
        setMode("break");
        setTimeLeft(breakMinutes * 60);
        alert(`🎉 ${workMinutes}분 공부 완료! ${breakMinutes}분 쉬어가세요.`);
      } else {
        setMode("work");
        setTimeLeft(workMinutes * 60);
        alert("⏰ 휴식 끝! 다시 공부를 시작해볼까요?");
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [running, timeLeft, mode, workMinutes, breakMinutes]);

  const formatTime = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const resetPomodoro = () => {
    setRunning(false);
    setMode("work");
    setTimeLeft(workMinutes * 60);
  };

  // 설정 팝업에서 저장할 때 호출 (공부/휴식 시간 새로 반영 + 처음부터 다시 시작)
  const applySettings = (newWorkMinutes, newBreakMinutes) => {
    const w = Math.min(120, Math.max(1, newWorkMinutes || DEFAULT_WORK_MIN));
    const b = Math.min(60, Math.max(1, newBreakMinutes || DEFAULT_BREAK_MIN));

    setWorkMinutes(w);
    setBreakMinutes(b);
    setRunning(false);
    setMode("work");
    setTimeLeft(w * 60);
  };

  return (
    <PomodoroContext.Provider
      value={{
        mode,
        timeLeft,
        running,
        cycleCount,
        workMinutes,
        breakMinutes,
        setRunning,
        resetPomodoro,
        applySettings,
        formatTime,
      }}
    >
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro() {
  const ctx = useContext(PomodoroContext);

  if (!ctx) {
    throw new Error("usePomodoro()는 PomodoroProvider 안에서만 사용할 수 있습니다.");
  }

  return ctx;
}
