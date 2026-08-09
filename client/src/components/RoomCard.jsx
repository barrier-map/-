import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import { useAlert } from "../context/AlertContext";

export default function RoomCard({ room, onDeleted }) {

    const navigate = useNavigate();
    const { alert, confirm } = useAlert();

    const currentUser = JSON.parse(localStorage.getItem("user") || "null");
    const isOwner = currentUser && room.owner_id === currentUser.id;

    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");

    const goToRoom = async (password) => {

        try {

            const user = JSON.parse(localStorage.getItem("user") || "null");

            const response = await fetch(
                `${API_BASE_URL}/api/rooms/join`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        roomId: room.id,
                        password,
                        userId: user?.id
                    })
                }
            );

            const data = await response.json();

            if (data.success) {
                navigate(`/room/${room.id}`);
            } else {
                await alert(data.message);
            }

        } catch (err) {
            console.log(err);
            await alert("서버 연결 실패");
        }

    };

    const joinRoom = () => {
        if (room.hasPassword) {
            setPasswordInput("");
            setShowPasswordModal(true);
            return;
        }

        goToRoom("");
    };

    const submitPassword = () => {
        setShowPasswordModal(false);
        goToRoom(passwordInput);
    };

    const deleteRoom = async () => {
        const ok = await confirm(`"${room.title}" 방을 삭제하시겠습니까?`);
        if (!ok) return;

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/rooms/${room.id}`,
                {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: currentUser?.id }),
                }
            );

            const data = await response.json();

            if (data.success) {
                onDeleted && onDeleted();
            } else {
                await alert(data.message || "삭제 실패");
            }
        } catch (err) {
            console.log(err);
            await alert("서버 연결 실패");
        }
    };

    return (
        <>
            <div className="room-card">

                <div className="room-info">

                    <h2>{room.title}</h2>

                    <p>
                        👥 최대 {room.max_users}명
                    </p>

                    <p>
                        {room.hasPassword
                            ? "🔒 비밀번호 방"
                            : "🌐 공개방"}
                        {isOwner && " · 👑 내가 만든 방"}
                    </p>

                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button
                        className="join-btn"
                        onClick={joinRoom}
                    >
                        🚪 입장
                    </button>

                    {isOwner && (
                        <button
                            onClick={deleteRoom}
                            style={{
                                border: "none",
                                background: "#fee2e2",
                                color: "#ef4444",
                                borderRadius: 10,
                                padding: "8px 0",
                                cursor: "pointer",
                                fontSize: 13,
                            }}
                        >
                            🗑 삭제
                        </button>
                    )}
                </div>

            </div>

            {showPasswordModal && (
                <div className="modal-bg">
                    <div className="modal">

                        <h2>🔒 비밀번호 입력</h2>

                        <input
                            type="password"
                            placeholder="비밀번호를 입력하세요"
                            value={passwordInput}
                            autoFocus
                            autoComplete="new-password"
                            onChange={(e) => setPasswordInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") submitPassword();
                            }}
                        />

                        <div className="modal-buttons">
                            <button
                                className="cancel-btn"
                                onClick={() => setShowPasswordModal(false)}
                            >
                                취소
                            </button>

                            <button
                                className="create-btn"
                                onClick={submitPassword}
                            >
                                입장
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </>
    );

}
