import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import RoomCard from "../components/RoomCard";
import CreateRoomModal from "../components/CreateRoomModal";
import "../styles/StudyRoom.css";
import { API_BASE_URL } from "../config";

export default function StudyRoom() {
  const [rooms, setRooms] = useState([]);
  const [open, setOpen] = useState(false);

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
      alert("방 목록을 불러오지 못했습니다.");
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

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

        <div className="room-list">

          {rooms.length === 0 ? (

            <div className="empty-room">
              <h2>📚 아직 만들어진 방이 없습니다.</h2>

              <p style={{ marginTop: "10px" }}>
                첫 번째 캠스터디 방을 만들어보세요!
              </p>
            </div>

          ) : (

            rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
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