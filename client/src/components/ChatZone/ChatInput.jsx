import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * ChatInput — Text input with send button.
 * Features:
 * - Typing events with debounce
 * - Keyboard-aware positioning (visualViewport)
 * - Min 16px font size (no iOS zoom)
 * - 48px min touch target
 */
const ChatInput = ({ onSend, onTypingStart, onTypingStop, disabled }) => {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);
  const inputRef = useRef(null);

  const handleChange = (e) => {
    setText(e.target.value);
    // Typing indicator
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTypingStart?.();
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onTypingStop?.();
    }, 1500);
  };

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    // Stop typing
    clearTimeout(typingTimerRef.current);
    isTypingRef.current = false;
    onTypingStop?.();
    inputRef.current?.focus();
  }, [text, onSend, onTypingStop, disabled]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimeout(typingTimerRef.current);
  }, []);

  return (
    <div
      className="flex items-center gap-2 px-3 py-3 border-t border-slate-100"
      style={{
        background: 'var(--color-chat-bg)',
        paddingBottom: 'calc(12px + var(--safe-bottom))',
      }}
    >
      <div className={`flex-1 relative transition-all duration-200 ${isFocused ? 'scale-[1.01]' : ''}`}>
        <input
          ref={inputRef}
          id="chat-text-input"
          type="text"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="메시지... (Message...)"
          className="chat-input w-full"
          disabled={disabled}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="sentences"
          style={{ fontSize: '16px' }}
          aria-label="Type a message"
        />
      </div>

      {/* Send button */}
      <motion.button
        id="send-message-btn"
        onClick={handleSend}
        disabled={!text.trim() || disabled}
        className={`btn-accent w-12 h-12 rounded-full flex-shrink-0 ${
          !text.trim() || disabled ? 'opacity-40 cursor-not-allowed' : ''
        }`}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        aria-label="Send message"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </motion.button>
    </div>
  );
};

export default ChatInput;
