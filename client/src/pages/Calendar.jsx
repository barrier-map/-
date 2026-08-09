import { useEffect, useState } from "react";

import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { useAlert } from "../context/AlertContext";
import { API_BASE_URL } from "../config";
import "../styles/Calendar.css";

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
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
  const [date, setDate] = useState(todayString());

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
  }, [userId]);

  const addEvent = async () => {
    if (!title.trim()) {
      await alert("일정 이름을 입력해주세요.");
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/calendar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, title, date }),
    });

    const data = await response.json();

    if (data.success) {
      setTitle("");
      loadEvents();
    } else {
      await alert(data.message);
    }
  };

  const deleteEvent = async (id) => {
    const ok = await confirm("이 일정을 삭제하시겠습니까?");
    if (!ok) return;

    await fetch(`${API_BASE_URL}/api/calendar/${id}`, { method: "DELETE" });
    loadEvents();
  };

  // 지난 일정과 다가올 일정을 나눠서 보여줌
  const upcoming = events.filter((e) => e.date >= todayString());
  const past = events
    .filter((e) => e.date < todayString())
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <>
      <Sidebar />

      <div className="calendar-page">
        <h1>📅 달력</h1>
        <p className="calendar-sub">
          시험일, 발표일 같은 중요한 날짜를 등록하면 디데이가 표시돼요.
        </p>

        <div className="calendar-add-box">
          <input
            type="text"
            placeholder="일정 이름 (예: 중간고사)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <button onClick={addEvent}>➕ 추가</button>
        </div>

        <h2 className="calendar-section-title">다가오는 일정</h2>

        {upcoming.length === 0 ? (
          <p className="calendar-empty">등록된 다가오는 일정이 없습니다.</p>
        ) : (
          <div className="dday-list">
            {upcoming.map((e) => (
              <div className="dday-card" key={e.id}>
                <div className="dday-badge">{getDday(e.date)}</div>

                <div className="dday-info">
                  <strong>{e.title}</strong>
                  <span>{e.date}</span>
                </div>

                <button onClick={() => deleteEvent(e.id)}>삭제</button>
              </div>
            ))}
          </div>
        )}

        {past.length > 0 && (
          <>
            <h2 className="calendar-section-title">지난 일정</h2>

            <div className="dday-list">
              {past.map((e) => (
                <div className="dday-card past" key={e.id}>
                  <div className="dday-badge">{getDday(e.date)}</div>

                  <div className="dday-info">
                    <strong>{e.title}</strong>
                    <span>{e.date}</span>
                  </div>

                  <button onClick={() => deleteEvent(e.id)}>삭제</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
