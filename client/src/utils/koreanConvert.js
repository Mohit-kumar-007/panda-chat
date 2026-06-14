/**
 * Korean conversion utility — manages per-message 2-minute timers.
 * After 2 minutes, each message transitions from original to Korean text.
 */

const CONVERSION_DELAY_MS = 2 * 60 * 1000; // 2 minutes

/** Map of messageId -> timer id */
const timers = new Map();

/** Map of messageId -> { isConverted: boolean, callbacks: Set<fn> } */
const messageState = new Map();

/**
 * Registers a message for Korean conversion after 2 minutes.
 * @param {string} messageId
 * @param {Function} onConverted - called when conversion triggers
 * @param {number} [sentAt] - timestamp (ms since epoch) to compute remaining time
 */
export const scheduleKoreanConversion = (messageId, onConverted, sentAt) => {
  if (messageState.has(messageId)) {
    // Add callback to existing entry
    messageState.get(messageId).callbacks.add(onConverted);
    if (messageState.get(messageId).isConverted) {
      // Already converted — call immediately
      onConverted(messageId);
    }
    return;
  }

  const state = { isConverted: false, callbacks: new Set([onConverted]) };
  messageState.set(messageId, state);

  const now = Date.now();
  const elapsed = sentAt ? now - sentAt : 0;
  const remaining = Math.max(0, CONVERSION_DELAY_MS - elapsed);

  if (remaining === 0) {
    // Already past 2 min (e.g., history messages)
    state.isConverted = true;
    onConverted(messageId);
    return;
  }

  const timerId = setTimeout(() => {
    state.isConverted = true;
    state.callbacks.forEach((cb) => cb(messageId));
    timers.delete(messageId);
  }, remaining);

  timers.set(messageId, timerId);
};

/**
 * Checks if a message has been converted.
 * @param {string} messageId
 * @returns {boolean}
 */
export const isMessageConverted = (messageId) => {
  return messageState.get(messageId)?.isConverted ?? false;
};

/**
 * Cancels a conversion timer (e.g., when message is removed).
 * @param {string} messageId
 */
export const cancelConversion = (messageId) => {
  const timerId = timers.get(messageId);
  if (timerId) {
    clearTimeout(timerId);
    timers.delete(messageId);
  }
  messageState.delete(messageId);
};

/**
 * Clears all conversion timers.
 */
export const clearAllConversions = () => {
  timers.forEach((id) => clearTimeout(id));
  timers.clear();
  messageState.clear();
};
