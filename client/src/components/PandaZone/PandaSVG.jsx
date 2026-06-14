import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

/**
 * PandaSVG — Duolingo-quality animated panda character.
 *
 * Features:
 *  ✦ Random blinking with realistic eyelid animation
 *  ✦ Subtle breathing (body scale pulses)
 *  ✦ Pupil movement / eye tracking effect on idle
 *  ✦ Lip-sync mouth (open/close cycles) while speaking
 *  ✦ Rich expression transitions with spring physics
 *  ✦ Floating particles per state (hearts, stars, zzz, sweat)
 *  ✦ Celebratory bounce + scale on happy
 *  ✦ Head tilt on listening
 *  ✦ Eye sparkle highlights
 *  ✦ Ear wiggle on surprised
 */
const PandaSVG = ({ expression = 'idle', isSpeaking = false }) => {
  const [blinkState, setBlinkState] = useState(0); // 0=open 1=half 2=closed
  const [breathScale, setBreathScale] = useState(1);
  const [mouthOpen, setMouthOpen] = useState(0);   // 0–1
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });
  const blinkTimer = useRef(null);
  const breathTimer = useRef(null);
  const mouthTimer = useRef(null);
  const pupilTimer = useRef(null);

  const isIdle = expression === 'idle';
  const isListening = expression === 'listening';
  const isThinking = expression === 'thinking';
  const isSpeakingExpr = expression === 'speaking' || isSpeaking;
  const isHappy = expression === 'happy';
  const isSurprised = expression === 'surprised';
  const isSleeping = expression === 'sleeping';
  const isPanic = expression === 'panic';

  // ─── Random blinking ───────────────────────────────────────────────────
  useEffect(() => {
    if (isSleeping) return; // eyes already closed
    const scheduleBlink = () => {
      const delay = 2500 + Math.random() * 4000;
      blinkTimer.current = setTimeout(() => {
        setBlinkState(1);           // half
        setTimeout(() => setBlinkState(2), 60);   // closed
        setTimeout(() => setBlinkState(1), 130);  // half again
        setTimeout(() => {
          setBlinkState(0);         // open
          scheduleBlink();
        }, 200);
      }, delay);
    };
    scheduleBlink();
    return () => clearTimeout(blinkTimer.current);
  }, [isSleeping]);

  // ─── Breathing ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isSleeping) return;
    let t = 0;
    breathTimer.current = setInterval(() => {
      t += 0.08;
      setBreathScale(1 + Math.sin(t) * 0.012);
    }, 50);
    return () => clearInterval(breathTimer.current);
  }, [isSleeping]);

  // ─── Mouth lip-sync ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSpeakingExpr) {
      setMouthOpen(0);
      clearInterval(mouthTimer.current);
      return;
    }
    const openValues = [0, 0.4, 0.9, 0.5, 1, 0.3, 0.8, 0.2, 0.6, 0];
    let i = 0;
    mouthTimer.current = setInterval(() => {
      setMouthOpen(openValues[i % openValues.length]);
      i++;
    }, 110);
    return () => clearInterval(mouthTimer.current);
  }, [isSpeakingExpr]);

  // ─── Pupil wander (idle only) ───────────────────────────────────────────
  useEffect(() => {
    if (!isIdle) {
      setPupilOffset({ x: 0, y: 0 });
      return;
    }
    const wander = () => {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 3;
      setPupilOffset({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      pupilTimer.current = setTimeout(wander, 1500 + Math.random() * 2000);
    };
    wander();
    return () => clearTimeout(pupilTimer.current);
  }, [isIdle]);

  // ─── Eye lid height based on blink state ───────────────────────────────
  const lidRy = { 0: 0, 1: 7, 2: 14 }[blinkState] ?? 0;

  // ─── Eye pupil (white highlight inside iris) ────────────────────────────
  const renderEye = (cx, cy, side) => {
    const irisColor = isSurprised ? '#1a1a1a' : '#1a1a1a';
    const irisRx = isSurprised ? 14 : isSleeping ? 12 : 11;
    const irisRy = isSurprised ? 15 : isSleeping ? 3 : 11;
    const px = cx + pupilOffset.x * (side === 'L' ? 1 : 1);
    const py = cy + pupilOffset.y;

    if (isHappy) {
      // U-shaped happy eyes (arc)
      const d = side === 'L'
        ? `M ${cx - 13} ${cy + 2} Q ${cx} ${cy - 10} ${cx + 13} ${cy + 2}`
        : `M ${cx - 13} ${cy + 2} Q ${cx} ${cy - 10} ${cx + 13} ${cy + 2}`;
      return (
        <g key={side}>
          <path d={d} stroke="#1a1a1a" strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>
      );
    }

    return (
      <g key={side}>
        {/* Iris */}
        <ellipse cx={cx} cy={cy} rx={irisRx} ry={irisRy} fill={irisColor} />
        {/* Pupil highlight (sparkle) */}
        {!isSleeping && (
          <>
            <ellipse
              cx={px + (side === 'L' ? 3 : 3)}
              cy={py - 3}
              rx={3.5}
              ry={3.5}
              fill="white"
              opacity={0.9}
            />
            <ellipse
              cx={px + (side === 'L' ? 7 : 7)}
              cy={py - 6}
              rx={1.5}
              ry={1.5}
              fill="white"
              opacity={0.6}
            />
          </>
        )}
        {/* Eyelid (blink) */}
        {lidRy > 0 && (
          <ellipse
            cx={cx}
            cy={cy - irisRy + lidRy - 0.5}
            rx={irisRx + 2}
            ry={lidRy}
            fill="#1a1a1a"
          />
        )}
        {/* Bottom blink cover */}
        {blinkState === 2 && (
          <ellipse cx={cx} cy={cy + 5} rx={irisRx + 2} ry={8} fill="#1a1a1a" />
        )}
      </g>
    );
  };

  // ─── Mouth ─────────────────────────────────────────────────────────────
  const renderMouth = () => {
    const open = mouthOpen;

    if (isSpeakingExpr) {
      const topY = 128;
      const ry = 5 + open * 12;
      return (
        <g>
          {/* Outer lips */}
          <ellipse cx="100" cy={topY + ry * 0.4} rx={10 + open * 4} ry={ry + 2} fill="#b91c1c" />
          {/* Inner mouth (dark) */}
          {open > 0.2 && (
            <ellipse cx="100" cy={topY + ry * 0.6} rx={7 + open * 3} ry={ry * 0.7} fill="#7f1d1d" />
          )}
          {/* Teeth flash when mouth opens wide */}
          {open > 0.6 && (
            <ellipse cx="100" cy={topY + 2} rx={6} ry={3} fill="white" />
          )}
          {/* Lip shine */}
          <ellipse cx="97" cy={topY - 2} rx={3} ry={1.5} fill="rgba(255,150,150,0.5)" />
        </g>
      );
    }

    if (isHappy) return (
      <g>
        <path d="M 80 126 Q 100 150 120 126" stroke="#b91c1c" strokeWidth="4" fill="none" strokeLinecap="round" />
        {/* Tongue peeking out */}
        <ellipse cx="100" cy="138" rx="7" ry="5" fill="#f87171" />
      </g>
    );

    if (isSurprised) return (
      <g>
        <ellipse cx="100" cy="132" rx="9" ry="13" fill="#b91c1c" />
        <ellipse cx="100" cy="128" rx="5" ry="3" fill="#7f1d1d" />
      </g>
    );

    if (isSleeping) return (
      <path d="M 90 128 Q 100 123 110 128" stroke="#b91c1c" strokeWidth="3" fill="none" strokeLinecap="round" />
    );

    if (isThinking) return (
      <path d="M 88 128 Q 104 134 112 126" stroke="#b91c1c" strokeWidth="3" fill="none" strokeLinecap="round" />
    );

    if (isListening) return (
      <g>
        <path d="M 85 127 Q 100 138 115 127" stroke="#b91c1c" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      </g>
    );

    // Default idle smile
    return (
      <path d="M 86 127 Q 100 140 114 127" stroke="#b91c1c" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    );
  };

  // ─── Eyebrows ───────────────────────────────────────────────────────────
  const renderEyebrows = () => {
    if (isSurprised) return (
      <>
        <path d="M 58 83 Q 75 73 91 80" stroke="#1a1a1a" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M 109 80 Q 125 73 142 83" stroke="#1a1a1a" strokeWidth="4" fill="none" strokeLinecap="round" />
      </>
    );
    if (isThinking) return (
      <>
        <path d="M 60 90 Q 75 84 90 89" stroke="#1a1a1a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M 110 87 Q 125 81 140 89" stroke="#1a1a1a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      </>
    );
    if (isListening) return (
      <>
        <path d="M 61 89 Q 75 84 89 88" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
      </>
    );
    if (isHappy) return (
      <>
        <path d="M 62 88 Q 75 82 88 87" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M 112 87 Q 125 82 138 88" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
      </>
    );
    return null;
  };

  // ─── Body animation ────────────────────────────────────────────────────
  const bodyAnimation = {
    idle:      { rotate: 0, y: 0, scale: 1 },
    listening: { rotate: [-6, 0, -6], y: 0, transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } },
    speaking:  { y: [0, -4, 0], transition: { duration: 0.25, repeat: Infinity, ease: 'easeInOut' } },
    happy:     { y: [0, -18, 0, -10, 0], scale: [1, 1.06, 1, 1.03, 1], transition: { duration: 0.55, repeat: Infinity, ease: 'easeOut' } },
    surprised: { y: [0, -22, 0], scale: [1, 1.1, 1], transition: { duration: 0.45, ease: [0.36, 0.07, 0.19, 0.97] } },
    sleeping:  { rotate: [0, 3, 0, -3, 0], y: [0, 3, 0], transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' } },
    thinking:  { rotate: [-2, 2, -2], y: [0, -2, 0], transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } },
    panic:     { scale: [1, 1.2, 0.9, 1.15, 0], opacity: [1, 0.9, 1, 0.7, 0], transition: { duration: 0.5, ease: 'easeIn' } },
  };

  const currentBodyAnim = bodyAnimation[expression] || bodyAnimation.idle;

  // ─── Ear animation (surprised = wiggle) ───────────────────────────────
  const earVariants = {
    surprised: {
      rotate: [-8, 8, -6, 6, 0],
      transition: { duration: 0.4, ease: 'easeOut' },
    },
    default: { rotate: 0 },
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        userSelect: 'none',
      }}
    >
      {/* ── Main SVG panda ────────────────────────────────────────────── */}
      <motion.svg
        viewBox="0 0 200 230"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '260px',
          maxHeight: '260px',
          filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.15))',
          overflow: 'visible',
        }}
        animate={currentBodyAnim}
      >
        {/* ── Ground shadow ─────────────────────────────────────────── */}
        <motion.ellipse
          cx="100" cy="222" rx="52" ry="7"
          fill="rgba(0,0,0,0.09)"
          animate={isHappy ? { scaleX: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.55, repeat: Infinity }}
        />

        {/* ── Body ─────────────────────────────────────────────────── */}
        <motion.g animate={{ scaleY: breathScale }} style={{ transformOrigin: '100px 175px' }}>
          {/* Body base */}
          <ellipse cx="100" cy="178" rx="54" ry="50" fill="#f8f8f8" />
          <ellipse cx="100" cy="178" rx="54" ry="50" fill="none" stroke="#e2e8f0" strokeWidth="1.5" />

          {/* Belly */}
          <ellipse cx="100" cy="185" rx="33" ry="32" fill="white" />

          {/* Belly button cute detail */}
          <ellipse cx="100" cy="200" rx="4" ry="3" fill="#f1f5f9" />

          {/* Arms */}
          <motion.ellipse
            cx="44" cy="172" rx="16" ry="24" fill="#1a1a1a"
            style={{ transformOrigin: '44px 155px' }}
            animate={
              isHappy
                ? { rotate: [-15, 15, -15], transition: { duration: 0.5, repeat: Infinity } }
                : isSpeakingExpr
                ? { rotate: [-5, 5, -5], transition: { duration: 0.3, repeat: Infinity } }
                : { rotate: -18 }
            }
          />
          <motion.ellipse
            cx="156" cy="172" rx="16" ry="24" fill="#1a1a1a"
            style={{ transformOrigin: '156px 155px' }}
            animate={
              isHappy
                ? { rotate: [15, -15, 15], transition: { duration: 0.5, repeat: Infinity } }
                : isSpeakingExpr
                ? { rotate: [5, -5, 5], transition: { duration: 0.3, repeat: Infinity } }
                : { rotate: 18 }
            }
          />

          {/* Paws (cute rounded ends) */}
          <ellipse cx="33" cy="188" rx="11" ry="9" fill="#1a1a1a" />
          <ellipse cx="167" cy="188" rx="11" ry="9" fill="#1a1a1a" />
          {/* Paw toe lines */}
          <line x1="27" y1="185" x2="30" y2="193" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="33" y1="183" x2="33" y2="192" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="39" y1="185" x2="36" y2="193" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="161" y1="185" x2="164" y2="193" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="167" y1="183" x2="167" y2="192" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="173" y1="185" x2="170" y2="193" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />

          {/* Legs */}
          <ellipse cx="74" cy="220" rx="19" ry="13" fill="#1a1a1a" />
          <ellipse cx="126" cy="220" rx="19" ry="13" fill="#1a1a1a" />
          {/* Foot toe lines */}
          <line x1="66" y1="218" x2="66" y2="226" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="74" y1="216" x2="74" y2="226" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="82" y1="218" x2="82" y2="226" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="118" y1="218" x2="118" y2="226" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="126" y1="216" x2="126" y2="226" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="134" y1="218" x2="134" y2="226" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />

          {/* Bamboo (idle / sleeping) */}
          {(isIdle || isSleeping || isListening) && (
            <g>
              <rect x="157" y="148" width="7" height="52" rx="3.5" fill="#4ade80" />
              <rect x="157" y="154" width="16" height="5" rx="2.5" fill="#86efac" />
              <rect x="157" y="168" width="16" height="5" rx="2.5" fill="#86efac" />
              <rect x="157" y="182" width="16" height="5" rx="2.5" fill="#86efac" />
              {/* Bamboo leaf */}
              <ellipse cx="173" cy="150" rx="9" ry="5" fill="#4ade80" transform="rotate(-30 173 150)" />
              <ellipse cx="165" cy="145" rx="8" ry="4" fill="#86efac" transform="rotate(15 165 145)" />
            </g>
          )}
        </motion.g>

        {/* ── Head (on top of body) ─────────────────────────────────── */}
        {/* Ears — behind head */}
        <motion.g
          variants={earVariants}
          animate={isSurprised ? 'surprised' : 'default'}
          style={{ transformOrigin: '100px 55px' }}
        >
          {/* Left ear */}
          <circle cx="46" cy="45" r="24" fill="#1a1a1a" />
          <circle cx="46" cy="45" r="14" fill="#2d2d2d" />
          <circle cx="46" cy="45" r="7" fill="#3d3d3d" />
          {/* Right ear */}
          <circle cx="154" cy="45" r="24" fill="#1a1a1a" />
          <circle cx="154" cy="45" r="14" fill="#2d2d2d" />
          <circle cx="154" cy="45" r="7" fill="#3d3d3d" />
        </motion.g>

        {/* Head circle */}
        <circle cx="100" cy="103" r="66" fill="white" />
        <circle cx="100" cy="103" r="66" fill="none" stroke="#e8ecf0" strokeWidth="2" />

        {/* Eye patches (large panda markings) */}
        <ellipse cx="72" cy="107" rx="24" ry="23" fill="#1a1a1a" />
        <ellipse cx="128" cy="107" rx="24" ry="23" fill="#1a1a1a" />

        {/* Eyes */}
        {renderEye(72, 107, 'L')}
        {renderEye(128, 107, 'R')}

        {/* Nose */}
        <ellipse cx="100" cy="123" rx="8" ry="6" fill="#1a1a1a" />
        <ellipse cx="98" cy="120" rx="3" ry="2.5" fill="rgba(255,255,255,0.4)" />
        {/* Nose-to-mouth line */}
        <line x1="100" y1="129" x2="100" y2="126" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" />

        {/* Mouth */}
        {renderMouth()}

        {/* Eyebrows */}
        <AnimatePresence mode="wait">
          <motion.g
            key={expression}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {renderEyebrows()}
          </motion.g>
        </AnimatePresence>

        {/* Cheeks */}
        <AnimatePresence>
          {(isHappy || isSpeakingExpr) && (
            <>
              <motion.ellipse
                cx="53" cy="122" rx="16" ry="11"
                fill="rgba(251, 182, 206, 0.6)"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ type: 'spring', stiffness: 300 }}
              />
              <motion.ellipse
                cx="147" cy="122" rx="16" ry="11"
                fill="rgba(251, 182, 206, 0.6)"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ type: 'spring', stiffness: 300 }}
              />
            </>
          )}
        </AnimatePresence>

        {/* Stars on cheeks (happy) */}
        <AnimatePresence>
          {isHappy && (
            <>
              <motion.text
                x="42" y="115" fontSize="12" textAnchor="middle"
                initial={{ opacity: 0, scale: 0, rotate: -30 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0], rotate: [0, 20, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
              >✨</motion.text>
              <motion.text
                x="158" y="115" fontSize="12" textAnchor="middle"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0], rotate: [0, -20, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
              >✨</motion.text>
            </>
          )}
        </AnimatePresence>

        {/* Sweat drop (thinking) */}
        <AnimatePresence>
          {isThinking && (
            <motion.g
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <ellipse cx="147" cy="68" rx="5.5" ry="9" fill="#93c5fd" />
              <polygon points="142,70 152,70 147,83" fill="#93c5fd" />
              <ellipse cx="146" cy="65" rx="2" ry="2.5" fill="rgba(255,255,255,0.5)" />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Surprised sweat */}
        <AnimatePresence>
          {isSurprised && (
            <>
              <motion.g
                initial={{ opacity: 0, x: 5 }}
                animate={{ opacity: [0, 1, 0], x: [5, 15, 25], y: [0, 5, 15] }}
                transition={{ duration: 0.6, repeat: 2 }}
              >
                <ellipse cx="152" cy="78" rx="4" ry="6" fill="#bae6fd" />
                <polygon points="148,80 156,80 152,91" fill="#bae6fd" />
              </motion.g>
            </>
          )}
        </AnimatePresence>
      </motion.svg>

      {/* ── Floating particles (outside SVG for z-index) ─────────────── */}

      {/* Happy: hearts burst */}
      <AnimatePresence>
        {isHappy && (
          <>
            {['❤️', '💖', '✨', '⭐', '💕'].map((emoji, i) => (
              <motion.span
                key={`h-${i}`}
                style={{
                  position: 'absolute',
                  fontSize: i % 2 === 0 ? '22px' : '16px',
                  pointerEvents: 'none',
                  left: `${15 + i * 17}%`,
                  bottom: '55%',
                }}
                initial={{ opacity: 1, y: 0, x: 0, scale: 0.5 }}
                animate={{
                  opacity: [0.8, 1, 0],
                  y: [-10, -50 - i * 12],
                  x: [0, (i % 2 === 0 ? 1 : -1) * (10 + i * 4)],
                  scale: [0.5, 1.2, 0.8],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  delay: i * 0.12,
                  duration: 1.6,
                  ease: 'easeOut',
                  repeat: Infinity,
                  repeatDelay: 0.4,
                }}
              >
                {emoji}
              </motion.span>
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Speaking: music notes */}
      <AnimatePresence>
        {isSpeakingExpr && (
          <>
            {['🎵', '🎶', '♪'].map((note, i) => (
              <motion.span
                key={`n-${i}`}
                style={{
                  position: 'absolute',
                  fontSize: '18px',
                  pointerEvents: 'none',
                  right: `${8 + i * 10}%`,
                  top: `${20 + i * 8}%`,
                }}
                initial={{ opacity: 0, y: 0, x: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  y: [-5, -25 - i * 8],
                  x: [0, 8 + i * 4],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  delay: i * 0.3,
                  duration: 1.2,
                  ease: 'easeOut',
                  repeat: Infinity,
                  repeatDelay: 0.8,
                }}
              >
                {note}
              </motion.span>
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Thinking: dots */}
      <AnimatePresence>
        {isThinking && (
          <motion.div
            style={{
              position: 'absolute',
              top: '8%',
              right: '10%',
              fontSize: '32px',
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: [0.8, 1.1, 0.9, 1], rotate: [0, 5, -5, 0] }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ scale: { duration: 1.5, repeat: Infinity }, rotate: { duration: 2, repeat: Infinity } }}
          >
            💭
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sleeping: Zzz */}
      <AnimatePresence>
        {isSleeping && (
          <motion.div
            style={{
              position: 'absolute',
              top: '5%',
              right: '12%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {['z', 'z', 'Z'].map((z, i) => (
              <motion.span
                key={i}
                style={{
                  color: '#94a3b8',
                  fontWeight: 900,
                  fontSize: `${13 + i * 5}px`,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  y: [0, -12 - i * 6],
                  x: [0, 4 + i * 3],
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                {z}
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Surprised: exclamation */}
      <AnimatePresence>
        {isSurprised && (
          <motion.div
            style={{
              position: 'absolute',
              top: '0%',
              right: '15%',
              fontSize: '28px',
            }}
            initial={{ opacity: 0, scale: 0, rotate: -30 }}
            animate={{ opacity: 1, scale: [0, 1.5, 1], rotate: [-30, 10, 0] }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          >
            ❗
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panic: smoke poof */}
      <AnimatePresence>
        {isPanic && (
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '80px',
              pointerEvents: 'none',
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 2, 2.5, 3.5] }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            💨
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PandaSVG;
