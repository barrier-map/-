import { useEffect, useMemo, useState } from "react";

import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { useAlert } from "../context/AlertContext";
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

// 초 → "2시간 30분" 같은 읽기 편한 글자로
function formatDuration(seconds) {
  const totalMinutes = Math.floor((seconds || 0) / 60);

  if (totalMinutes < 1) return "0분";
  if (totalMinutes < 60) return `${totalMinutes}분`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes === 0 ? `${hours}시간` : `${hours}시간 ${minutes}분`;
}

// 달력 칸처럼 좁은 곳에 쓸 짧은 표기
function formatShort(seconds) {
  const totalMinutes = Math.floor((seconds || 0) / 60);

  if (totalMinutes < 1) return "";
  if (totalMinutes < 60) return `${totalMinutes}분`;

  return `${(totalMinutes / 60).toFixed(1)}시간`;
}

export default function Statistics() {
  const { user } = useAuth();
  const { alert } = useAlert();
  const userId = user?.id;

  const [tab, setTab] = useState("daily"); // daily | weekly | monthly
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    records: [],
    dates: [],
    streak: 0,
    totalDays: 0,
    totalSeconds: 0,
    todaySeconds: 0,
    targetMinutes: 120,
  });

  // 목표 공부량 수정 중인지
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(120);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0~11

  // ================= 통계 불러오기 =================
  const loadStats = () => {
    if (!userId) return;

    fetch(`${API_BASE_URL}/api/stats/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data);
          setTargetInput(data.targetMinutes);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // 날짜 → 공부한 초 를 빠르게 찾기 위한 표
  const secondsByDate = useMemo(() => {
    const map = new Map();
    stats.records.forEach((r) => map.set(r.date, r.seconds));
    return map;
  }, [stats.records]);

  const dateSet = useMemo(() => new Set(stats.dates), [stats.dates]);

  // ================= 목표 공부량 저장 =================
  const saveTarget = async () => {
    const minutes = Number(targetInput);

    if (!minutes || minutes < 10) {
      await alert("목표는 10분 이상으로 정해주세요.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/stats/target`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, minutes }),
      });

      const data = await response.json();

      if (data.success) {
        setStats((prev) => ({ ...prev, targetMinutes: data.targetMinutes }));
        setTargetInput(data.targetMinutes);
        setEditingTarget(false);
      } else {
        await alert(data.message || "목표 저장에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      await alert("서버 연결에 실패했습니다.");
    }
  };

  // ================= 오늘 목표 달성률 =================
  const targetSeconds = stats.targetMinutes * 60;
  const todayPercent = Math.min(
    100,
    Math.round((stats.todaySeconds / Math.max(1, targetSeconds)) * 100)
  );

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
      const seconds = secondsByDate.get(dateStr) || 0;

      cells.push({
        day,
        dateStr,
        seconds,
        attended: dateSet.has(dateStr),
        goalMet: seconds >= targetSeconds && targetSeconds > 0,
        isToday: dateStr === toDateString(today),
      });
    }

    return cells;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewYear, viewMonth, dateSet, secondsByDate, targetSeconds]);

  const monthAttendedCount = calendarCells.filter((c) => c && c.attended).length;
  const monthSeconds = calendarCells.reduce(
    (sum, c) => sum + (c ? c.seconds : 0),
    0
  );

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

      let days = 0;
      let seconds = 0;

      for (let d = 0; d < 7; d++) {
        const day = new Date(monday);
        day.setDate(day.getDate() + d);

        const dateStr = toDateString(day);

        if (dateSet.has(dateStr)) days++;
        seconds += secondsByDate.get(dateStr) || 0;
      }

      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);

      weeks.push({
        label: `${pad(monday.getMonth() + 1)}.${pad(monday.getDate())} ~ ${pad(
          sunday.getMonth() + 1
        )}.${pad(sunday.getDate())}`,
        days,
        seconds,
        isThisWeek: i === 0,
      });
    }

    return weeks;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateSet, secondsByDate]);

  // ================= 월별 (최근 6개월) =================
  const monthlyStats = useMemo(() => {
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const prefix = `${year}-${pad(month + 1)}`;

      const matched = stats.records.filter((r) => r.date.startsWith(prefix));

      months.push({
        label: `${year}년 ${month + 1}월`,
        days: matched.length,
        seconds: matched.reduce((sum, r) => sum + r.seconds, 0),
        isThisMonth: i === 0,
      });
    }

    return months;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.records]);

  const maxWeeklySeconds = Math.max(1, ...weeklyStats.map((w) => w.seconds));
  const maxMonthlySeconds = Math.max(1, ...monthlyStats.map((m) => m.seconds));

  return (
    <>
      <Sidebar />

      <div className="statistics-page">
        <h1>📊 통계</h1>
        <p className="statistics-sub">
          캠스터디 방에 머문 시간이 공부시간으로 기록돼요.
        </p>

        {/* ===== 요약 카드 3개 ===== */}
        <div className="summary-row">
          <div className="summary-card">
            <span className="summary-icon">🔥</span>
            <div>
              <p className="summary-label">연속 출석</p>
              <p className="summary-value">{stats.streak}일</p>
            </div>
          </div>

          <div className="summary-card">
            <span className="summary-icon">📅</span>
            <div>
              <p className="summary-label">총 출석</p>
              <p className="summary-value">{stats.totalDays}일</p>
            </div>
          </div>

          <div className="summary-card">
            <span className="summary-icon">⏱</span>
            <div>
              <p className="summary-label">총 공부시간</p>
              <p className="summary-value">
                {formatDuration(stats.totalSeconds)}
              </p>
            </div>
          </div>
        </div>

        {/* ===== 오늘 목표 ===== */}
        <div className="today-card">
          <div className="today-head">
            <div>
              <p className="today-label">오늘 공부시간</p>
              <p className="today-value">
                {formatDuration(stats.todaySeconds)}
                <span className="today-target">
                  {" / 목표 "}
                  {formatDuration(targetSeconds)}
                </span>
              </p>
            </div>

            {!editingTarget ? (
              <button
                className="target-edit-btn"
                onClick={() => setEditingTarget(true)}
              >
                🎯 목표 수정
              </button>
            ) : (
              <div className="target-edit-box">
                <input
                  type="number"
                  min={10}
                  max={1440}
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveTarget();
                  }}
                />
                <span className="target-unit">분</span>

                <button className="target-save-btn" onClick={saveTarget}>
                  저장
                </button>
                <button
                  className="target-cancel-btn"
                  onClick={() => {
                    setEditingTarget(false);
                    setTargetInput(stats.targetMinutes);
                  }}
                >
                  취소
                </button>
              </div>
            )}
          </div>

          <div className="today-track">
            <div
              className={"today-fill" + (todayPercent >= 100 ? " done" : "")}
              style={{ width: `${todayPercent}%` }}
            />
          </div>

          <p className="today-percent">
            {todayPercent >= 100
              ? "🎉 오늘 목표를 달성했어요!"
              : `달성률 ${todayPercent}%`}
          </p>
        </div>

        {/* ===== 탭 ===== */}
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

        {loading ? (
          <div className="stat-card">
            <p style={{ textAlign: "center", color: "#999" }}>
              불러오는 중...
            </p>
          </div>
        ) : (
          <>
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
                  출석 <strong>{monthAttendedCount}</strong>일 · 공부{" "}
                  <strong>{formatDuration(monthSeconds)}</strong>
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
                          (cell.goalMet ? " goal-met" : "") +
                          (cell.isToday ? " today" : "")
                        }
                      >
                        <span className="day-number">{cell.day}</span>
                        {cell.seconds > 0 && (
                          <span className="day-time">
                            {formatShort(cell.seconds)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div key={`blank-${idx}`} className="day-cell empty" />
                    )
                  )}
                </div>

                <p className="calendar-legend">
                  <span className="legend-chip attended" /> 출석
                  <span className="legend-chip goal-met" /> 목표 달성
                </p>
              </div>
            )}

            {tab === "weekly" && (
              <div className="stat-card">
                <h2>최근 8주 공부시간</h2>

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
                            width: `${(w.seconds / maxWeeklySeconds) * 100}%`,
                          }}
                        />
                      </div>

                      <span className="bar-count">
                        {formatDuration(w.seconds)}
                        <em>{w.days}일</em>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "monthly" && (
              <div className="stat-card">
                <h2>최근 6개월 공부시간</h2>

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
                            width: `${(m.seconds / maxMonthlySeconds) * 100}%`,
                          }}
                        />
                      </div>

                      <span className="bar-count">
                        {formatDuration(m.seconds)}
                        <em>{m.days}일</em>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
