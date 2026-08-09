import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import PeerVideo from "../components/PeerVideo";
import TimelapseModal from "../components/TimelapseModal";
import PomodoroSettingsModal from "../components/PomodoroSettingsModal";
import { useAlert } from "../context/AlertContext";
import { useRoom } from "../context/RoomContext";
import { usePomodoro } from "../context/PomodoroContext";

import "../styles/Room.css";

export default function Room() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm } = useAlert();

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const myUsername = user?.username || "익명";

  const [message, setMessage] = useState("");
  const [showTimelapse, setShowTimelapse] = useState(false);
  const [timelapseFrames, setTimelapseFrames] = useState([]);
  const [showPomodoroSettings, setShowPomodoroSettings] = useState(false);

  const {
    roomId,
    roomTitle,
    ownerId,
    peers,
    micOn,
    camOn,
    messages,
    kicked,
    attachVideoRef,
    joinRoom,
    leaveRoom,
    toggleCamera,
    toggleMic,
    sendMessage,
    getFrames,
    clearFrames,
    kickUser,
  } = useRoom();

  const isOwner = ownerId && user?.id === ownerId;

  const {
    mode: pomodoroMode,
    timeLeft: pomodoroTimeLeft,
    running: pomodoroRunning,
    setRunning: setPomodoroRunning,
    resetPomodoro,
    formatTime,
  } = usePomodoro();

  // 이 방에 아직 연결되어 있지 않다면 연결함
  // (다른 페이지 갔다가 같은 방으로 돌아온 경우엔 이미 연결되어 있으니 다시 안 함)
  useEffect(() => {
    if (roomId !== id && !kicked) {
      joinRoom(id, myUsername, user?.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // 방장에게 강퇴당했다면 방 목록으로 돌려보냄
  useEffect(() => {
    if (kicked) {
      navigate("/studyroom");
    }
  }, [kicked, navigate]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessage(message, myUsername);
    setMessage("");
  };

  const handleLeave = async () => {
    const ok = await confirm("정말 방을 나가시겠습니까?");
    if (!ok) return;

    const frames = getFrames();
    leaveRoom();

    if (frames.length >= 5) {
      setTimelapseFrames(frames);
      setShowTimelapse(true);
    } else {
      navigate("/studyroom");
    }
  };

  return (
    <>
      <Sidebar />

      <div className="room-page">
        <div className="room-header">
          <div>
            <h1>📹 {roomTitle || "캠스터디 방"}</h1>
            <p>
              방 번호 : {id}
              {isOwner && " · 👑 내가 방장이에요"}
            </p>
          </div>

          <button className="leave-btn" onClick={handleLeave}>
            🚪 방 나가기
          </button>
        </div>

        <div className="room-body">
          <div className="video-area">
            <div className="video-card">
              <video
                ref={attachVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
              <div className="video-overlay">
                <span>{myUsername} (나){isOwner && " 👑"}</span>
                <span>{micOn ? "🎤" : "🔇"}</span>
              </div>
            </div>

            {peers.map(({ peerId, username, userId: peerUserId, micOn: peerMicOn, remoteStream }) => (
              <div className="video-card" key={peerId}>
                <PeerVideo stream={remoteStream} />
                <div className="video-overlay">
                  <span>
                    {username}
                    {ownerId && peerUserId === ownerId && " 👑"}
                  </span>
                  <span>{peerMicOn ? "🎤" : "🔇"}</span>
                </div>

                {isOwner && (
                  <button
                    onClick={() => kickUser(peerId)}
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      border: "none",
                      background: "rgba(239,68,68,.85)",
                      color: "white",
                      borderRadius: 8,
                      padding: "4px 8px",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    내보내기
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="chat-area">
            {/* 포모도로 미니 위젯 : 캠스터디 안에서 바로 타이머 조작 가능 */}
            <div
              style={{
                background: "#f7f7fb",
                borderRadius: 14,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <strong>
                  {pomodoroMode === "work" ? "🧠 포모도로" : "☕ 휴식 중"}
                </strong>

                <button
                  onClick={() => setShowPomodoroSettings(true)}
                  style={{
                    border: "none",
                    background: "white",
                    borderRadius: 8,
                    padding: "4px 8px",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  ⚙️
                </button>
              </div>

              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  textAlign: "center",
                  margin: "8px 0",
                  color: "#6d5dfc",
                }}
              >
                {formatTime(pomodoroTimeLeft)}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {!pomodoroRunning ? (
                  <button
                    onClick={() => setPomodoroRunning(true)}
                    style={{
                      flex: 1,
                      padding: 8,
                      border: "none",
                      borderRadius: 8,
                      background: "#6d5dfc",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    ▶ 시작
                  </button>
                ) : (
                  <button
                    onClick={() => setPomodoroRunning(false)}
                    style={{
                      flex: 1,
                      padding: 8,
                      border: "none",
                      borderRadius: 8,
                      background: "#6d5dfc",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    ⏸ 일시정지
                  </button>
                )}

                <button
                  onClick={resetPomodoro}
                  style={{
                    flex: 1,
                    padding: 8,
                    border: "none",
                    borderRadius: 8,
                    background: "#ddd",
                    cursor: "pointer",
                  }}
                >
                  ⏹ 초기화
                </button>
              </div>
            </div>

            <h2>💬 채팅</h2>

            <div className="chat-list">
              {messages.length === 0 ? (
                <p>아직 채팅이 없습니다.</p>
              ) : (
                messages.map((msg, index) => (
                  <div className="chat-item" key={index}>
                    <strong>{msg.user}</strong>

                    <span
                      style={{
                        float: "right",
                        color: "#999",
                        fontSize: "12px",
                      }}
                    >
                      {msg.time}
                    </span>

                    <p>{msg.message}</p>
                  </div>
                ))
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "15px",
              }}
            >
              <input
                type="text"
                placeholder="메시지를 입력하세요..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSend();
                  }
                }}
              />

              <button
                onClick={handleSend}
                style={{
                  padding: "12px 18px",
                  background: "#6d5dfc",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  cursor: "pointer",
                }}
              >
                전송
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "15px",
            marginTop: "20px",
          }}
        >
          <button
            onClick={toggleCamera}
            style={{
              padding: "10px 18px",
              background: camOn ? "#6d5dfc" : "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              fontSize: "15px",
            }}
          >
            {camOn ? "📷 카메라 ON" : "📷 카메라 OFF"}
          </button>

          <button
            onClick={toggleMic}
            style={{
              padding: "10px 18px",
              background: micOn ? "#6d5dfc" : "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              fontSize: "15px",
            }}
          >
            {micOn ? "🎤 마이크 ON" : "🔇 마이크 OFF"}
          </button>
        </div>
      </div>

      {showPomodoroSettings && (
        <PomodoroSettingsModal onClose={() => setShowPomodoroSettings(false)} />
      )}

      {showTimelapse && (
        <TimelapseModal
          frames={timelapseFrames}
          onClose={() => {
            setShowTimelapse(false);
            clearFrames();
            navigate("/studyroom");
          }}
        />
      )}
    </>
  );
}
