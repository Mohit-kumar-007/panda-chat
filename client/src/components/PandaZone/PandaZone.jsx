import { useCallback, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PandaSVG from './PandaSVG';

/**
 * PandaZone — The panda character panel.
 * Duolingo-inspired: rich ambient, speech bubble, dynamic background.
 */

// Phrases the panda "says" per expression
const PANDA_PHRASES = {
  idle:      ['🌸 준비됐어요!', '🐼 안녕하세요!', '📚 배울까요?', '✨ 한국어!'],
  listening: ['👂 듣고 있어요~', '🎵 계속하세요!', '💬 들려요...', '🐼 말해요!'],
  thinking:  ['🤔 생각 중...', '💭 흠...', '🧠 번역 중...'],
  speaking:  ['🔊 들어보세요!', '🎵 한국어예요!', '👂 따라 해요!'],
  happy:     ['🎉 잘했어요!', '⭐ 최고예요!', '💖 훌륭해요!', '🥳 대박!'],
  surprised: ['😲 오!', '❗ 와우!', '😱 정말요?'],
  sleeping:  ['😴 쉬는 중...', '💤 잠깐요...', 'Zzz...'],
  panic:     ['🚨 수업 중!', '📖 공부해요!'],
};

const PandaZone = ({
  expression = 'idle',
  isSpeaking,
  ttsEnabled,
  onToggleTTS,
  onPanicTrigger,
  isTypingIndicator,
  friendConnected,
}) => {
  const lastTapRef = useRef(0);
  const [phrase, setPhrase] = useState('🌸 준비됐어요!');
  const [showPhrase, setShowPhrase] = useState(false);
  const phraseTimer = useRef(null);

  // ─── Double-tap → panic ────────────────────────────────────────────
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      onPanicTrigger?.();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [onPanicTrigger]);

  // ─── Update speech bubble when expression changes ──────────────────
  useEffect(() => {
    const phrases = PANDA_PHRASES[expression] || PANDA_PHRASES.idle;
    const pick = phrases[Math.floor(Math.random() * phrases.length)];
    setPhrase(pick);
    setShowPhrase(true);

    clearTimeout(phraseTimer.current);
    phraseTimer.current = setTimeout(() => setShowPhrase(false), 3500);

    return () => clearTimeout(phraseTimer.current);
  }, [expression]);

  // Background gradient per expression
  const bgGradient = {
    idle:      'radial-gradient(ellipse at 50% 20%, #fdf4ff 0%, #fef9f0 60%, #fdf0ff 100%)',
    listening: 'radial-gradient(ellipse at 50% 20%, #ecfdf5 0%, #f0fdf4 60%, #fef9f0 100%)',
    thinking:  'radial-gradient(ellipse at 50% 20%, #eff6ff 0%, #f0f9ff 60%, #faf5ff 100%)',
    speaking:  'radial-gradient(ellipse at 50% 20%, #fff7ed 0%, #fef3c7 40%, #fff9f0 100%)',
    happy:     'radial-gradient(ellipse at 50% 20%, #fef9c3 0%, #fde68a 20%, #fdf4ff 100%)',
    surprised: 'radial-gradient(ellipse at 50% 20%, #fff1f2 0%, #ffe4e6 40%, #fdf4ff 100%)',
    sleeping:  'radial-gradient(ellipse at 50% 20%, #f0f9ff 0%, #e0f2fe 60%, #f8fafc 100%)',
    panic:     'radial-gradient(ellipse at 50% 20%, #fff1f2 0%, #fecdd3 40%, #fff9f0 100%)',
  }[expression] || 'radial-gradient(ellipse at 50% 20%, #fdf4ff 0%, #fef9f0 100%)';

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: bgGradient,
        transition: 'background 0.8s ease',
        overflow: 'hidden',
      }}
    >
      {/* ── Ambient floating petals ─────────────────────────────────── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              left: `${(i * 8.5) % 100}%`,
              top: '-20px',
              width: `${7 + (i % 4) * 3}px`,
              height: `${7 + (i % 4) * 3}px`,
              borderRadius: '50% 0 50% 0',
              background: i % 3 === 0
                ? 'rgba(251, 207, 232, 0.55)'
                : i % 3 === 1
                ? 'rgba(254, 240, 138, 0.45)'
                : 'rgba(196, 181, 253, 0.45)',
              rotate: `${i * 30}deg`,
            }}
            animate={{
              y: ['0px', '120vh'],
              rotate: [i * 30, i * 30 + 180],
              opacity: [0, 0.8, 0.8, 0],
            }}
            transition={{
              duration: 5 + (i % 4),
              delay: (i * 0.55) % 5,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      {/* ── Top controls ────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 14px',
          zIndex: 10,
        }}
      >
        {/* Friend status pill */}
        <motion.div
          animate={friendConnected ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 700,
            background: friendConnected
              ? 'rgba(209, 250, 229, 0.92)'
              : 'rgba(241, 245, 249, 0.92)',
            color: friendConnected ? '#065f46' : '#64748b',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <motion.div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: friendConnected ? '#10b981' : '#cbd5e1',
            }}
            animate={friendConnected ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          {friendConnected ? '友達 (Friend)' : 'Waiting...'}
        </motion.div>

        {/* TTS toggle */}
        <motion.button
          id="tts-toggle-btn"
          onClick={onToggleTTS}
          whileHover={{ scale: 1.15, rotate: 10 }}
          whileTap={{ scale: 0.88 }}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(8px)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
          }}
          aria-label={ttsEnabled ? 'Mute Korean TTS' : 'Enable Korean TTS'}
        >
          {ttsEnabled ? '🔊' : '🔇'}
        </motion.button>
      </div>

      {/* ── Speech bubble ───────────────────────────────────────────── */}
      <div style={{ position: 'absolute', top: '56px', zIndex: 10, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <AnimatePresence mode="wait">
          {showPhrase && (
            <motion.div
              key={phrase}
              initial={{ opacity: 0, y: 8, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.85 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              style={{
                background: 'white',
                borderRadius: '20px',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#334155',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                border: '2px solid rgba(226,232,240,0.8)',
                maxWidth: '85%',
                textAlign: 'center',
                position: 'relative',
              }}
            >
              {phrase}
              {/* Speech bubble tail */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '-10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: '10px solid white',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Panda character ─────────────────────────────────────────── */}
      <motion.div
        onClick={handleTap}
        role="button"
        aria-label="Tap twice to trigger panic mode"
        id="panda-mascot"
        whileTap={{ scale: 0.92 }}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          paddingInline: '16px',
          cursor: 'pointer',
          touchAction: 'manipulation',
          marginTop: '60px',
        }}
      >
        <PandaSVG expression={expression || 'idle'} isSpeaking={isSpeaking} />
      </motion.div>

      {/* ── Typing indicator ────────────────────────────────────────── */}
      <AnimatePresence>
        {isTypingIndicator && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              background: 'rgba(255,255,255,0.8)',
              borderRadius: '999px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#475569',
              backdropFilter: 'blur(8px)',
              marginBottom: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <span>🐼 is listening</span>
            <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
              {[0, 0.15, 0.3].map((d, i) => (
                <motion.div
                  key={i}
                  style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#94a3b8' }}
                  animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.6, delay: d, repeat: Infinity }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Branding ─────────────────────────────────────────────────── */}
      <div style={{ paddingBottom: '10px', textAlign: 'center', zIndex: 5 }}>
        <motion.p
          style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.12em' }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          🌸 PANDA KOREAN · 한국어
        </motion.p>
      </div>

      {/* ── Expression label (subtle) ─────────────────────────────── */}
      <AnimatePresence>
        {expression !== 'idle' && (
          <motion.div
            key={expression}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              bottom: '30px',
              right: '12px',
              fontSize: '10px',
              color: '#94a3b8',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            {expression}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PandaZone;
