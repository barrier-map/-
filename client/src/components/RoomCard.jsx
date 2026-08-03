import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

export default function RoomCard({ room }) {

    const navigate = useNavigate();

    const joinRoom = async () => {

        let password = "";

        if (room.hasPassword) {

            const input = prompt("비밀번호를 입력하세요.");

            if (input === null) return;

            password = input;

        }

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

            }

            else {

                alert(data.message);

            }

        }

        catch (err) {

            console.log(err);

            alert("서버 연결 실패");

        }

    };

    return (

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

    );

}