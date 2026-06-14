import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import MessageBubble from './MessageBubble';

/**
 * MessageList — Scrollable list of chat messages with auto-scroll.
 */
const MessageList = ({ messages, socketId, onReaction, isTyping }) => {
  const bottomRef = useRef(null);
  const listRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-5xl mb-4">🌸</div>
          <p className="text-slate-400 font-semibold text-sm">
            No messages yet
          </p>
          <p className="text-slate-300 text-xs mt-1 font-korean">
            안녕하세요! Say hello!
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      id="message-list"
      className="flex-1 overflow-y-auto px-4 py-4 flex flex-col smooth-scroll no-pull-refresh hide-scrollbar"
    >
      <AnimatePresence initial={false}>
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.senderId === socketId}
            onReaction={onReaction}
            socketId={socketId}
          />
        ))}
      </AnimatePresence>

      {/* Typing indicator */}
      <AnimatePresence>
        {isTyping && (
          <motion.div
            className="flex items-center gap-2 text-sm text-slate-400 mt-2 ml-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="bg-[var(--color-bubble-friend)] rounded-2xl px-4 py-2 flex items-center gap-1.5">
              <div className="typing-dots flex items-center gap-0.5">
                <span /><span /><span />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
