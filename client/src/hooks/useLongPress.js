import { useRef, useCallback } from 'react';

/**
 * useLongPress — detects long press (hold) events on touch and mouse.
 *
 * @param {Function} onLongPress - Called after `delay` ms of continuous press
 * @param {Function} onProgress - Called with progress (0-1) every 100ms during press
 * @param {Object} options
 * @param {number} options.delay - ms before long press fires (default: 5000)
 * @param {number} options.shortDelay - ms for short press / sticker picker (default: 800)
 * @param {Function} options.onShortPress - Called after shortDelay ms
 * @returns {Object} bind - spread onto the target element as props
 */
const useLongPress = (
  onLongPress,
  onProgress,
  { delay = 5000, shortDelay = 800, onShortPress } = {}
) => {
  const timerRef = useRef(null);
  const shortTimerRef = useRef(null);
  const progressTimerRef = useRef(null);
  const startTimeRef = useRef(null);
  const isPressingRef = useRef(false);

  const startPress = useCallback(
    (e) => {
      // Prevent text selection on long press
      e.preventDefault();
      isPressingRef.current = true;
      startTimeRef.current = Date.now();

      // Short press timer (for sticker picker)
      if (onShortPress) {
        shortTimerRef.current = setTimeout(() => {
          if (isPressingRef.current) onShortPress();
        }, shortDelay);
      }

      // Progress updater
      progressTimerRef.current = setInterval(() => {
        if (!isPressingRef.current) return;
        const elapsed = Date.now() - startTimeRef.current;
        const progress = Math.min(elapsed / delay, 1);
        onProgress?.(progress);
      }, 50);

      // Long press timer
      timerRef.current = setTimeout(() => {
        if (isPressingRef.current) {
          onLongPress?.();
          clearInterval(progressTimerRef.current);
        }
      }, delay);
    },
    [onLongPress, onShortPress, onProgress, delay, shortDelay]
  );

  const endPress = useCallback(() => {
    isPressingRef.current = false;
    clearTimeout(timerRef.current);
    clearTimeout(shortTimerRef.current);
    clearInterval(progressTimerRef.current);
    onProgress?.(0);
  }, [onProgress]);

  return {
    onMouseDown: startPress,
    onMouseUp: endPress,
    onMouseLeave: endPress,
    onTouchStart: startPress,
    onTouchEnd: endPress,
    onTouchCancel: endPress,
    style: { userSelect: 'none', WebkitUserSelect: 'none' },
  };
};

export default useLongPress;
