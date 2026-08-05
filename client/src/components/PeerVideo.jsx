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