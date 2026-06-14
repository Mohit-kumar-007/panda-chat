import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

/** Read the name saved by LandingPage */
const getSavedName = () => {
  try { return localStorage.getItem('pandachat_name') || 'User'; } catch { return 'User'; }
};

// Singleton socket — one connection per browser tab
let socketInstance = null;

const getSocket = () => {
  if (!socketInstance || socketInstance.disconnected) {
    if (socketInstance) {
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
    }
    socketInstance = io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });
  }
  return socketInstance;
};

/**
 * useSocket — manages Socket.io connection and room events.
 *
 * Returns mySocketId as a reactive state value so components
 * can reliably tell which messages are their own.
 */
const useSocket = ({
  roomCode,
  onMessage,
  onRoomJoined,
  onRoomFull,
  onRoomNotFound,
  onUserTyping,
  onReaction,
  onUserDisconnected,
  onUserReconnected,
}) => {
  const socketRef = useRef(null);
  const joinedRef = useRef(false);
  const currentRoomRef = useRef(null);

  // ─── FIX 1: mySocketId as proper React state (not a polled ref) ──────────
  // This is the single source of truth for "who am I".
  // It's set the moment the socket receives its id from the server (on connect).
  const [mySocketId, setMySocketId] = useState(null);
  const mySocketIdRef = useRef(null); // ref mirror for use in callbacks

  const updateMyId = useCallback((id) => {
    mySocketIdRef.current = id;
    setMySocketId(id);
  }, []);

  // ─── Initialise socket once ───────────────────────────────────────────────
  useEffect(() => {
    const s = getSocket();
    socketRef.current = s;

    // If already connected (e.g. HMR / StrictMode remount), grab id immediately
    if (s.connected && s.id) {
      updateMyId(s.id);
    }

    const handleConnect = () => {
      console.log('🟢 Socket connected, id:', s.id);
      // FIX 1: set our own ID as soon as the server assigns it
      updateMyId(s.id);

      if (currentRoomRef.current && !joinedRef.current) {
        s.emit('join_room', { roomCode: currentRoomRef.current, name: getSavedName() });
        joinedRef.current = true;
      }

      // FIX 2: only call onUserReconnected for actual RE-connections, not the
      // initial connect (joinedRef.current is false on first connect).
      // We check if we already had an id before — if yes, it's a reconnect.
      if (mySocketIdRef.current) {
        onUserReconnected?.();
      }
    };

    const handleDisconnect = (reason) => {
      console.log('🔴 Socket disconnected:', reason);
      joinedRef.current = false;
      // Don't clear mySocketId here — we want to keep showing correct bubbles
      // even briefly while reconnecting.
    };

    s.on('connect', handleConnect);
    s.on('disconnect', handleDisconnect);

    if (!s.connected) s.connect();

    return () => {
      s.off('connect', handleConnect);
      s.off('disconnect', handleDisconnect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Join room whenever roomCode changes ──────────────────────────────────
  useEffect(() => {
    if (!roomCode) return;
    const s = socketRef.current;
    if (!s) return;

    currentRoomRef.current = roomCode;
    joinedRef.current = false;

    if (s.connected) {
      s.emit('join_room', { roomCode, name: getSavedName() });
      joinedRef.current = true;
    }
  }, [roomCode]);

  // ─── Register / deregister event listeners ────────────────────────────────
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    if (onRoomJoined)       s.on('room_joined',       onRoomJoined);
    if (onRoomFull)         s.on('room_full',          onRoomFull);
    if (onRoomNotFound)     s.on('room_not_found',     onRoomNotFound);
    if (onMessage)          s.on('receive_message',    onMessage);
    if (onUserTyping)       s.on('user_typing',        onUserTyping);
    if (onReaction)         s.on('receive_reaction',   onReaction);
    if (onUserDisconnected) s.on('user_disconnected',  onUserDisconnected);

    return () => {
      s.off('room_joined',      onRoomJoined);
      s.off('room_full',        onRoomFull);
      s.off('room_not_found',   onRoomNotFound);
      s.off('receive_message',  onMessage);
      s.off('user_typing',      onUserTyping);
      s.off('receive_reaction', onReaction);
      s.off('user_disconnected', onUserDisconnected);
    };
  }, [
    onMessage, onRoomJoined, onRoomFull, onRoomNotFound,
    onUserTyping, onReaction, onUserDisconnected,
  ]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const sendMessage = useCallback((text) => {
    if (!roomCode || !socketRef.current) return;
    socketRef.current.emit('send_message', { roomCode, text });
  }, [roomCode]);

  const sendTypingStart = useCallback(() => {
    if (!roomCode || !socketRef.current) return;
    socketRef.current.emit('typing_start', { roomCode });
  }, [roomCode]);

  const sendTypingStop = useCallback(() => {
    if (!roomCode || !socketRef.current) return;
    socketRef.current.emit('typing_stop', { roomCode });
  }, [roomCode]);

  const sendReaction = useCallback((messageId, sticker) => {
    if (!roomCode || !socketRef.current) return;
    socketRef.current.emit('send_reaction', { messageId, sticker, roomCode });
  }, [roomCode]);

  const leaveRoom = useCallback(() => {
    if (!roomCode || !socketRef.current) return;
    socketRef.current.emit('leave_room', { roomCode });
    joinedRef.current = false;
    currentRoomRef.current = null;
  }, [roomCode]);

  // FIX 3: getSocketId now reads the ref directly (always up-to-date)
  const getSocketId = useCallback(() => {
    return mySocketIdRef.current || socketRef.current?.id || null;
  }, []);

  const isConnected = useCallback(() => {
    return socketRef.current?.connected ?? false;
  }, []);

  return {
    mySocketId,   // ← NEW: reactive state, use this in components instead of getSocketId()
    sendMessage,
    sendTypingStart,
    sendTypingStop,
    sendReaction,
    leaveRoom,
    getSocketId,
    isConnected,
  };
};

export default useSocket;
