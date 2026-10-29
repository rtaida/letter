import { useEffect, useState } from "react";

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

  function removeMemoryPhoto(src) {
    const remaining = loadedMemoryPhotos.filter((photo) => photo.src !== src);
    setLoadedMemoryPhotos(remaining);
    setMemoryIndex((index) => (remaining.length ? index % remaining.length : 0));
    setMemoryLoadFailed(true);
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
                  setPage("thank-you");
                  setAcceptClicks(0);
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

        {page === "thank-you" && (
          <section className="message-panel" aria-labelledby="thank-you-title">
            <div className="illustration-heart" aria-hidden="true">♥</div>
            <p className="eyebrow">A MOMENT TO KEEP</p>
            <h1 id="thank-you-title">Thank you, Baby Jelay.</h1>
            <p className="intro-copy">
              Thank you for sharing this moment. I’ll keep working on my apology.
            </p>
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
