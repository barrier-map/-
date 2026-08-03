import { useEffect, useRef } from "react";

export default function PeerVideo({ peer }) {
  const videoRef = useRef();

  useEffect(() => {
    if (!peer) return;

    peer.on("stream", (stream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    });

    return () => {
      peer.removeAllListeners("stream");
    };
  }, [peer]);

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "18px",
        padding: "10px",
        boxShadow: "0 10px 25px rgba(0,0,0,.08)",
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          width: "100%",
          height: "280px",
          borderRadius: "12px",
          background: "#000",
          objectFit: "cover",
        }}
      />
    </div>
  );
}