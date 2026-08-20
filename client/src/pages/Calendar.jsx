import { useEffect, useMemo, useState } from "react";

import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { useAlert } from "../context/AlertContext";
import { API_BASE_URL } from "../config";
import "../styles/Calendar.css";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// 일정 색상으로 고를 수 있는 목록 (서버 쪽 목록과 똑같이 맞춰둠)
const COLOR_PALETTE = [
  "#4f46e5",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#ec4899",
];

function pad(n) {
  return String(n).padStart(2, "0");
}

function toDateString(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayString() {
  return toDateString(new Date());
}

// 오늘부터 그 날짜까지 며칠 남았는지 계산 (D-day)
function getDday(dateStr) {
  const today = new Date(todayString() + "T00:00:00");
  const target = new Date(dateStr + "T00:00:00");
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "D-DAY";
  if (diffDays > 0) return `D-${diffDays}`;
  return `D+${Math.abs(diffDays)}`;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const { alert, confirm } = useAlert();

  const [events, setEvents] = useState([]);
  const [title, setTitle] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0~11
  const [selectedDate, setSelectedDate] = useState(todayString());

  const loadEvents = () => {
    if (!userId) return;

    fetch(`${API_BASE_URL}/api/calendar/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setEvents(data.events);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // 날짜별로 일정을 묶어둠 (달력 칸에 빠르게 꽂아 넣기 위해)
  const eventsByDate = useMemo(() => {
    const map = new Map();

    events.forEach((e) => {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date).push(e);
    });

    return map;
  }, [events]);

  // ================= 달력 칸 만들기 =================
  const calendarCells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    // 일요일 시작 기준 앞쪽 빈 칸
    const firstWeekday = firstDay.getDay();

    const cells = [];

    for (let i = 0; i < firstWeekday; i++) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
      const weekday = new Date(viewYear, viewMonth, day).getDay();

      cells.push({
        day,
        dateStr,
        weekday,
        events: eventsByDate.get(dateStr) || [],
        isToday: dateStr === todayString(),
      });
    }

    // 마지막 줄 빈 칸 채우기 (격자 모양이 흐트러지지 않게)
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [viewYear, viewMonth, eventsByDate]);

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

  const goToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(todayString());
  };

  // ================= 일정 추가 / 삭제 =================
  const addEvent = async () => {
    if (!title.trim()) {
      await alert("일정 이름을 입력해주세요.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/calendar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, title, date: selectedDate, color: selectedColor }),
      });

      const data = await response.json();

      if (data.success) {
        setTitle("");
        setSelectedColor(COLOR_PALETTE[0]);
        loadEvents();
      } else {
        await alert(data.message);
      }
    } catch (err) {
      console.error(err);
      await alert("서버 연결에 실패했습니다.");
    }
  };

  const deleteEvent = async (id) => {
    const ok = await confirm("이 일정을 삭제하시겠습니까?");
    if (!ok) return;

    await fetch(`${API_BASE_URL}/api/calendar/${id}`, { method: "DELETE" });
    loadEvents();
  };

  const selectedEvents = eventsByDate.get(selectedDate) || [];

  // 다가오는 일정 (가까운 순서로 최대 5개)
  const upcoming = events
    .filter((e) => e.date >= todayString())
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .slice(0, 5);

  // 선택한 날짜를 "8월 15일 (금)" 처럼 보기 좋게
  const selectedLabel = useMemo(() => {
    const d = new Date(selectedDate + "T00:00:00");
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${
      WEEKDAY_LABELS[d.getDay()]
    })`;
  }, [selectedDate]);

  return (
    <>
      <Sidebar />

      <div className="calendar-page">
        <h1>📅 달력</h1>
        <p className="calendar-sub">
          날짜를 눌러서 시험일, 발표일 같은 일정을 등록해보세요.
        </p>

        <div className="calendar-layout">
          {/* ================= 왼쪽 : 달력 ================= */}
          <div className="calendar-box">
            <div className="cal-header">
              <button className="cal-nav" onClick={goPrevMonth}>
                ‹
              </button>

              <h2>
                {viewYear}년 {viewMonth + 1}월
              </h2>

              <button className="cal-nav" onClick={goNextMonth}>
                ›
              </button>

              <button className="cal-today-btn" onClick={goToday}>
                오늘
              </button>
            </div>

            <div className="cal-grid cal-weekdays">
              {WEEKDAY_LABELS.map((w, i) => (
                <div
                  key={w}
                  className={
                    "cal-weekday" +
                    (i === 0 ? " sun" : "") +
                    (i === 6 ? " sat" : "")
                  }
                >
                  {w}
                </div>
              ))}
            </div>

            <div className="cal-grid">
              {calendarCells.map((cell, idx) =>
                cell ? (
                  <div
                    key={cell.dateStr}
                    className={
                      "cal-cell" +
                      (cell.isToday ? " today" : "") +
                      (cell.dateStr === selectedDate ? " selected" : "")
                    }
                    onClick={() => setSelectedDate(cell.dateStr)}
                  >
                    <span
                      className={
                        "cal-day" +
                        (cell.weekday === 0 ? " sun" : "") +
                        (cell.weekday === 6 ? " sat" : "")
                      }
                    >
                      {cell.day}
                    </span>

                    <div className="cal-events">
                      {cell.events.slice(0, 3).map((e) => (
                        <span
                          className="cal-chip"
                          key={e.id}
                          title={e.title}
                          style={{ backgroundColor: e.color, color: "#fff" }}
                        >
                          {e.title}
                        </span>
                      ))}

                      {cell.events.length > 3 && (
                        <span className="cal-more">
                          +{cell.events.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div key={`blank-${idx}`} className="cal-cell empty" />
                )
              )}
            </div>
          </div>

          {/* ================= 오른쪽 : 선택한 날 + 디데이 ================= */}
          <div className="calendar-side">
            <div className="side-box">
              <h3>{selectedLabel}</h3>

              {selectedEvents.length === 0 ? (
                <p className="side-empty">등록된 일정이 없어요.</p>
              ) : (
                <div className="side-event-list">
                  {selectedEvents.map((e) => (
                    <div className="side-event" key={e.id}>
                      <span
                        className="side-badge"
                        style={{ backgroundColor: e.color }}
                      >
                        {getDday(e.date)}
                      </span>
                      <span className="side-title">{e.title}</span>
                      <button onClick={() => deleteEvent(e.id)}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="side-add">
                <input
                  type="text"
                  placeholder="일정 이름 (예: 중간고사)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addEvent();
                  }}
                />

                <div className="color-picker">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={
                        "color-dot" + (selectedColor === c ? " selected" : "")
                      }
                      style={{ backgroundColor: c }}
                      onClick={() => setSelectedColor(c)}
                      aria-label={`색상 ${c} 선택`}
                    />
                  ))}
                </div>

                <button onClick={addEvent}>추가</button>
              </div>
            </div>

            <div className="side-box">
              <h3>다가오는 디데이</h3>

              {upcoming.length === 0 ? (
                <p className="side-empty">다가오는 일정이 없어요.</p>
              ) : (
                <div className="side-event-list">
                  {upcoming.map((e) => (
                    <div
                      className="side-event clickable"
                      key={e.id}
                      onClick={() => {
                        const d = new Date(e.date + "T00:00:00");
                        setViewYear(d.getFullYear());
                        setViewMonth(d.getMonth());
                        setSelectedDate(e.date);
                      }}
                    >
                      <span
                        className="side-badge"
                        style={{ backgroundColor: e.color }}
                      >
                        {getDday(e.date)}
                      </span>

                      <span className="side-title">
                        {e.title}
                        <em>{e.date}</em>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
