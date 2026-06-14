import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useLongPress from '../../hooks/useLongPress';
import { scheduleKoreanConversion } from '../../utils/koreanConvert';
import StickerPicker from '../StickerPicker/StickerPicker';

/**
 * MessageBubble — Single chat message with:
 * - Korean conversion after 2 minutes
 * - Long press reveal (5 seconds) with progress ring
 * - 10-second countdown after reveal
 * - Sticker picker on short press (800ms)
 * - Reaction display
 */
const MessageBubble = ({ message, isOwn, onReaction, socketId }) => {
  const [isKorean, setIsKorean] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [revealCountdown, setRevealCountdown] = useState(false);
  const [pressProgress, setPressProgress] = useState(0);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [floatingSticker, setFloatingSticker] = useState(null);
  const countdownTimerRef = useRef(null);
  const bubbleRef = useRef(null);

  const { id, original, korean, timestamp, reactions = [], senderName } = message;

  // Schedule Korean conversion
  useEffect(() => {
    scheduleKoreanConversion(
      id,
      () => setIsKorean(true),
      new Date(timestamp).getTime()
    );
  }, [id, timestamp]);

  // 10-second reveal countdown
  const startRevealCountdown = useCallback(() => {
    setRevealCountdown(true);
    clearTimeout(countdownTimerRef.current);
    countdownTimerRef.current = setTimeout(() => {
      setIsRevealed(false);
      setRevealCountdown(false);
    }, 10000);
  }, []);

  // Long press handler (5 seconds = reveal Korean)
  const handleLongPress = useCallback(() => {
    if (!isKorean) return;
    // Haptic feedback
    try {
      navigator.vibrate?.([50, 30, 50]);
    } catch {}
    setIsRevealed(true);
    setPressProgress(0);
    startRevealCountdown();
    setShowStickerPicker(false);
  }, [isKorean, startRevealCountdown]);

  // Short press handler (800ms = sticker picker)
  const handleShortPress = useCallback(() => {
    setShowStickerPicker((prev) => !prev);
  }, []);

  const longPressProps = useLongPress(handleLongPress, setPressProgress, {
    delay: 5000,
    shortDelay: 800,
    onShortPress: handleShortPress,
  });

  const handleStickerSelect = (sticker) => {
    setShowStickerPicker(false);
    onReaction?.(id, sticker);
    setFloatingSticker(sticker);
    setTimeout(() => setFloatingSticker(null), 3000);
  };

  // Display text logic
  const displayText = isKorean && !isRevealed ? korean : original;
  const useKoreanFont = isKorean && !isRevealed;
  const showRevealLabel = isRevealed && revealCountdown;

  const formattedTime = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`flex flex-col mb-3 max-w-[80%] ${isOwn ? 'items-end self-end' : 'items-start self-start'}`}
    >
      {/* Sender name label — only shown for friend's messages */}
      {!isOwn && senderName && (
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          color: '#94a3b8',
          marginBottom: '3px',
          marginLeft: '6px',
          letterSpacing: '0.02em',
        }}>
          {senderName}
        </span>
      )}
      <div className="relative">
        {/* Sticker picker */}
        <AnimatePresence>
          {showStickerPicker && (
            <StickerPicker
              onSelect={handleStickerSelect}
              onClose={() => setShowStickerPicker(false)}
              isOwn={isOwn}
            />
          )}
        </AnimatePresence>

        {/* Floating sticker animation */}
        <AnimatePresence>
          {floatingSticker && (
            <motion.span
              className="absolute text-3xl pointer-events-none z-20"
              style={{ left: '50%', bottom: '100%', translateX: '-50%' }}
              initial={{ opacity: 1, y: 0, scale: 0.5 }}
              animate={{ opacity: 0, y: -80, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, ease: 'easeOut' }}
            >
              {floatingSticker}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Message bubble */}
        <motion.div
          ref={bubbleRef}
          id={`msg-${id}`}
          className={`relative px-4 py-3 text-sm leading-relaxed cursor-pointer select-none ${
            isOwn ? 'bubble-mine' : 'bubble-friend'
          } ${useKoreanFont ? 'bubble-korean font-korean text-base' : ''}`}
          style={{ minWidth: '60px', maxWidth: '100%' }}
          {...longPressProps}
          layout
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          whileTap={{ scale: 0.97 }}
        >
          {/* Progress ring (during long press) */}
          {pressProgress > 0 && (
            <div
              className="absolute inset-0 rounded-[inherit] pointer-events-none"
              style={{
                border: `3px solid var(--color-accent)`,
                borderRadius: 'inherit',
                background: `conic-gradient(var(--color-accent) ${pressProgress * 360}deg, transparent 0deg)`,
                opacity: 0.3,
              }}
            />
          )}

          {/* Text with fade transition */}
          <motion.span
            key={useKoreanFont ? 'korean' : 'original'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className={useKoreanFont ? 'font-korean text-[var(--color-korean)]' : ''}
          >
            {displayText || original}
          </motion.span>

          {/* Korean indicator badge */}
          {isKorean && !isRevealed && (
            <span className="ml-2 text-xs opacity-50 font-korean">🇰🇷</span>
          )}
        </motion.div>

        {/* Reveal countdown bar */}
        <AnimatePresence>
          {showRevealLabel && (
            <motion.div
              className="mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>👁 10s</span>
                <div className="flex-1 h-0.5 bg-slate-200 rounded overflow-hidden">
                  <div className="reveal-countdown h-full bg-[var(--color-accent)] rounded" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {reactions.map((r, i) => (
              <span
                key={i}
                className="text-base bg-white/80 rounded-full px-1.5 py-0.5 shadow-sm"
              >
                {r}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Timestamp */}
      <span className="text-xs text-slate-400 mt-1 mx-1">{formattedTime}</span>
    </div>
  );
};

export default MessageBubble;
