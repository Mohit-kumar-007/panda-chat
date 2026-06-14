import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import PandaSVG from '../components/PandaZone/PandaSVG';
import { isValidRoomCode, generateRoomCode } from '../utils/roomCode';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

/**
 * LandingPage — Entry screen with room code input.
 * Users can create a new room or join an existing one.
 */
const LandingPage = () => {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('join'); // 'join' | 'created'
  const [createdCode, setCreatedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [pandaExpression, setPandaExpression] = useState('idle');

  const handleCodeChange = (e) => {
    // Strip spaces, force uppercase, max 6 chars
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setRoomCode(val);
    setError('');
  };

  const handleJoin = useCallback(async () => {
    const code = roomCode.trim().toUpperCase();
    if (!isValidRoomCode(code)) {
      setError('Please enter a valid 6-character room code (letters and numbers)');
      setPandaExpression('surprised');
      setTimeout(() => setPandaExpression('idle'), 2000);
      return;
    }

    setIsLoading(true);
    setError('');
    setPandaExpression('thinking');

    try {
      const res = await axios.get(`${SERVER_URL}/api/room/${code}/exists`, {
        timeout: 5000,
      });
      if (!res.data.exists) {
        setError('Room not found. Check your code or generate a new one.');
        setPandaExpression('surprised');
        setTimeout(() => setPandaExpression('idle'), 2000);
      } else if (res.data.full) {
        setError('This room is full (max 2 users). Ask your friend for a new code.');
        setPandaExpression('surprised');
        setTimeout(() => setPandaExpression('idle'), 2000);
      } else {
        setPandaExpression('happy');
        setTimeout(() => navigate(`/chat/${code}`), 400);
      }
    } catch {
      // Server offline — navigate anyway; socket will report errors
      setPandaExpression('happy');
      setTimeout(() => navigate(`/chat/${code}`), 400);
    } finally {
      setIsLoading(false);
    }
  }, [roomCode, navigate]);

  const handleCreate = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setPandaExpression('thinking');

    try {
      const res = await axios.post(`${SERVER_URL}/api/room/create`, {}, { timeout: 5000 });
      const code = res.data.roomCode;
      setCreatedCode(code);
      setMode('created');
      setPandaExpression('happy');
    } catch {
      // Fallback: client-side code, navigate directly
      const code = generateRoomCode();
      setCreatedCode(code);
      setMode('created');
      setPandaExpression('happy');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const handleCopyCode = useCallback(() => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(createdCode).catch(() => {});
    } else {
      // Fallback for non-HTTPS
      const el = document.createElement('textarea');
      el.value = createdCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [createdCode]);

  const handleEnterRoom = useCallback(() => {
    navigate(`/chat/${createdCode}`);
  }, [createdCode, navigate]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
  };

  // Display code with space in middle: "ABC DEF"
  const displayCode = roomCode
    ? `${roomCode.slice(0, 3)}${roomCode.length > 3 ? ' ' + roomCode.slice(3) : ''}`
    : '';

  return (
    <div
      className="viewport-height blossom-bg overflow-y-auto"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        paddingTop: 'calc(24px + var(--safe-top))',
        paddingBottom: 'calc(24px + var(--safe-bottom))',
      }}
    >
      {/* Falling blossom petals */}
      <div className="blossom-pattern" aria-hidden="true">
        {[...Array(14)].map((_, i) => (
          <div
            key={i}
            className="blossom-petal"
            style={{
              left: `${(i * 7.5) % 100}%`,
              top: '-20px',
              animationDuration: `${5 + (i % 4)}s`,
              animationDelay: `${(i * 0.55) % 4}s`,
              width: `${8 + (i % 4) * 3}px`,
              height: `${8 + (i % 4) * 3}px`,
            }}
          />
        ))}
      </div>

      <motion.div
        className="relative z-10 w-full max-w-sm"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Panda mascot */}
        <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
          <div style={{ width: '144px', height: '144px' }}>
            <PandaSVG expression={pandaExpression} />
          </div>
        </motion.div>

        {/* App title */}
        <motion.div variants={itemVariants} style={{ textAlign: 'center', marginBottom: '8px' }}>
          <h1
            style={{
              fontSize: '36px',
              fontWeight: 900,
              color: '#1e293b',
              letterSpacing: '-0.02em',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            🐼 Panda Korean
          </h1>
          <p style={{ color: '#64748b', fontWeight: 600, marginTop: '6px', fontSize: '14px' }}>
            Your personal Korean tutor — always learning!
          </p>
        </motion.div>

        {/* Category tags */}
        <motion.div
          variants={itemVariants}
          style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' }}
        >
          {['Greetings 👋', 'Food 🍜', 'Numbers 🔢', 'Colors 🎨'].map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#64748b',
                background: 'rgba(255,255,255,0.85)',
                padding: '4px 10px',
                borderRadius: '999px',
                border: '1px solid #f1f5f9',
              }}
            >
              {tag}
            </span>
          ))}
        </motion.div>

        {/* Main card */}
        <motion.div variants={itemVariants} className="glass-card" style={{ padding: '24px', marginBottom: '16px' }}>
          <AnimatePresence mode="wait">

            {/* JOIN mode */}
            {mode === 'join' && (
              <motion.div
                key="join"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <p style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
                  Enter Room Code
                </p>
                <input
                  id="room-code-input"
                  type="text"
                  value={displayCode}
                  onChange={handleCodeChange}
                  placeholder="ABC 123"
                  className="chat-input room-code-input"
                  style={{ marginBottom: '16px', color: '#1e293b' }}
                  maxLength={7}
                  autoCapitalize="characters"
                  autoComplete="off"
                  autoCorrect="off"
                  aria-label="Enter 6-character room code"
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                />

                <AnimatePresence>
                  {error && (
                    <motion.p
                      style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center', marginBottom: '12px', fontWeight: 600 }}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      ⚠️ {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <button
                  id="join-room-btn"
                  onClick={handleJoin}
                  disabled={isLoading || roomCode.length < 6}
                  className="btn-accent"
                  style={{ width: '100%', padding: '14px', fontSize: '16px', borderRadius: '16px' }}
                >
                  {isLoading ? '🐾 Checking room...' : '📚 Join Lesson'}
                </button>
              </motion.div>
            )}

            {/* CREATED mode */}
            {mode === 'created' && (
              <motion.div
                key="created"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: 'center' }}
              >
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎉</div>
                <p style={{ fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Room Created!</p>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>Share this code with your friend:</p>

                {/* Code display */}
                <div
                  style={{
                    background: 'var(--color-panda-bg)',
                    borderRadius: '16px',
                    padding: '16px',
                    marginBottom: '16px',
                  }}
                >
                  <p
                    className="room-code-input"
                    style={{ fontSize: '36px', color: '#1e293b', letterSpacing: '12px', margin: 0 }}
                  >
                    {createdCode.slice(0, 3)}&nbsp;{createdCode.slice(3)}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <button
                    onClick={handleCopyCode}
                    id="copy-code-btn"
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '16px',
                      fontWeight: 700,
                      border: '2px solid #e2e8f0',
                      background: 'white',
                      color: '#475569',
                      fontSize: '14px',
                      cursor: 'pointer',
                      fontFamily: "'Nunito', sans-serif",
                    }}
                  >
                    {copied ? '✅ Copied!' : '📋 Copy Code'}
                  </button>
                  <button
                    onClick={handleEnterRoom}
                    id="enter-room-btn"
                    className="btn-accent"
                    style={{ flex: 1, padding: '12px', borderRadius: '16px', fontSize: '14px' }}
                  >
                    Enter Room →
                  </button>
                </div>

                <button
                  onClick={() => { setMode('join'); setCreatedCode(''); setPandaExpression('idle'); }}
                  style={{ color: '#94a3b8', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Nunito', sans-serif" }}
                >
                  ← Back
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Create room link */}
        {mode === 'join' && (
          <motion.div variants={itemVariants} style={{ textAlign: 'center' }}>
            <button
              id="create-room-btn"
              onClick={handleCreate}
              disabled={isLoading}
              style={{
                color: 'var(--color-accent)',
                fontWeight: 700,
                fontSize: '14px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Nunito', sans-serif",
              }}
            >
              New here? Generate a code →
            </button>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div variants={itemVariants} style={{ textAlign: 'center', marginTop: '32px' }}>
          <p style={{ color: '#cbd5e1', fontSize: '11px' }}>
            🌸 Learn Korean · One message at a time · 한국어 배우기
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LandingPage;
