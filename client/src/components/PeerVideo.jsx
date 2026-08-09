import { useEffect, useRef } from "react";

export default function PeerVideo({ stream }) {
  const videoRef = useRef();

  useEffect(() => {
    if (!videoRef.current || !stream) return;

    videoRef.current.srcObject = stream;

    // 브라우저가 자동재생을 막는 경우가 있어서 한 번 더 직접 눌러줌
    // (실패해도 문제되지 않으니 조용히 넘어감)
    const playPromise = videoRef.current.play();

    if (playPromise && playPromise.catch) {
      playPromise.catch(() => {});
    }
  }, [stream]);

  // 아직 상대 영상이 도착하지 않았을 때
  if (!stream) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          background: "#2a2a35",
          color: "#bbb",
          fontSize: 14,
        }}
      >
        <span style={{ fontSize: 26 }}>📡</span>
        연결 중...
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />
  );
}
