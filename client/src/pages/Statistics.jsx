import { useEffect, useMemo, useState } from "react";

import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config";
import "../styles/Statistics.css";

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function pad(n) {
  return String(n).padStart(2, "0");
}

// Date 객체를 'YYYY-MM-DD' 문자열로
function toDateString(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 그 주의 월요일을 구함
function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0=일 ~ 6=토
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function Statistics() {
  const { user } = useAuth();
  const userId = user?.id;

  const [tab, setTab] = useState("daily"); // daily | weekly | monthly
  const [dates, setDates] = useState([]); // ["2026-08-01", ...]

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0~11

  useEffect(() => {
    if (!userId) return;

    fetch(`${API_BASE_URL}/api/study/attendance/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setDates(data.dates);
      })
      .catch((err) => console.error(err));
  }, [userId]);

  const dateSet = useMemo(() => new Set(dates), [dates]);

  // ================= 일별 (달력) =================
  const calendarCells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    // 월요일 시작 기준 앞쪽 빈 칸 개수
    const firstWeekday = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const cells = [];

    for (let i = 0; i < firstWeekday; i++) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
      cells.push({
        day,
        dateStr,
        attended: dateSet.has(dateStr),
        isToday: dateStr === toDateString(today),
      });
    }

    return cells;
  }, [viewYear, viewMonth, dateSet]);

  const monthAttendedCount = calendarCells.filter(
    (c) => c && c.attended
  ).length;

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // ================= 주별 (최근 8주) =================
  const weeklyStats = useMemo(() => {
    const thisMonday = getMonday(today);
    const weeks = [];

    for (let i = 7; i >= 0; i--) {
      const monday = new Date(thisMonday);
      monday.setDate(monday.getDate() - i * 7);

      let count = 0;
      for (let d = 0; d < 7; d++) {
        const day = new Date(monday);
        day.setDate(day.getDate() + d);
        if (dateSet.has(toDateString(day))) count++;
      }

      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);

      weeks.push({
        label: `${pad(monday.getMonth() + 1)}.${pad(monday.getDate())} ~ ${pad(
          sunday.getMonth() + 1
        )}.${pad(sunday.getDate())}`,
        count,
        isThisWeek: i === 0,
      });
    }

    return weeks;
  }, [dateSet]);

  // ================= 월별 (최근 6개월) =================
  const monthlyStats = useMemo(() => {
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const prefix = `${year}-${pad(month + 1)}`;

      const count = dates.filter((dateStr) => dateStr.startsWith(prefix))
        .length;

      months.push({
        label: `${year}년 ${month + 1}월`,
        count,
        isThisMonth: i === 0,
      });
    }

    return months;
  }, [dates]);

  const maxWeeklyCount = Math.max(1, ...weeklyStats.map((w) => w.count));
  const maxMonthlyCount = Math.max(1, ...monthlyStats.map((m) => m.count));

  return (
    <>
      <Sidebar />

      <div className="statistics-page">
        <h1>📊 통계</h1>
        <p className="statistics-sub">
          캠스터디 방에 접속한 날이 출석으로 기록돼요.
        </p>

        <div className="stat-tabs">
          <button
            className={tab === "daily" ? "active" : ""}
            onClick={() => setTab("daily")}
          >
            일별
          </button>
          <button
            className={tab === "weekly" ? "active" : ""}
            onClick={() => setTab("weekly")}
          >
            주별
          </button>
          <button
            className={tab === "monthly" ? "active" : ""}
            onClick={() => setTab("monthly")}
          >
            월별
          </button>
        </div>

        {tab === "daily" && (
          <div className="stat-card">
            <div className="calendar-header">
              <button onClick={goPrevMonth}>‹</button>
              <h2>
                {viewYear}년 {viewMonth + 1}월
              </h2>
              <button onClick={goNextMonth}>›</button>
            </div>

            <p className="month-summary">
              이번 달 출석 <strong>{monthAttendedCount}</strong>일
            </p>

            <div className="calendar-grid weekday-row">
              {WEEKDAY_LABELS.map((w) => (
                <div key={w} className="weekday-label">
                  {w}
                </div>
              ))}
            </div>

            <div className="calendar-grid">
              {calendarCells.map((cell, idx) =>
                cell ? (
                  <div
                    key={cell.dateStr}
                    className={
                      "day-cell" +
                      (cell.attended ? " attended" : "") +
                      (cell.isToday ? " today" : "")
                    }
                  >
                    <span>{cell.day}</span>
                    {cell.attended && <div className="dot" />}
                  </div>
                ) : (
                  <div key={`blank-${idx}`} className="day-cell empty" />
                )
              )}
            </div>
          </div>
        )}

        {tab === "weekly" && (
          <div className="stat-card">
            <h2>최근 8주 출석일수</h2>

            <div className="bar-list">
              {weeklyStats.map((w) => (
                <div className="bar-row" key={w.label}>
                  <span className="bar-label">
                    {w.label} {w.isThisWeek && "(이번 주)"}
                  </span>

                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${(w.count / maxWeeklyCount) * 100}%`,
                      }}
                    />
                  </div>

                  <span className="bar-count">{w.count}일</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "monthly" && (
          <div className="stat-card">
            <h2>최근 6개월 출석일수</h2>

            <div className="bar-list">
              {monthlyStats.map((m) => (
                <div className="bar-row" key={m.label}>
                  <span className="bar-label">
                    {m.label} {m.isThisMonth && "(이번 달)"}
                  </span>

                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${(m.count / maxMonthlyCount) * 100}%`,
                      }}
                    />
                  </div>

                  <span className="bar-count">{m.count}일</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
