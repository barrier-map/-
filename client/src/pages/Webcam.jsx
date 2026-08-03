import { useEffect, useRef, useState } from "react";

export default function Webcam() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 1280,
            height: 720,
          },
          audio: true,
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error(error);
        alert("카메라 또는 마이크 권한을 허용해주세요.");
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // 카메라 ON/OFF
  const toggleCamera = () => {
    if (!streamRef.current) return;

    const videoTrack = streamRef.current.getVideoTracks()[0];

    if (!videoTrack) return;

    videoTrack.enabled = !videoTrack.enabled;

    setCameraOn(videoTrack.enabled);
  };

  // 마이크 ON/OFF
  const toggleMic = () => {
    if (!streamRef.current) return;

    const audioTrack = streamRef.current.getAudioTracks()[0];

    if (!audioTrack) return;

    audioTrack.enabled = !audioTrack.enabled;

    setMicOn(audioTrack.enabled);
  };

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "18px",
        padding: "15px",
        boxShadow: "0 10px 25px rgba(0,0,0,.08)",
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: "100%",
          height: "280px",
          borderRadius: "15px",
          background: "#000",
          objectFit: "cover",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "15px",
          marginTop: "15px",
        }}
      >
        <button
          onClick={toggleCamera}
          style={{
            padding: "10px 18px",
            background: cameraOn ? "#6d5dfc" : "#ef4444",
            color: "white",
            border: "none",
            borderRadius: "12px",
            cursor: "pointer",
            fontSize: "15px",
          }}
        >
          {cameraOn ? "📷 카메라 ON" : "📷 카메라 OFF"}
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
  );
}