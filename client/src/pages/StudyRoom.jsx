import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import RoomCard from "../components/RoomCard";
import CreateRoomModal from "../components/CreateRoomModal";
import "../styles/StudyRoom.css";
import { API_BASE_URL } from "../config";
import { useAlert } from "../context/AlertContext";

export default function StudyRoom() {
  const [rooms, setRooms] = useState([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all"); // "all" | "mine"
  const [joinedRoomIds, setJoinedRoomIds] = useState([]);
  const { alert } = useAlert();

  const user = JSON.parse(localStorage.getItem("user"));

  // 방 목록 불러오기
  const loadRooms = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms`);
      const data = await response.json();

      if (Array.isArray(data)) {
        setRooms(data);
      } else {
        setRooms([]);
      }
    } catch (error) {
      console.error(error);
      await alert("방 목록을 불러오지 못했습니다.");
    }
  };

  // 내가 입장했던 방 목록 불러오기
  const loadJoinedRooms = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/rooms/joined/${user.id}`
      );
      const data = await response.json();

      if (data.success) {
        setJoinedRoomIds(data.roomIds);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadRooms();
    loadJoinedRooms();
  }, []);

  // 검색어 + 탭(전체/내 방) 으로 필터링
  const filteredRooms = rooms
    .filter((room) =>
      room.title.toLowerCase().includes(search.trim().toLowerCase())
    )
    .filter((room) => (tab === "mine" ? joinedRoomIds.includes(room.id) : true));

  return (
    <>
      <Sidebar />

      <div className="studyroom">

        <div className="studyroom-header">

          <div>
            <h1>📹 캠스터디</h1>

            <p>
              {user
                ? `${user.username}님, 함께 공부해보세요!`
                : "다른 사람들과 함께 공부해보세요."}
            </p>
          </div>

          <button
            className="create-btn"
            onClick={() => setOpen(true)}
          >
            ➕ 방 만들기
          </button>

        </div>

        <div className="stat-tabs" style={{ marginBottom: 15 }}>
          <button
            className={tab === "all" ? "active" : ""}
            onClick={() => setTab("all")}
          >
            전체
          </button>
          <button
            className={tab === "mine" ? "active" : ""}
            onClick={() => setTab("mine")}
          >
            내 방
          </button>
        </div>

        <input
          type="text"
          placeholder="🔍 방 이름으로 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: "12px",
            border: "1px solid #ddd",
            marginBottom: "20px",
            fontSize: "15px",
            boxSizing: "border-box",
          }}
        />

        <div className="room-list">

          {filteredRooms.length === 0 ? (

            <div className="empty-room">
              <h2>
                {rooms.length === 0
                  ? "📚 아직 만들어진 방이 없습니다."
                  : "🔍 검색 결과가 없습니다."}
              </h2>

              <p style={{ marginTop: "10px" }}>
                {rooms.length === 0
                  ? "첫 번째 캠스터디 방을 만들어보세요!"
                  : "다른 검색어로 다시 찾아보세요."}
              </p>
            </div>

          ) : (

            filteredRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onDeleted={loadRooms}
              />
            ))

          )}

        </div>

        <CreateRoomModal
          open={open}
          onClose={() => setOpen(false)}
          onCreated={loadRooms}
        />

      </div>
    </>
  );
}