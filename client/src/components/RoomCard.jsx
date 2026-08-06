import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import { useAlert } from "../context/AlertContext";

export default function RoomCard({ room }) {

    const navigate = useNavigate();
    const { alert } = useAlert();

    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");

    const goToRoom = async (password) => {

        try {

            const response = await fetch(
                `${API_BASE_URL}/api/rooms/join`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        roomId: room.id,
                        password
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
                    </p>

                    <p>
                        📅 {room.created_at
                            ? new Date(room.created_at).toLocaleString("ko-KR")
                            : "-"}
                    </p>

                </div>

                <button
                    className="join-btn"
                    onClick={joinRoom}
                >
                    🚪 입장
                </button>

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
