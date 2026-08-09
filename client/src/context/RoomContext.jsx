import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Peer from "simple-peer";
import socket from "../socket";
import { useAlert } from "./AlertContext";
import { API_BASE_URL } from "../config";

const RoomContext = createContext(null);

const FRAME_INTERVAL_MS = 2000; // 타임랩스용 : 2초마다 한 장 캡처
const MAX_FRAMES = 2000;

// 캠스터디 연결을 앱 전체(페이지 이동해도 안 끊기게) 단위로 관리함
export function RoomProvider({ children }) {
  const { alert } = useAlert();

  const [roomId, setRoomId] = useState(null);
  const [roomTitle, setRoomTitle] = useState("");
  const [ownerId, setOwnerId] = useState(null);
  const [peers, setPeers] = useState([]); // [{ peerId, peer, username, userId, micOn, remoteStream }]
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [messages, setMessages] = useState([]);
  const [kicked, setKicked] = useState(false);

  const myStream = useRef(null);
  const myVideoEl = useRef(null); // 현재 화면에 붙어있는 <video> DOM
  const peersRef = useRef([]);
  const roomIdRef = useRef(null);
  const myUserIdRef = useRef(null);

  const framesRef = useRef([]);
  const captureTimerRef = useRef(null);

  // Room 페이지 / 플로팅 위젯 어느 쪽이든, <video ref={attachVideoRef}> 로
  // 붙이면 항상 최신 스트림이 자동으로 연결되도록 하는 콜백 ref
  const attachVideoRef = (el) => {
    myVideoEl.current = el;
    if (el && myStream.current) {
      el.srcObject = myStream.current;
    }
  };

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
      const video = myVideoEl.current;

      if (!video || video.readyState < 2) return;
      if (framesRef.current.length >= MAX_FRAMES) return;

      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        framesRef.current.push(canvas.toDataURL("image/jpeg", 0.4));
      } catch (e) {
        // 캡처 한 번 실패는 무시
      }
    }, FRAME_INTERVAL_MS);
  }

  function createPeer(targetId, stream, initiator) {
    const peer = new Peer({ initiator, trickle: false, stream });

    peer.on("signal", (signal) => {
      socket.emit("signal", { target: targetId, signal });
    });

    peer.on("stream", (remoteStream) => {
      peersRef.current = peersRef.current.map((p) =>
        p.peerId === targetId ? { ...p, remoteStream } : p
      );
      setPeers((prev) =>
        prev.map((p) =>
          p.peerId === targetId ? { ...p, remoteStream } : p
        )
      );
    });

    peer.on("error", (err) => {
      console.error("Peer 연결 오류:", err);
    });

    return peer;
  }

  function addPeer(peerId, peer, username, userId) {
    const entry = {
      peerId,
      peer,
      username: username || "익명",
      userId: userId || null,
      micOn: true,
      remoteStream: null,
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

  // 소켓 리스너는 앱이 켜져있는 동안 한 번만 등록
  useEffect(() => {
    socket.on("existing-users", (users = []) => {
      if (!myStream.current) return;
      users.forEach((user) => {
        const peer = createPeer(user.id, myStream.current, true);
        addPeer(user.id, peer, user.username, user.userId);
      });
    });

    socket.on("user-joined", (user) => {
      if (!myStream.current) return;
      const peer = createPeer(user.id, myStream.current, false);
      addPeer(user.id, peer, user.username, user.userId);
    });

    socket.on("signal", ({ sender, signal }) => {
      const target = peersRef.current.find((p) => p.peerId === sender);
      if (target) target.peer.signal(signal);
    });

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

    socket.on("user-left", ({ socketId }) => {
      removePeer(socketId);
    });

    socket.on("receive-message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("kicked", () => {
      setKicked(true);
      alert("방장에 의해 방에서 내보내졌습니다.");
      leaveRoom();
    });

    return () => {
      socket.off("existing-users");
      socket.off("user-joined");
      socket.off("signal");
      socket.off("mic-status");
      socket.off("user-left");
      socket.off("receive-message");
      socket.off("kicked");
    };
  }, []);

  const joinRoom = async (newRoomId, username, userId) => {
    // 이미 같은 방에 연결되어 있다면 다시 연결할 필요 없음
    if (roomIdRef.current === newRoomId) return;

    // 다른 방에 연결되어 있었다면 먼저 정리
    if (roomIdRef.current) {
      leaveRoom();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      myStream.current = stream;
      myUserIdRef.current = userId;

      if (myVideoEl.current) {
        myVideoEl.current.srcObject = stream;
      }

      setMicOn(true);
      setCamOn(true);
      setKicked(false);
      framesRef.current = [];
      startCapturing();

      roomIdRef.current = newRoomId;
      setRoomId(newRoomId);

      // 방 정보(방장 확인용) + 채팅 기록 불러오기
      fetch(`${API_BASE_URL}/api/rooms/${newRoomId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setRoomTitle(data.room.title);
            setOwnerId(data.room.owner_id);
          }
        })
        .catch((err) => console.error(err));

      fetch(`${API_BASE_URL}/api/rooms/${newRoomId}/messages`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setMessages(data.messages);
          }
        })
        .catch((err) => console.error(err));

      socket.connect();
      socket.emit("join-room", { roomId: newRoomId, username, userId });
    } catch (err) {
      console.error("카메라/마이크를 사용할 수 없습니다.", err);
      await alert("카메라 또는 마이크 권한을 허용해주세요.");
    }
  };

  const leaveRoom = () => {
    stopCapturing();

    peersRef.current.forEach(({ peer }) => peer.destroy());
    peersRef.current = [];
    setPeers([]);

    if (myStream.current) {
      myStream.current.getTracks().forEach((track) => track.stop());
      myStream.current = null;
    }

    socket.disconnect();

    roomIdRef.current = null;
    setRoomId(null);
    setRoomTitle("");
    setOwnerId(null);
    setMessages([]);
  };

  // 방장이 다른 참가자를 내보냄
  const kickUser = (targetSocketId) => {
    if (!roomIdRef.current) return;
    socket.emit("kick-user", { roomId: roomIdRef.current, targetSocketId });
  };

  const toggleCamera = () => {
    if (!myStream.current) return;

    const track = myStream.current.getVideoTracks()[0];
    if (!track) return;

    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  };

  const toggleMic = () => {
    if (!myStream.current) return;

    const track = myStream.current.getAudioTracks()[0];
    if (!track) return;

    track.enabled = !track.enabled;
    setMicOn(track.enabled);

    socket.emit("mic-status", { roomId: roomIdRef.current, micOn: track.enabled });
  };

  const sendMessage = (text, username) => {
    if (!text.trim() || !roomIdRef.current) return;

    const data = {
      roomId: roomIdRef.current,
      user: username,
      message: text,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    socket.emit("send-message", data);
  };

  const getFrames = () => framesRef.current;
  const clearFrames = () => {
    framesRef.current = [];
  };

  return (
    <RoomContext.Provider
      value={{
        roomId,
        roomTitle,
        ownerId,
        peers,
        micOn,
        camOn,
        messages,
        kicked,
        attachVideoRef,
        joinRoom,
        leaveRoom,
        toggleCamera,
        toggleMic,
        sendMessage,
        getFrames,
        clearFrames,
        kickUser,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  const ctx = useContext(RoomContext);

  if (!ctx) {
    throw new Error("useRoom()은 RoomProvider 안에서만 사용할 수 있습니다.");
  }

  return ctx;
}
