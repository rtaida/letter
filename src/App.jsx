import { useEffect, useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL?.trim()
  || (import.meta.env.PROD ? "/api/send-selfie" : "");

const memoryPhotos = [
  { src: "/images/memory-01.png", caption: "A little moment together" },
  { src: "/images/memory-02.png", caption: "My favorite place is with you" },
  { src: "/images/memory-03.png", caption: "One of my favorite days" },
  { src: "/images/memory-04.png", caption: "Always making me smile" },
  { src: "/images/memory-05.png", caption: "Silly little memories" },
  { src: "/images/memory-06.png", caption: "Just us being us" },
  { src: "/images/memory-07.png", caption: "A memory I’ll keep close" },
];

function App() {
  const [page, setPage] = useState("welcome");
  const [acceptClicks, setAcceptClicks] = useState(0);
  const [memoryIndex, setMemoryIndex] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [photo, setPhoto] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [sendError, setSendError] = useState("");
  const [sending, setSending] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    video.play().catch(() => {
      setCameraError("The camera preview couldn’t start. Please try turning the camera off and on again.");
    });
  }, [cameraReady]);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  useEffect(() => {
    if (page !== "thank-you" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setMemoryIndex((index) => (index + 1) % memoryPhotos.length);
    }, 2400);

    return () => window.clearInterval(timer);
  }, [page]);

  async function startCamera() {
    setCameraError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Camera access is not available here. Open this page in a modern browser over HTTPS and try again.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
      });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      setCameraReady(true);
    } catch (error) {
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setCameraError("Camera permission was not granted. You can try again whenever you’re ready.");
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        setCameraError("No camera was found on this device.");
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        setCameraError("The camera may already be in use by another app. Close it there and try again.");
      } else {
        setCameraError("The camera couldn’t be opened. Please check your browser settings and try again.");
      }
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError("The camera is still getting ready. Please wait a moment and try again.");
      return;
    }

    const maxWidth = 900;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const canvas = document.createElement("canvas");
    const photoWidth = Math.round(video.videoWidth * scale);
    const photoHeight = Math.round(photoWidth * 0.75);
    const border = Math.round(photoWidth * 0.045);
    const captionHeight = Math.round(photoWidth * 0.16);
    canvas.width = photoWidth + border * 2;
    canvas.height = photoHeight + border * 2 + captionHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("This browser couldn’t prepare the photo. Please try another browser.");
      return;
    }

    context.fillStyle = "#fffdf9";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.beginPath();
    context.rect(border, border, photoWidth, photoHeight);
    context.clip();
    const sourceRatio = video.videoWidth / video.videoHeight;
    const targetRatio = photoWidth / photoHeight;
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = video.videoWidth;
    let sourceHeight = video.videoHeight;
    if (sourceRatio > targetRatio) {
      sourceWidth = video.videoHeight * targetRatio;
      sourceX = (video.videoWidth - sourceWidth) / 2;
    } else {
      sourceHeight = video.videoWidth / targetRatio;
      sourceY = (video.videoHeight - sourceHeight) / 2;
    }
    context.translate(border + photoWidth, border);
    context.scale(-1, 1);
    context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, photoWidth, photoHeight);
    context.restore();

    context.fillStyle = "#633b4c";
    context.font = `italic ${Math.round(photoWidth * 0.055)}px Georgia, serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(
      "a little moment to keep ♡",
      canvas.width / 2,
      border + photoHeight + captionHeight / 2,
    );
    setPhoto(canvas.toDataURL("image/jpeg", 0.82));
    setSendError("");
  }

  async function sendPhoto() {
    if (!API_URL) {
      setSendError("The email service hasn’t been connected yet. Please ask Jared to finish the setup.");
      return;
    }

    setSending(true);
    setSendError("");
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "The photo couldn’t be sent. Please try again.");
      }

      stopCamera();
      setMemoryIndex(0);
      setPage("thank-you");
    } catch (error) {
      setSendError(error.message || "The photo couldn’t be sent. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  function goBackToLetter() {
    stopCamera();
    setPhoto("");
    setCameraError("");
    setSendError("");
    setPage("letter");
  }

  return (
    <main className="page-shell">
      <div className="floating-hearts" aria-hidden="true">
        <span className="floating-heart heart-one">♡</span>
        <span className="floating-heart heart-two">♥</span>
        <span className="floating-heart heart-three">♡</span>
        <span className="floating-heart heart-four">♥</span>
        <span className="floating-heart heart-five">♡</span>
        <span className="floating-heart heart-six">♥</span>
        <span className="floating-heart heart-seven">♡</span>
      </div>
      <div className="sparkle sparkle-one" aria-hidden="true">✦</div>
      <div className="sparkle sparkle-two" aria-hidden="true">✧</div>
      <div className="sparkle sparkle-three" aria-hidden="true">♡</div>

      <div className="letter-card">
        <div className="topline">
          <span className="topline-heart" aria-hidden="true">♥</span>
          <span>A LITTLE NOTE FROM JARED</span>
          <span className="topline-heart" aria-hidden="true">♥</span>
        </div>

        {page === "welcome" && (
          <section className="welcome-panel" aria-labelledby="welcome-title">
            <p className="eyebrow">A LITTLE SOMETHING FOR YOU</p>
            <button
              className="envelope-trigger"
              onClick={() => setPage("letter")}
              aria-label="Click the letter to open it"
            >
              <span className="envelope" aria-hidden="true">
                <span className="envelope-heart">♡</span>
              </span>
            </button>
            <button
              id="welcome-title"
              className="click-letter-title"
              onClick={() => setPage("letter")}
            >
              CLICK THE LETTER
            </button>
            <p className="tiny-note">Tap the letter to open it <span aria-hidden="true">♡</span></p>
          </section>
        )}

        {page === "letter" && (
          <section className="letter-panel" aria-labelledby="letter-title">
            <p className="eyebrow">A NOTE FROM MY HEART</p>
            <h1 id="letter-title">I’m truly sorry.</h1>
            <div className="letter-copy">
              <p>Dear Baby Jelay,</p>
              <p>
                I’m sorry for hurting you. You deserve patience, kindness, and
                the effort to understand how you feel. I should have done
                better, and I want to learn from this—not just say the words.
              </p>
              <p>
                I care about you so much, I shouldn't act the way I acted
                earlier I'm very sorry
              </p>
              <p className="signature">With all my love,<br />Jared <span aria-hidden="true">♡</span></p>
            </div>
            <p className="question">Can you forgive me?</p>
            <div className="choice-row">
              <button
                className="button button-primary accept-button"
                style={{ "--accept-scale": 1 + acceptClicks * 0.18 }}
                onClick={() => {
                  setPage("camera");
                  setAcceptClicks(0);
                  setCameraError("");
                  setPhoto("");
                }}
              >
                I accept <span aria-hidden="true">♡</span>
              </button>
              <button
                className="button button-soft"
                onClick={() => setAcceptClicks((clicks) => clicks + 1)}
              >
                Not yet
              </button>
            </div>
            <p className="tiny-note" aria-live="polite">
              {acceptClicks > 0 ? "That’s okay—take all the time you need." : "Either answer is okay. Take your time."}
            </p>
          </section>
        )}

        {page === "camera" && (
          <section className="camera-panel" aria-labelledby="camera-title">
            <p className="eyebrow">ONE LITTLE KEEPSAKE</p>
            <h1 id="camera-title">A selfie, only if you’d like.</h1>
            <p className="camera-copy">
              Take a little selfie to remember this moment. You’ll get to see it first.
            </p>

            <div className={`camera-frame${photo ? " has-photo" : ""}`}>
              {photo ? (
                <img className="photo-preview" src={photo} alt="Your selfie preview" />
              ) : cameraReady ? (
                <video ref={videoRef} className="camera-video" autoPlay playsInline muted />
              ) : (
                <div className="camera-placeholder">
                  <span className="camera-icon" aria-hidden="true">◎</span>
                  <span>Your camera preview will appear here</span>
                </div>
              )}
            </div>

            {cameraError && <p className="feedback error" role="alert">{cameraError}</p>}
            {sendError && <p className="feedback error" role="alert">{sendError}</p>}

            {!photo && !cameraReady && (
              <button className="button button-primary" onClick={startCamera}>
                Turn on camera
              </button>
            )}
            {!photo && cameraReady && (
              <button className="button button-primary" onClick={capturePhoto}>
                Take selfie
              </button>
            )}
            {photo && (
              <div className="choice-row">
                <button
                  className="button button-soft"
                  onClick={() => {
                    setPhoto("");
                    setSendError("");
                  }}
                  disabled={sending}
                >
                  Retake
                </button>
                <button
                  className="button button-primary"
                  onClick={sendPhoto}
                  disabled={sending || !API_URL}
                >
                  {sending ? "Sending…" : "Done"}
                </button>
              </div>
            )}

            {!API_URL && (
              <p className="setup-note">
                This keepsake is still being set up.
              </p>
            )}
            <button className="text-button" onClick={goBackToLetter} disabled={sending}>
              ← Back to the letter
            </button>
          </section>
        )}

        {page === "thank-you" && (
          <section className="message-panel" aria-labelledby="thank-you-title">
            <div className="illustration-heart" aria-hidden="true">♥</div>
            <p className="eyebrow">A MOMENT TO KEEP</p>
            <h1 id="thank-you-title">Thank you, Baby Jelay.</h1>
            <p className="intro-copy">
              Your selfie has been sent to Jared. Thank you for giving this
              moment a chance.
            </p>
            <p className="memory-caption" aria-live="polite">
              A few of my favorite moments · {memoryIndex + 1} / {memoryPhotos.length}
            </p>
            <div className="memory-stage" aria-label="Favorite memories together">
              {[-1, 1, 0].map((offset) => {
                const index = (memoryIndex + offset + memoryPhotos.length) % memoryPhotos.length;
                const memory = memoryPhotos[index];
                const position = offset === 0 ? "active" : offset < 0 ? "previous" : "next";
                return (
                  <figure
                    className={`memory-card memory-card-${position}`}
                    key={`${position}-${index}`}
                    aria-hidden={position !== "active"}
                  >
                    <img src={memory.src} alt={position === "active" ? memory.caption : ""} />
                    <figcaption>{memory.caption}</figcaption>
                  </figure>
                );
              })}
            </div>
            <p className="signature closing-signature">Always yours, Jared <span aria-hidden="true">♡</span></p>
          </section>
        )}

        <div className="card-footer">
          <span>MADE WITH LOVE</span>
          <span aria-hidden="true">♥</span>
          <span>JUST FOR YOU</span>
        </div>
      </div>
      <p className="page-caption">A little note, from Jared to Baby Jelay</p>
    </main>
  );
}

export default App;
