import { useState } from "react";
import { API_BASE_URL } from "../config";

export default function CreateRoomModal({
  open,
  onClose,
  onCreated,
}) {
  const [title, setTitle] = useState("");
  const [password, setPassword] = useState("");
  const [maxUsers, setMaxUsers] = useState(6);

  if (!open) return null;

  const createRoom = async () => {
    if (title.trim() === "") {
      alert("방 이름을 입력해주세요.");
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem("user"));

      const response = await fetch(
        `${API_BASE_URL}/api/rooms/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            password,
            owner_id: user?.id || 0,
            max_users: maxUsers,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        alert("방이 생성되었습니다.");

        setTitle("");
        setPassword("");
        setMaxUsers(6);

        onCreated();
        onClose();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert("방 생성 실패");
    }
  };

  return (
    <div className="modal-bg">
      <div className="modal">

        <h2>📹 캠스터디 방 만들기</h2>

        <input
          type="text"
          placeholder="방 이름"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          type="password"
          placeholder="비밀번호(선택)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <select
          value={maxUsers}
          onChange={(e) => setMaxUsers(Number(e.target.value))}
        >
          <option value={2}>2명</option>
          <option value={4}>4명</option>
          <option value={6}>6명</option>
          <option value={8}>8명</option>
          <option value={10}>10명</option>
        </select>

        <div className="modal-buttons">
          <button className="cancel-btn" onClick={onClose}>
            취소
          </button>

          <button className="create-btn" onClick={createRoom}>
            생성
          </button>
        </div>

      </div>
    </div>
  );
}