import { Link, useLocation } from "react-router-dom";
import { useRoom } from "../context/RoomContext";

// 캠스터디 방에 연결되어 있는 상태로 다른 페이지로 이동했을 때
// 화면 오른쪽 아래에 작게 떠있는 위젯
export default function FloatingRoomWidget() {
  const { pathname } = useLocation();
  const { roomId, micOn, attachVideoRef, toggleMic, leaveRoom } = useRoom();

  // 방에 연결되어 있지 않거나, 지금 그 방 페이지를 보고 있는 중이면 안 보여줌
  if (!roomId || pathname === `/room/${roomId}`) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        width: 180,
        background: "#111",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(0,0,0,.3)",
        zIndex: 500,
      }}
    >
      <div style={{ position: "relative" }}>
        <video
          ref={attachVideoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            height: 110,
            objectFit: "cover",
            display: "block",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 8,
            bottom: 8,
            background: "rgba(0,0,0,.55)",
            color: "white",
            fontSize: 12,
            padding: "3px 8px",
            borderRadius: 8,
          }}
        >
          🎥 캠스터디 진행 중
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          padding: 8,
          background: "#1a1a1a",
        }}
      >
        <Link
          to={`/room/${roomId}`}
          style={{
            flex: 1,
            textAlign: "center",
            padding: "8px 0",
            borderRadius: 8,
            background: "#6d5dfc",
            color: "white",
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          방으로
        </Link>

        <button
          onClick={toggleMic}
          style={{
            flex: 1,
            padding: "8px 0",
            borderRadius: 8,
            border: "none",
            background: "#333",
            color: "white",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {micOn ? "🎤" : "🔇"}
        </button>

        <button
          onClick={leaveRoom}
          style={{
            flex: 1,
            padding: "8px 0",
            borderRadius: 8,
            border: "none",
            background: "#ef4444",
            color: "white",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          나가기
        </button>
      </div>
    </div>
  );
}
