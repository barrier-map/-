import { useEffect, useRef } from "react";

export default function Webcam({ onStreamReady }) {
  const videoRef = useRef(null);

  useEffect(() => {
    let stream;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // 부모(Room)에게 스트림 전달
        if (onStreamReady) {
          onStreamReady(stream);
        }
      } catch (err) {
        console.error("카메라를 사용할 수 없습니다.", err);
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [onStreamReady]);

  return (
    <video
      ref={videoRef}
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
  );
}