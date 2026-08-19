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

// ==========================================================
// 캠 영상이 서로 연결되기 위한 "길 안내소" 목록
//
// stun : 내 진짜 주소가 뭔지 알려주는 곳 (무료, 대부분 여기서 해결됨)
// turn : 직접 연결이 막혔을 때 짐을 대신 옮겨주는 중계소
//
// 공유기가 엄격한 환경(회사 와이파이, 일부 통신사 등)에서는
// turn 없이는 서로 화면이 안 보입니다.
//
// ⚠️ 아래 turn 주소는 누구나 쓸 수 있는 무료 테스트용이라
//    느리거나 갑자기 막힐 수 있어요. 정식 서비스로 만드실 때는
//    본인 계정으로 발급받은 주소로 바꿔주세요. (설명서 참고)
// ==========================================================
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

// 캠스터디 연결을 앱 전체(페이지 이동해도 안 끊기게) 단위로 관리함
export function RoomProvider({ children }) {
  const { alert } = useAlert();

  const [roomId, setRoomId] = useState(null);
  const [roomTitle, setRoomTitle] = useState("");
  const [ownerId, setOwnerId] = useState(null);
  const [peers, setPeers] = useState([]); // [{ peerId, peer, username, userId, micOn, remoteStream, status }]
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [messages, setMessages] = useState([]);
  const [kicked, setKicked] = useState(false);
  const [duplicateName, setDuplicateName] = useState(false);

  const myStream = useRef(null);
  const myVideoEl = useRef(null); // 현재 화면에 붙어있는 <video> DOM
  const peersRef = useRef([]);
  const roomIdRef = useRef(null);
  const myUserIdRef = useRef(null);

  // 상대방 정보보다 연결 신호가 먼저 도착했을 때 잠시 보관해두는 곳
  // (이게 없으면 신호가 그냥 버려져서 영영 연결이 안 됩니다)
  const pendingSignals = useRef({});

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

  // 특정 상대의 상태값만 바꿔주는 도우미
  function updatePeer(peerId, changes) {
    peersRef.current = peersRef.current.map((p) =>
      p.peerId === peerId ? { ...p, ...changes } : p
    );
    setPeers((prev) =>
      prev.map((p) => (p.peerId === peerId ? { ...p, ...changes } : p))
    );
  }

  function createPeer(targetId, stream, initiator) {
    const peer = new Peer({
      initiator,
      // trickle 을 켜면 연결 재료를 찾는 대로 바로바로 주고받아서
      // 연결이 훨씬 빠르고 성공률도 높아집니다.
      trickle: true,
      stream,
      config: { iceServers: ICE_SERVERS },
    });

    peer.on("signal", (signal) => {
      socket.emit("signal", { target: targetId, signal });
    });

    peer.on("stream", (remoteStream) => {
      console.log("[캠] 상대 화면 도착:", targetId);
      updatePeer(targetId, { remoteStream, status: "connected" });
    });

    peer.on("connect", () => {
      console.log("[캠] 연결 성공:", targetId);
      updatePeer(targetId, { status: "connected" });
    });

    peer.on("error", (err) => {
      console.error("[캠] 연결 오류:", targetId, err);
      updatePeer(targetId, { status: "failed" });
    });

    peer.on("close", () => {
      console.log("[캠] 연결 종료:", targetId);
    });

    // 연결이 어느 단계에서 막히는지 확인용
    if (peer._pc) {
      peer._pc.oniceconnectionstatechange = () => {
        const state = peer._pc.iceConnectionState;
        console.log("[캠] 연결 상태:", targetId, state);

        if (state === "failed") {
          console.error(
            "[캠] 직접 연결에 실패했습니다. 중계 서버(TURN)가 필요한 환경일 수 있어요."
          );
          updatePeer(targetId, { status: "failed" });
        }
      };
    }

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
      status: "connecting",
    };

    peersRef.current = [...peersRef.current, entry];
    setPeers((prev) => [...prev, entry]);

    // 먼저 도착해서 보관해뒀던 신호가 있으면 지금 넣어줌
    const queued = pendingSignals.current[peerId];

    if (queued && queued.length > 0) {
      console.log(`[캠] 보관해둔 신호 ${queued.length}개 처리:`, peerId);
      queued.forEach((signal) => {
        try {
          peer.signal(signal);
        } catch (err) {
          console.error("[캠] 보관 신호 처리 실패:", err);
        }
      });
      delete pendingSignals.current[peerId];
    }
  }

  function removePeer(peerId) {
    const target = peersRef.current.find((p) => p.peerId === peerId);
    if (target) target.peer.destroy();

    delete pendingSignals.current[peerId];

    peersRef.current = peersRef.current.filter((p) => p.peerId !== peerId);
    setPeers((prev) => prev.filter((p) => p.peerId !== peerId));
  }

  // 소켓 리스너는 앱이 켜져있는 동안 한 번만 등록
  useEffect(() => {
    socket.on("existing-users", (users = []) => {
      console.log("[캠] 이미 방에 있는 사람:", users.length + "명");

      if (!myStream.current) {
        console.warn("[캠] 내 카메라가 아직 준비되지 않아 연결을 건너뜁니다.");
        return;
      }

      users.forEach((user) => {
        // 이미 연결 중이면 다시 만들지 않음
        if (peersRef.current.some((p) => p.peerId === user.id)) return;

        const peer = createPeer(user.id, myStream.current, true);
        addPeer(user.id, peer, user.username, user.userId);
      });
    });

    socket.on("user-joined", (user) => {
      console.log("[캠] 새로 들어온 사람:", user.username);

      if (!myStream.current) {
        console.warn("[캠] 내 카메라가 아직 준비되지 않아 연결을 건너뜁니다.");
        return;
      }

      if (peersRef.current.some((p) => p.peerId === user.id)) return;

      const peer = createPeer(user.id, myStream.current, false);
      addPeer(user.id, peer, user.username, user.userId);
    });

    socket.on("signal", ({ sender, signal }) => {
      const target = peersRef.current.find((p) => p.peerId === sender);

      if (target) {
        try {
          target.peer.signal(signal);
        } catch (err) {
          console.error("[캠] 신호 처리 실패:", err);
        }
        return;
      }

      // 아직 상대 정보가 도착하지 않았다면 버리지 말고 보관
      if (!pendingSignals.current[sender]) {
        pendingSignals.current[sender] = [];
      }
      pendingSignals.current[sender].push(signal);
    });

    socket.on("mic-status", ({ socketId, micOn: peerMicOn }) => {
      updatePeer(socketId, { micOn: peerMicOn });
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

    socket.on("join-rejected", ({ reason }) => {
      if (reason === "duplicate-username") {
        alert("이미 같은 닉네임을 쓰는 사람이 방에 있습니다.\n설정에서 닉네임을 바꾼 뒤 다시 시도해주세요.");
      }
      setDuplicateName(true);
      leaveRoom();
    });

    socket.on("connect_error", (err) => {
      console.error("[캠] 서버 연결 실패:", err.message);
    });

    return () => {
      socket.off("existing-users");
      socket.off("user-joined");
      socket.off("signal");
      socket.off("mic-status");
      socket.off("user-left");
      socket.off("receive-message");
      socket.off("kicked");
      socket.off("join-rejected");
      socket.off("connect_error");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const joinRoom = async (newRoomId, username, userId) => {
    // 이미 같은 방에 연결되어 있다면 다시 연결할 필요 없음
    if (roomIdRef.current === newRoomId) return;

    // 다른 방에 연결되어 있었다면 먼저 정리
    if (roomIdRef.current) {
      leaveRoom();
    }

    // 카메라를 쓸 수 없는 환경인지 먼저 확인
    // (https 가 아닌 주소로 접속하면 브라우저가 카메라를 아예 막습니다)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("[캠] 이 주소에서는 카메라를 쓸 수 없습니다:", window.location.href);
      await alert(
        "이 주소에서는 카메라를 사용할 수 없습니다.\n" +
          "https:// 로 시작하는 주소이거나 localhost 여야 해요."
      );
      return;
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
      pendingSignals.current = {};
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
    pendingSignals.current = {};
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

  const resetDuplicateName = () => setDuplicateName(false);

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
        duplicateName,
        resetDuplicateName,
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
