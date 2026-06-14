/**
 * Client-side room code utilities
 */

/**
 * Generates a random 6-character alphanumeric room code.
 * Note: Server generates the authoritative code — this is for display/validation only.
 * @returns {string}
 */
export const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  const arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 6; i++) {
    code += chars[arr[i] % chars.length];
  }
  return code;
};

/**
 * Validates a room code format (6 alphanumeric chars).
 * @param {string} code
 * @returns {boolean}
 */
export const isValidRoomCode = (code) => {
  return typeof code === 'string' && /^[A-Z0-9]{6}$/i.test(code);
};

/**
 * Formats a room code for display (uppercase, groups of 3).
 * @param {string} code
 * @returns {string} e.g. "AB1 CD2"
 */
export const formatRoomCode = (code) => {
  const upper = (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (upper.length <= 3) return upper;
  return `${upper.slice(0, 3)} ${upper.slice(3)}`;
};
