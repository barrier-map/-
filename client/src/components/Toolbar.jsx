import { useState } from "react";

export default function Toolbar({
  onCamera,
  onMic,
  onShare,
}) {
  const [camera, setCamera] = useState(true);
  const [mic, setMic] = useState(true);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: "15px",
        marginTop: "20px",
      }}
    >
      <button
        onClick={() => {
          setCamera(!camera);
          onCamera && onCamera();
        }}
      >
        {camera ? "📷 카메라 ON" : "📷 카메라 OFF"}
      </button>

      <button
        onClick={() => {
          setMic(!mic);
          onMic && onMic();
        }}
      >
        {mic ? "🎤 마이크 ON" : "🔇 마이크 OFF"}
      </button>

      <button
        onClick={() => {
          onShare && onShare();
        }}
      >
        🖥️ 화면 공유
      </button>
    </div>
  );
}