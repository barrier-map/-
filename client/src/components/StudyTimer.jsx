import { useEffect, useState } from "react";

export default function StudyTimer() {

  const [seconds, setSeconds] = useState(() => {
    return Number(localStorage.getItem("studyTime")) || 0;
  });

  const [running, setRunning] = useState(() => {
    return localStorage.getItem("timerRunning") === "true";
  });

  useEffect(() => {
    let timer;

    if (running) {
      timer = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    localStorage.setItem("studyTime", seconds);
  }, [seconds]);

  useEffect(() => {
    localStorage.setItem("timerRunning", running);
  }, [running]);

  const formatTime = () => {

    const h = String(Math.floor(seconds / 3600)).padStart(2, "0");

    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");

    const s = String(seconds % 60).padStart(2, "0");

    return `${h}:${m}:${s}`;
  };

  return (
    <div className="box">

      <h2>⏱ 공부 타이머</h2>

      <div
        style={{
          fontSize: "48px",
          fontWeight: "bold",
          marginTop: "25px",
          color: "#6d5dfc"
        }}
      >
        {formatTime()}
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginTop: "30px"
        }}
      >
        <button onClick={() => setRunning(true)}>
          ▶ 시작
        </button>

        <button onClick={() => setRunning(false)}>
          ⏸ 일시정지
        </button>

        <button
          onClick={() => {

            setRunning(false);

            setSeconds(0);

            localStorage.removeItem("studyTime");

          }}
        >
          ⏹ 종료
        </button>

      </div>

    </div>
  );

}