import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import PeerVideo from "../components/PeerVideo";
import useWebRTC from "../hooks/useWebRTC";
import socket from "../socket";

import "../styles/Room.css";

export default function Room() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const {
    myVideo,
    peers,
    micOn,
    camOn,
    toggleCamera,
    toggleMic,
    stopMedia,
  } = useWebRTC(id);

  const userCount = peers.length + 1; // 나 + 다른 참가자

  useEffect(() => {
    socket.on("receive-message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      socket.off("receive-message");
    };
  }, []);

  const sendMessage = () => {
    if (!message.trim()) return;

    const data = {
      roomId: id,
      user: "나",
      message,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    socket.emit("send-message", data);

    setMessages((prev) => [...prev, data]);

    setMessage("");
  };

  const leaveRoom = () => {
    if (window.confirm("정말 방을 나가시겠습니까?")) {
      stopMedia();
      navigate("/studyroom");
    }
  };

  return (
    <>
      <Sidebar />

      <div className="room-page">
        <div className="room-header">
          <div>
            <h1>📹 캠스터디 방</h1>

            <p>방 번호 : {id}</p>

            <p>
              👥 현재 접속 인원 : {userCount} / 12명
            </p>
          </div>

          <button
            className="leave-btn"
            onClick={leaveRoom}
          >
            🚪 방 나가기
          </button>
        </div>

        <div className="room-body">
          <div className="video-area">
            <div className="video-card">
              <video
                ref={myVideo}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "12px",
                  background: "#000",
                  objectFit: "cover",
                }}
              />
              <h3>나 {!camOn && "(카메라 꺼짐)"} {!micOn && "🔇"}</h3>
            </div>

            {peers.map(({ peerId, peer }) => (
              <div className="video-card" key={peerId}>
                <PeerVideo peer={peer} />
                <h3>참가자 {peerId.slice(0, 4)}</h3>
              </div>
            ))}
          </div>

          <div className="chat-area">
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
                    sendMessage();
                  }
                }}
              />

              <button
                onClick={sendMessage}
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
    </>
  );
}
