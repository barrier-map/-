import { useEffect, useRef } from "react";

export default function PeerVideo({ stream }) {
  const videoRef = useRef();

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

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
