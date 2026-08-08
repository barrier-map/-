import { useState } from "react";

// 배속 옵션 : 라벨에 보여줄 숫자와, 실제로 몇 장에 한 장씩 건너뛸지(step)
// (2초에 한 장씩 캡처 + 초당 10장 재생이 기본이라, step 1일 때 대략 20배속이 나옴)
const SPEED_OPTIONS = [
  { label: "20배속", step: 1 },
  { label: "40배속", step: 2 },
  { label: "100배속", step: 5 },
  { label: "200배속", step: 10 },
];

const OUTPUT_FPS = 10;

export default function TimelapseModal({ frames, onClose }) {
  const [speed, setSpeed] = useState(SPEED_OPTIONS[0]);
  const [generating, setGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [progress, setProgress] = useState(0);

  const generate = () => {
    setGenerating(true);
    setVideoUrl(null);
    setProgress(0);

    // 선택한 배속만큼 사진을 건너뛰면서 사용할 목록을 만듦
    const usedFrames = frames.filter((_, i) => i % speed.step === 0);

    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 135;
    const ctx = canvas.getContext("2d");

    const stream = canvas.captureStream(OUTPUT_FPS);
    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm",
    });

    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      setVideoUrl(URL.createObjectURL(blob));
      setGenerating(false);
    };

    recorder.start();

    let index = 0;
    const frameDelay = 1000 / OUTPUT_FPS;

    function drawNext() {
      if (index >= usedFrames.length) {
        recorder.stop();
        return;
      }

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setProgress(Math.round(((index + 1) / usedFrames.length) * 100));
        index++;
        setTimeout(drawNext, frameDelay);
      };
      img.src = usedFrames[index];
    }

    drawNext();
  };

  return (
    <div className="modal-bg">
      <div className="modal" style={{ width: 480 }}>
        <h2 style={{ marginTop: 0 }}>🎬 타임랩스가 준비됐어요</h2>

        <p style={{ color: "#666", fontSize: 14 }}>
          이번 캠스터디 동안 사진 {frames.length}장이 모였어요. 배속을
          선택하고 영상을 만들어보세요.
        </p>

        <div style={{ display: "flex", gap: 8, margin: "15px 0" }}>
          {SPEED_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setSpeed(opt)}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                background: speed.label === opt.label ? "#6d5dfc" : "#eee",
                color: speed.label === opt.label ? "white" : "#333",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {!videoUrl && (
          <button
            className="confirm-btn"
            style={{ width: "100%" }}
            onClick={generate}
            disabled={generating}
          >
            {generating ? `영상 만드는 중... ${progress}%` : "🎥 영상 생성하기"}
          </button>
        )}

        {videoUrl && (
          <>
            <video
              src={videoUrl}
              controls
              style={{ width: "100%", borderRadius: 12, marginTop: 10 }}
            />

            <a
              href={videoUrl}
              download="darakbang-timelapse.webm"
              className="confirm-btn"
              style={{
                display: "block",
                textAlign: "center",
                textDecoration: "none",
                marginTop: 12,
              }}
            >
              ⬇ 다운로드
            </a>
          </>
        )}

        <button
          className="cancel-btn"
          style={{ width: "100%", marginTop: 10 }}
          onClick={onClose}
        >
          {videoUrl ? "닫고 나가기" : "타임랩스 없이 나가기"}
        </button>
      </div>
    </div>
  );
}
