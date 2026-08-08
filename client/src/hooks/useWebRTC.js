import { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";
import socket from "../socket";
import { useAlert } from "../context/AlertContext";

export default function useWebRTC(roomId, username, userId) {
  const [peers, setPeers] = useState([]); // [{ peerId, peer, username, micOn }]
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const { alert } = useAlert();

  const myVideo = useRef();
  const myStream = useRef();
  const peersRef = useRef([]); // 최신 peer 목록 (클로저 문제 방지용)

  // ===== 타임랩스용 프레임 캡처 =====
  const framesRef = useRef([]); // 캡처된 사진(dataURL)들
  const captureTimerRef = useRef(null);
  const FRAME_INTERVAL_MS = 2000; // 2초마다 한 장 캡처
  const MAX_FRAMES = 2000; // 너무 오래 켜둬도 메모리가 넘치지 않도록 상한선

  function stopCapturing() {
    if (captureTimerRef.current) {
      clearInterval(captureTimerRef.current);
      captureTimerRef.current = null;
    }
  }

  function startCapturing() {
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 135;
    const ctx = canvas.getContext("2d");

    captureTimerRef.current = setInterval(() => {
      const video = myVideo.current;

      if (!video || video.readyState < 2) return;
      if (framesRef.current.length >= MAX_FRAMES) return;

      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        framesRef.current.push(canvas.toDataURL("image/jpeg", 0.4));
      } catch (e) {
        // 캡처 한 번 실패하는 건 타임랩스에 큰 영향 없으니 무시
      }
    }, FRAME_INTERVAL_MS);
  }

  useEffect(() => {
    let cancelled = false;

    function createPeer(targetId, stream, initiator) {
      const peer = new Peer({
        initiator,
        trickle: false,
        stream,
      });

      peer.on("signal", (signal) => {
        socket.emit("signal", { target: targetId, signal });
      });

      peer.on("error", (err) => {
        console.error("Peer 연결 오류:", err);
      });

      return peer;
    }

    function addPeer(peerId, peer, peerUsername) {
      const entry = {
        peerId,
        peer,
        username: peerUsername || "익명",
        micOn: true,
      };
      peersRef.current = [...peersRef.current, entry];
      setPeers((prev) => [...prev, entry]);
    }

    function removePeer(peerId) {
      const target = peersRef.current.find((p) => p.peerId === peerId);
      if (target) target.peer.destroy();

      peersRef.current = peersRef.current.filter((p) => p.peerId !== peerId);
      setPeers((prev) => prev.filter((p) => p.peerId !== peerId));
    }

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        myStream.current = stream;

        if (myVideo.current) {
          myVideo.current.srcObject = stream;
        }

        startCapturing();

        socket.connect();
        socket.emit("join-room", { roomId, username, userId });

        // 방에 이미 있던 사람들 : 내가 먼저 연결을 건다 (initiator)
        socket.on("existing-users", (users = []) => {
          users.forEach((user) => {
            const peer = createPeer(user.id, stream, true);
            addPeer(user.id, peer, user.username);
          });
        });

        // 새로 들어온 사람 : 상대가 연결을 걸어올 때까지 기다린다
        socket.on("user-joined", (user) => {
          const peer = createPeer(user.id, stream, false);
          addPeer(user.id, peer, user.username);
        });

        // 상대방의 signal(offer/answer/ice 정보 포함)을 받아 해당 peer에 전달
        socket.on("signal", ({ sender, signal }) => {
          const target = peersRef.current.find((p) => p.peerId === sender);
          if (target) target.peer.signal(signal);
        });

        // 상대방의 마이크 on/off 상태 갱신
        socket.on("mic-status", ({ socketId, micOn: peerMicOn }) => {
          peersRef.current = peersRef.current.map((p) =>
            p.peerId === socketId ? { ...p, micOn: peerMicOn } : p
          );
          setPeers((prev) =>
            prev.map((p) =>
              p.peerId === socketId ? { ...p, micOn: peerMicOn } : p
            )
          );
        });

        // 상대방이 나감
        socket.on("user-left", ({ socketId }) => {
          removePeer(socketId);
        });
      } catch (err) {
        console.error("카메라/마이크를 사용할 수 없습니다.", err);
        await alert("카메라 또는 마이크 권한을 허용해주세요.");
      }
    }

    start();

    return () => {
      cancelled = true;

      stopCapturing();

      socket.off("existing-users");
      socket.off("user-joined");
      socket.off("signal");
      socket.off("mic-status");
      socket.off("user-left");

      peersRef.current.forEach(({ peer }) => peer.destroy());
      peersRef.current = [];
      setPeers([]);

      if (myStream.current) {
        myStream.current.getTracks().forEach((track) => track.stop());
      }

      socket.disconnect();
    };
  }, [roomId, username, userId]);

  // 카메라 on/off
  const toggleCamera = () => {
    if (!myStream.current) return;

    const track = myStream.current.getVideoTracks()[0];
    if (!track) return;

    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  };

  // 마이크 on/off (다른 사람에게도 상태를 알림)
  const toggleMic = () => {
    if (!myStream.current) return;

    const track = myStream.current.getAudioTracks()[0];
    if (!track) return;

    track.enabled = !track.enabled;
    setMicOn(track.enabled);

    socket.emit("mic-status", { roomId, micOn: track.enabled });
  };

  // 방 나가기 : 캠/마이크를 즉시 확실히 끈다
  const stopMedia = () => {
    stopCapturing();

    peersRef.current.forEach(({ peer }) => peer.destroy());
    peersRef.current = [];
    setPeers([]);

    if (myStream.current) {
      myStream.current.getTracks().forEach((track) => track.stop());
    }

    socket.disconnect();
  };

  // 지금까지 캡처된 타임랩스용 사진들을 가져옴
  const getFrames = () => framesRef.current;

  return {
    myVideo,
    peers,
    micOn,
    camOn,
    toggleCamera,
    toggleMic,
    stopMedia,
    getFrames,
  };
}
