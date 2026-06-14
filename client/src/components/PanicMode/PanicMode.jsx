import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PandaSVG from '../PandaZone/PandaSVG';
import useTTS from '../../hooks/useTTS';

/**
 * PanicMode — Full-screen fake Korean lesson overlay.
 * Triggered by double-tap on panda or Esc×2.
 * Shows real Korean flashcards from vocab JSON.
 *
 * Fixes:
 *  - TTS only fires after a user gesture (browser autoplay policy)
 *  - "Listen Again" now reliably re-speaks
 *  - Category tag shown from vocab data
 *  - Proper loading state while vocab loads
 */
const PanicMode = ({ isActive, onExit }) => {
  const [allWords, setAllWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [pandaExpression, setPandaExpression] = useState('idle');
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { speak, stop, isSpeaking } = useTTS();
  const lastTapRef = useRef(0);
  const totalCards = 10;

  // ─── Load vocab on mount ──────────────────────────────────────────────────
  useEffect(() => {
    fetch('/vocab/korean_vocab.json')
      .then((r) => r.json())
      .then((data) => {
        const words = data.categories.flatMap((c) =>
          c.words.map((w) => ({ ...w, category: c.name, emoji: c.emoji }))
        );
        // Shuffle
        const shuffled = [...words].sort(() => Math.random() - 0.5);
        setAllWords(shuffled);
        setIsLoading(false);
      })
      .catch((e) => {
        console.error('Vocab load error:', e);
        setIsLoading(false);
      });
  }, []);

  const currentWord = allWords[currentIndex] || {
    korean: '안녕하세요',
    romanization: 'an-nyeong-ha-se-yo',
    english: 'Hello / Good day',
    category: 'Greetings',
    emoji: '👋',
  };

  // ─── Speak word ───────────────────────────────────────────────────────────
  const speakCurrentWord = useCallback(() => {
    setPandaExpression('speaking');
    speak(currentWord.korean, {
      onStart: () => setPandaExpression('speaking'),
      onEnd: () => setPandaExpression('idle'),
    });
  }, [currentWord.korean, speak]);

  // Auto-speak when panic mode activates (only after user opened it — counts as gesture)
  useEffect(() => {
    if (!isActive || isLoading) return;
    // Small delay to let the animation settle
    const t = setTimeout(() => {
      speakCurrentWord();
      setHasUserInteracted(true);
    }, 600);
    return () => clearTimeout(t);
  }, [isActive, isLoading]);

  // Auto-speak when index changes (user navigated — always a gesture)
  useEffect(() => {
    if (!isActive || !hasUserInteracted || isLoading) return;
    speakCurrentWord();
  }, [currentIndex]);

  // Reset state when panic closes
  useEffect(() => {
    if (!isActive) {
      stop();
      setHasUserInteracted(false);
      setPandaExpression('idle');
    }
  }, [isActive, stop]);

  // ─── Navigation ───────────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    setHasUserInteracted(true);
    setCurrentIndex((i) => (i + 1) % Math.max(allWords.length, 1));
    setProgress((p) => Math.min(p + 1, totalCards - 1));
  }, [allWords.length]);

  const goPrev = useCallback(() => {
    setHasUserInteracted(true);
    setCurrentIndex((i) => Math.max(0, i - 1));
    setProgress((p) => Math.max(0, p - 1));
  }, []);

  const handleListenAgain = useCallback((e) => {
    e.stopPropagation();
    setHasUserInteracted(true);
    speakCurrentWord();
  }, [speakCurrentWord]);

  // ─── Exit handlers ────────────────────────────────────────────────────────

  // Double-tap panda to exit
  const handlePandaTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      onExit?.();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      // Single tap = speak
      setHasUserInteracted(true);
      speakCurrentWord();
    }
  }, [onExit, speakCurrentWord]);

  // Esc×2 exit
  useEffect(() => {
    if (!isActive) return;
    let lastEsc = 0;
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        const now = Date.now();
        if (now - lastEsc < 500) {
          onExit?.();
          lastEsc = 0;
        } else {
          lastEsc = now;
        }
      }
      // Arrow keys for navigation
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isActive, onExit, goNext, goPrev]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="panic-overlay"
          style={{
            display: 'flex',
            flexDirection: 'column',
            paddingTop: 'var(--safe-top)',
            paddingBottom: 'var(--safe-bottom)',
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
          }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 35 }}
        >
          {/* ── Header ──────────────────────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#334155', margin: 0 }}>
                🐼 Panda Korean
              </h1>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0' }}>
                Today's Lesson · 오늘의 수업
              </p>
            </div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#059669',
                background: '#ecfdf5',
                padding: '6px 12px',
                borderRadius: '999px',
              }}
            >
              ● LIVE
            </div>
          </div>

          {/* ── Panda teacher ────────────────────────────────────────── */}
          <div
            onClick={handlePandaTap}
            role="button"
            aria-label="Tap to hear, double-tap to exit lesson"
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '16px 0 8px',
              cursor: 'pointer',
            }}
          >
            <div style={{ width: '128px', height: '128px' }}>
              <PandaSVG expression={pandaExpression} isSpeaking={isSpeaking} />
            </div>
          </div>

          <p
            style={{
              textAlign: 'center',
              fontSize: '11px',
              color: '#cbd5e1',
              margin: '0 0 4px',
            }}
          >
            Tap panda to hear · double-tap to return
          </p>

          {/* ── Main flashcard ───────────────────────────────────────── */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 24px',
            }}
          >
            {isLoading ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🐼</div>
                <p style={{ color: '#94a3b8', fontWeight: 600 }}>Loading words...</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  style={{ width: '100%', maxWidth: '380px' }}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.22 }}
                >
                  {/* Category tag */}
                  <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {currentWord.emoji} {currentWord.category || 'Word of the Day'}
                    </span>
                  </div>

                  {/* Word card */}
                  <div
                    style={{
                      background: 'white',
                      borderRadius: '24px',
                      padding: '32px 24px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                      border: '1px solid #f1f5f9',
                      textAlign: 'center',
                    }}
                  >
                    <p
                      className="font-korean"
                      style={{
                        fontSize: '52px',
                        fontWeight: 800,
                        color: 'var(--color-korean)',
                        marginBottom: '12px',
                        lineHeight: 1.2,
                      }}
                    >
                      {currentWord.korean}
                    </p>
                    <p style={{ color: '#64748b', fontSize: '17px', marginBottom: '8px', fontWeight: 600 }}>
                      {currentWord.romanization}
                    </p>
                    <p style={{ color: '#1e293b', fontSize: '20px', fontWeight: 700 }}>
                      {currentWord.english}
                    </p>
                  </div>

                  {/* Listen Again */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button
                      onClick={handleListenAgain}
                      id="listen-again-btn"
                      className="btn-accent"
                      style={{
                        flex: 1,
                        padding: '14px',
                        fontSize: '15px',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      {isSpeaking ? (
                        <>
                          <span style={{ animation: 'pulse 0.6s infinite' }}>🔊</span>
                          Speaking...
                        </>
                      ) : (
                        <>🔊 Listen Again</>
                      )}
                    </button>
                  </div>

                  {/* Prev / Next navigation */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                    <button
                      onClick={goPrev}
                      disabled={currentIndex === 0}
                      id="prev-word-btn"
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '16px',
                        fontWeight: 700,
                        fontSize: '14px',
                        border: '2px solid #e2e8f0',
                        background: 'white',
                        color: '#475569',
                        cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                        opacity: currentIndex === 0 ? 0.35 : 1,
                        fontFamily: "'Nunito', sans-serif",
                      }}
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={goNext}
                      id="next-word-btn"
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '16px',
                        fontWeight: 700,
                        fontSize: '14px',
                        background: 'var(--color-korean)',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: "'Nunito', sans-serif",
                      }}
                    >
                      Next →
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* ── Progress bar ─────────────────────────────────────────── */}
          <div style={{ padding: '0 24px 20px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#94a3b8',
                fontWeight: 600,
                marginBottom: '8px',
              }}
            >
              <span>Progress</span>
              <span>{Math.min(progress + 1, totalCards)} / {totalCards}</span>
            </div>
            <div
              style={{
                height: '10px',
                background: '#f1f5f9',
                borderRadius: '999px',
                overflow: 'hidden',
              }}
            >
              <motion.div
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #FF6B6B, #FF8E53)',
                  borderRadius: '999px',
                }}
                animate={{ width: `${((progress + 1) / totalCards) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PanicMode;
