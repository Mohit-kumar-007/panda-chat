import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PandaZone from '../components/PandaZone/PandaZone';
import ChatZone from '../components/ChatZone/ChatZone';
import PanicMode from '../components/PanicMode/PanicMode';
import LessonPopup from '../components/LessonPopup/LessonPopup';
import useSocket from '../hooks/useSocket';
import useTTS from '../hooks/useTTS';

const INACTIVITY_SLEEP_MS = 5 * 60 * 1000; // 5 minutes

/**
 * ChatPage — Main chat screen (PandaZone + ChatZone).
 * Manages all state: messages, expressions, socket events, panic mode.
 */
const ChatPage = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [expression, setExpression] = useState('idle');
  const [isTypingIndicator, setIsTypingIndicator] = useState(false);
  const [friendConnected, setFriendConnected] = useState(false);
  const [isPanicMode, setIsPanicMode] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Use refs for timers to avoid stale closures
  const typingTimerRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const expressionTimerRef = useRef(null);

  // mySocketIdRef — always holds our own socket ID for use inside callbacks
  // (mySocketId state is the reactive version for rendering)
  const mySocketIdRef = useRef(null);

  const { speak, isSpeaking, ttsEnabled, toggleTTS } = useTTS();

  // Reset inactivity timer — uses ref, no stale closure
  const resetInactivity = useCallback(() => {
    clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      setExpression('sleeping');
    }, INACTIVITY_SLEEP_MS);
  }, []);

  // Set expression temporarily then revert to idle
  const setExpressionFor = useCallback((expr, durationMs = 3000) => {
    setExpression(expr);
    clearTimeout(expressionTimerRef.current);
    expressionTimerRef.current = setTimeout(() => {
      setExpression('idle');
    }, durationMs);
  }, []);

  // ─── Socket handlers ──────────────────────────────────────────────────────

  const handleRoomJoined = useCallback(({ success, history }) => {
    if (!success) return;
    setIsConnected(true);
    if (history && history.length > 0) {
      setMessages(history);
    }
    resetInactivity();
    setExpressionFor('happy', 1500);
  }, [resetInactivity, setExpressionFor]);

  const handleRoomFull = useCallback(({ error }) => {
    alert(error || 'Room is occupied. Only 2 users allowed per room.');
    navigate('/');
  }, [navigate]);

  const handleRoomNotFound = useCallback(({ error }) => {
    alert(error || 'Room not found. Please check your room code.');
    navigate('/');
  }, [navigate]);

  const handleMessage = useCallback((msg) => {
    setMessages((prev) => {
      if (prev.find((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
    resetInactivity();

    // Use the ref so this callback never has a stale socket ID
    const isFromFriend = msg.senderId !== mySocketIdRef.current;

    if (isFromFriend) {
      // Only speak if korean field actually contains Hangul characters
      const hasHangul = (str) => /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/.test(str || '');

      let textToSpeak;
      if (hasHangul(msg.korean)) {
        // ✅ Server gave us real Korean — speak it
        textToSpeak = msg.korean;
      } else {
        // ⚠️ No Korean text available (translation pending or failed)
        textToSpeak = '새 메시지가 왔어요'; // "A new message arrived"
      }

      const speakDuration = Math.max(2000, textToSpeak.length * 180 + 800);
      setExpressionFor('speaking', speakDuration);
      speak(textToSpeak, { onEnd: () => setExpression('idle') });
    } else {
      // Own message sent
      setExpressionFor('happy', 1500);
    }
  // speak is stable (no deps) — don't include it
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setExpressionFor, resetInactivity]);

  const handleUserTyping = useCallback(({ isTyping }) => {
    setIsTypingIndicator(isTyping);
    if (isTyping) {
      setExpression('listening');
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        setIsTypingIndicator(false);
        setExpression('idle');
      }, 3000);
    } else {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        setIsTypingIndicator(false);
        setExpression('idle');
      }, 2000);
    }
  }, []);

  const handleReaction = useCallback(({ messageId, sticker }) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, reactions: [...(m.reactions || []), sticker] }
          : m
      )
    );
    setExpressionFor('happy', 2000);
  }, [setExpressionFor]);

  const handleUserDisconnected = useCallback(() => {
    setFriendConnected(false);
    setExpressionFor('surprised', 2000);
  }, [setExpressionFor]);

  const handleUserReconnected = useCallback(() => {
    setIsConnected(true);
    setFriendConnected(true);
    setExpressionFor('happy', 1500);
  }, [setExpressionFor]);

  const {
    mySocketId,
    sendMessage,
    sendTypingStart,
    sendTypingStop,
    sendReaction,
    leaveRoom,
  } = useSocket({
    roomCode,
    onMessage: handleMessage,
    onRoomJoined: handleRoomJoined,
    onRoomFull: handleRoomFull,
    onRoomNotFound: handleRoomNotFound,
    onUserTyping: handleUserTyping,
    onReaction: handleReaction,
    onUserDisconnected: handleUserDisconnected,
    onUserReconnected: handleUserReconnected,
  });

  // Keep ref in sync with reactive state so callbacks always have latest ID
  useEffect(() => {
    if (mySocketId) mySocketIdRef.current = mySocketId;
  }, [mySocketId]);

  // Track friend presence from messages
  useEffect(() => {
    if (!mySocketId) return;
    const hasOtherMessages = messages.some((m) => m.senderId !== mySocketId);
    if (hasOtherMessages) setFriendConnected(true);
  }, [messages, mySocketId]);

  // Handle send
  const handleSend = useCallback((text) => {
    sendMessage(text);
    setExpressionFor('thinking', 1200);
    resetInactivity();
  }, [sendMessage, setExpressionFor, resetInactivity]);

  // Panic mode trigger
  const handlePanicTrigger = useCallback(() => {
    setExpression('panic');
    setTimeout(() => {
      setIsPanicMode(true);
      setExpression('idle');
    }, 600);
  }, []);

  const handlePanicExit = useCallback(() => {
    setIsPanicMode(false);
    setExpressionFor('happy', 2000);
  }, [setExpressionFor]);

  // Esc×2 desktop panic trigger
  useEffect(() => {
    if (isPanicMode) return;
    let lastEsc = 0;
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        const now = Date.now();
        if (now - lastEsc < 500) {
          handlePanicTrigger();
          lastEsc = 0;
        } else {
          lastEsc = now;
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isPanicMode, handlePanicTrigger]);

  // Start inactivity timer on mount
  useEffect(() => {
    resetInactivity();
    return () => {
      clearTimeout(inactivityTimerRef.current);
      clearTimeout(expressionTimerRef.current);
      clearTimeout(typingTimerRef.current);
    };
  }, [resetInactivity]);

  // Cleanup socket on unmount
  useEffect(() => {
    return () => leaveRoom();
  }, [leaveRoom]);

  return (
    <div
      id="chat-page"
      className="viewport-height flex flex-col overflow-hidden relative"
      style={{ flexDirection: 'column', background: 'var(--color-bg)' }}
    >
      {/* MOBILE: Panda top 50vh + Chat bottom 50vh */}
      {/* DESKTOP (768px+): Panda left 40% + Chat right 60% */}
      <div
        className="flex overflow-hidden"
        style={{
          height: '100%',
          flexDirection: 'column',
        }}
      >
        {/* Responsive layout wrapper */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
          className="md:flex-row"
        >
          {/* Panda Zone — hidden during panic but stays mounted */}
          <motion.div
            style={{
              height: '50vh',
              flexShrink: 0,
              overflow: 'hidden',
            }}
            className="md:h-full md:w-[40%]"
            animate={{
              opacity: isPanicMode ? 0 : 1,
              // keep layout space — don't collapse height, just hide visually
            }}
            transition={{ duration: 0.25 }}
          >
            <PandaZone
              expression={expression}
              isSpeaking={isSpeaking}
              ttsEnabled={ttsEnabled}
              onToggleTTS={toggleTTS}
              onPanicTrigger={handlePanicTrigger}
              isTypingIndicator={isTypingIndicator}
              friendConnected={friendConnected}
            />
          </motion.div>

          {/* Chat Zone — slides down + fades out during panic */}
          <motion.div
            style={{ flex: 1, overflow: 'hidden' }}
            className="md:w-[60%]"
            animate={{
              opacity: isPanicMode ? 0 : 1,
              y: isPanicMode ? 40 : 0,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 35 }}
          >
            <ChatZone
              messages={messages}
              socketId={mySocketId}
              onSend={handleSend}
              onTypingStart={sendTypingStart}
              onTypingStop={sendTypingStop}
              onReaction={sendReaction}
              isTyping={isTypingIndicator}
              isConnected={isConnected}
              roomCode={roomCode}
            />
          </motion.div>
        </div>
      </div>

      {/* Panic Mode Overlay */}
      <PanicMode isActive={isPanicMode} onExit={handlePanicExit} />

      {/* Random Lesson Popup */}
      <LessonPopup />
    </div>
  );
};

export default ChatPage;
