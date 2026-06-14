import { useEffect, useRef } from 'react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

/**
 * ChatZone — Main chat container with keyboard-aware layout.
 * Uses visualViewport API to handle mobile keyboard.
 */
const ChatZone = ({
  messages,
  socketId,
  onSend,
  onTypingStart,
  onTypingStop,
  onReaction,
  isTyping,
  isConnected,
  roomCode,
}) => {
  const containerRef = useRef(null);

  // Handle keyboard opening on mobile (visualViewport API)
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const handleResize = () => {
      if (containerRef.current) {
        containerRef.current.style.height = `${vv.height}px`;
      }
    };

    vv.addEventListener('resize', handleResize);
    vv.addEventListener('scroll', handleResize);

    return () => {
      vv.removeEventListener('resize', handleResize);
      vv.removeEventListener('scroll', handleResize);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id="chat-zone"
      className="flex flex-col overflow-hidden"
      style={{
        background: 'var(--color-chat-bg)',
        height: '100%',
        position: 'relative',
      }}
    >
      {/* Chat header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div>
          <h2 className="font-bold text-sm text-slate-700">💬 오늘의 대화</h2>
          <p className="text-xs text-slate-400">
            {roomCode ? `Room: ${roomCode.slice(0,3)} ${roomCode.slice(3)}` : "Today's Conversation"}
          </p>
        </div>
        <div className={`text-xs font-semibold px-2 py-1 rounded-full ${
          isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
        }`}>
          {isConnected ? '● Connected' : '○ Connecting...'}
        </div>
      </div>

      {/* Message list */}
      <MessageList
        messages={messages}
        socketId={socketId}
        onReaction={onReaction}
        isTyping={isTyping}
      />

      {/* Input area */}
      <ChatInput
        onSend={onSend}
        onTypingStart={onTypingStart}
        onTypingStop={onTypingStop}
        disabled={!isConnected}
      />
    </div>
  );
};

export default ChatZone;
