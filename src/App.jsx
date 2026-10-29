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
  const [loadedMemoryPhotos, setLoadedMemoryPhotos] = useState([]);
  const [memoryLoadFailed, setMemoryLoadFailed] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailNotice, setEmailNotice] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [photoBlob, setPhotoBlob] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [capturingPhoto, setCapturingPhoto] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [sendError, setSendError] = useState("");
  const [sending, setSending] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const photoPreviewUrlRef = useRef("");

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
    let active = true;
    const photoLoads = memoryPhotos.map((photo) => new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve({ photo, loaded: image.naturalWidth > 0 });
      image.onerror = () => resolve({ photo, loaded: false });
      image.src = photo.src;
    }));

    Promise.all(photoLoads).then((results) => {
      if (!active) return;
      const loaded = results.filter((result) => result.loaded).map((result) => result.photo);
      setLoadedMemoryPhotos(loaded);
      setMemoryLoadFailed(loaded.length !== memoryPhotos.length);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (
      page !== "thank-you"
      || loadedMemoryPhotos.length < 2
      || window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setMemoryIndex((index) => (index + 1) % loadedMemoryPhotos.length);
    }, 2400);

    return () => window.clearInterval(timer);
  }, [page, loadedMemoryPhotos.length]);

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

  function removeMemoryPhoto(src) {
    const remaining = loadedMemoryPhotos.filter((photo) => photo.src !== src);
    setLoadedMemoryPhotos(remaining);
    setMemoryIndex((index) => (remaining.length ? index % remaining.length : 0));
    setMemoryLoadFailed(true);
  }

  function moveMemory(offset) {
    setMemoryIndex((index) => (
      (index + offset + loadedMemoryPhotos.length) % loadedMemoryPhotos.length
    ));
  }

  function continueToKeepsake(wasSent, notice = "") {
    stopCamera();
    clearCapturedPhoto();
    setEmailSent(wasSent);
    setEmailNotice(notice);
    setPage("thank-you");
  }

  function clearCapturedPhoto() {
    if (photoPreviewUrlRef.current) {
      URL.revokeObjectURL(photoPreviewUrlRef.current);
      photoPreviewUrlRef.current = "";
    }
    setPhotoBlob(null);
    setPhotoPreviewUrl("");
    setPreviewError(false);
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
    setCapturingPhoto(true);
    canvas.toBlob((blob) => {
      setCapturingPhoto(false);
      if (!blob) {
        setCameraError("This browser couldn’t save the photo. Please try taking it again.");
        return;
      }

      stopCamera();
      setPhotoBlob(blob);
      const previewUrl = URL.createObjectURL(blob);
      photoPreviewUrlRef.current = previewUrl;
      setPhotoPreviewUrl(previewUrl);
      setPreviewError(false);
      setSendError("");
    }, "image/jpeg", 0.82);
  }

  async function sendPhoto() {
    setSending(true);
    setSendError("");
    try {
      if (!photoBlob) {
        throw new Error("Please take a selfie before continuing.");
      }

      if (!API_URL) {
        continueToKeepsake(false, "Email isn’t configured, so the selfie wasn’t sent.");
        return;
      }

      const photoData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result !== "string") {
            reject(new Error("The photo couldn’t be prepared for sending."));
            return;
          }
          resolve(reader.result);
        };
        reader.onerror = () => reject(reader.error || new Error("The photo couldn’t be read."));
        reader.readAsDataURL(photoBlob);
      });

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo: photoData }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "The photo couldn’t be sent. Please try again.");
      }

      continueToKeepsake(true);
    } catch (error) {
      setSendError(error.message || "The photo couldn’t be sent. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  function goBackToLetter() {
    stopCamera();
    clearCapturedPhoto();
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
                I care about you so much, I shouldn't act the way I acted. I'm very sorry.
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
                  setSendError("");
                  clearCapturedPhoto();
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

            <div className={`camera-frame${photoPreviewUrl ? " has-photo" : ""}`}>
              {photoPreviewUrl ? (
                previewError ? (
                  <div className="camera-placeholder" role="alert">
                    <span className="camera-icon" aria-hidden="true">◎</span>
                    <span>The preview couldn’t be displayed. Retake your selfie to try again.</span>
                  </div>
                ) : (
                  <img
                    className="photo-preview"
                    src={photoPreviewUrl}
                    alt="Your selfie preview"
                    onError={() => setPreviewError(true)}
                  />
                )
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

            {!photoPreviewUrl && !cameraReady && (
              <button className="button button-primary" onClick={startCamera}>
                Turn on camera
              </button>
            )}
            {!photoPreviewUrl && cameraReady && (
              <button className="button button-primary" onClick={capturePhoto} disabled={capturingPhoto}>
                {capturingPhoto ? "Saving…" : "Take selfie"}
              </button>
            )}
            {photoPreviewUrl && (
              <>
                <p className="privacy-note">
                  Press “Done” to continue. If email is configured, this Polaroid will be emailed to Jared.
                </p>
                <div className="choice-row">
                  <button
                    className="button button-soft"
                    onClick={() => {
                      clearCapturedPhoto();
                      setSendError("");
                    }}
                    disabled={sending}
                  >
                    Retake
                  </button>
                  <button
                    className="button button-primary"
                    onClick={sendPhoto}
                    disabled={sending}
                  >
                    {sending ? "Sending…" : "Done"}
                  </button>
                </div>
                </>
            )}

            {!API_URL && (
              <p className="setup-note">
                Email isn’t set up yet, but you can still continue.
              </p>
            )}
            {sendError && (
              <button
                className="text-button"
                onClick={() => continueToKeepsake(false, "The email didn’t go through, so the selfie wasn’t sent.")}
                disabled={sending}
              >
                Continue without email
              </button>
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
              {emailSent
                ? "Your selfie has been sent to Jared. Thank you for giving this moment a chance."
                : "Thank you for sharing this moment. I’ll keep working on my apology."}
            </p>
            {!emailSent && emailNotice && (
              <p className="memory-load-message" role="status">{emailNotice}</p>
            )}
            {loadedMemoryPhotos.length > 0 ? (
              <>
                <p className="memory-caption" aria-live="polite">
                  A few of my favorite moments · {memoryIndex + 1} / {loadedMemoryPhotos.length}
                </p>
                <div className="memory-stage" aria-label="Favorite memories together">
                  {[-1, 1, 0].map((offset) => {
                    const index = (
                      memoryIndex + offset + loadedMemoryPhotos.length
                    ) % loadedMemoryPhotos.length;
                    const memory = loadedMemoryPhotos[index];
                    const position = offset === 0 ? "active" : offset < 0 ? "previous" : "next";
                    return (
                      <figure
                        className={`memory-card memory-card-${position}`}
                        key={`${position}-${memory.src}`}
                        aria-hidden={position !== "active"}
                      >
                        <img
                          src={memory.src}
                          alt={position === "active" ? memory.caption : ""}
                          loading="eager"
                          decoding="async"
                          onError={() => removeMemoryPhoto(memory.src)}
                        />
                        <figcaption>{memory.caption}</figcaption>
                      </figure>
                    );
                  })}
                </div>
                <div className="memory-controls" aria-label="Photo carousel controls">
                  <button
                    className="memory-control"
                    onClick={() => moveMemory(-1)}
                    aria-label="Previous memory"
                  >
                    Previous
                  </button>
                  <button
                    className="memory-control"
                    onClick={() => moveMemory(1)}
                    aria-label="Next memory"
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              <p className="memory-load-message" role="status">
                Your keepsake photos are taking a little longer to load.
              </p>
            )}
            {memoryLoadFailed && (
              <p className="memory-load-message" role="status">
                Some photos couldn’t load. The available memories are shown above.
              </p>
            )}
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
