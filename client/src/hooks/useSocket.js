import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

// Singleton socket — persists across renders but NOT across reconnect-to-different-room
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
 * @param {Object} params
 * @param {string|null}  params.roomCode
 * @param {Function}     params.onMessage
 * @param {Function}     params.onRoomJoined
 * @param {Function}     params.onRoomFull
 * @param {Function}     params.onRoomNotFound
 * @param {Function}     params.onUserTyping
 * @param {Function}     params.onReaction
 * @param {Function}     params.onUserDisconnected
 * @param {Function}     params.onUserReconnected
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

  // Initialise socket once
  useEffect(() => {
    const s = getSocket();
    socketRef.current = s;

    const handleConnect = () => {
      console.log('🟢 Socket connected:', s.id);
      if (currentRoomRef.current && !joinedRef.current) {
        s.emit('join_room', { roomCode: currentRoomRef.current });
        joinedRef.current = true;
      }
      onUserReconnected?.();
    };

    const handleDisconnect = (reason) => {
      console.log('🔴 Socket disconnected:', reason);
      joinedRef.current = false;
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

  // Join room whenever roomCode changes
  useEffect(() => {
    if (!roomCode) return;
    const s = socketRef.current;
    if (!s) return;

    currentRoomRef.current = roomCode;
    joinedRef.current = false;

    if (s.connected) {
      s.emit('join_room', { roomCode });
      joinedRef.current = true;
    }
  }, [roomCode]);

  // Register / deregister event listeners (re-runs when handlers change)
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    if (onRoomJoined)      s.on('room_joined',       onRoomJoined);
    if (onRoomFull)        s.on('room_full',          onRoomFull);
    if (onRoomNotFound)    s.on('room_not_found',     onRoomNotFound);
    if (onMessage)         s.on('receive_message',    onMessage);
    if (onUserTyping)      s.on('user_typing',        onUserTyping);
    if (onReaction)        s.on('receive_reaction',   onReaction);
    if (onUserDisconnected)s.on('user_disconnected',  onUserDisconnected);

    return () => {
      s.off('room_joined',      onRoomJoined);
      s.off('room_full',        onRoomFull);
      s.off('room_not_found',   onRoomNotFound);
      s.off('receive_message',  onMessage);
      s.off('user_typing',      onUserTyping);
      s.off('receive_reaction', onReaction);
      s.off('user_disconnected',onUserDisconnected);
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

  const getSocketId = useCallback(() => {
    return socketRef.current?.id || null;
  }, []);

  const isConnected = useCallback(() => {
    return socketRef.current?.connected ?? false;
  }, []);

  return {
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
