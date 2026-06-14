// ─── Pure-Korean dictionary (instant, no API needed) ─────────────────────────
// These are 100% pure Hangul — TTS will always pronounce these in Korean.
const DICT = {
  // Greetings
  'hello': '안녕하세요',
  'hi': '안녕',
  'hey': '야',
  'bye': '안녕히 가세요',
  'goodbye': '잘 가요',
  'see you': '나중에 봐요',
  'see you later': '나중에 봐요',
  // Courtesy
  'thank you': '감사합니다',
  'thanks': '고마워요',
  'please': '부탁해요',
  'sorry': '미안해요',
  "i'm sorry": '죄송해요',
  'excuse me': '실례합니다',
  'no problem': '괜찮아요',
  'you are welcome': '천만에요',
  // Yes / No
  'yes': '네',
  'no': '아니요',
  'ok': '알겠어요',
  'okay': '알겠어요',
  'sure': '물론이죠',
  'of course': '당연하죠',
  // Feelings
  'i love you': '사랑해요',
  'i like you': '좋아해요',
  'i miss you': '보고 싶어요',
  'happy': '행복해요',
  'sad': '슬퍼요',
  'angry': '화났어요',
  'tired': '피곤해요',
  'hungry': '배고파요',
  'good': '좋아요',
  'great': '훌륭해요',
  'nice': '좋네요',
  'wow': '와',
  'amazing': '놀라워요',
  'awesome': '대박이에요',
  'cool': '멋져요',
  'cute': '귀여워요',
  // Questions
  'how are you': '잘 지내요?',
  'how was your day': '오늘 어땠어요?',
  'where are you': '어디 있어요?',
  'what are you doing': '뭐 해요?',
  'are you there': '거기 있어요?',
  'are you okay': '괜찮아요?',
  // Time
  'good morning': '좋은 아침이에요',
  'good night': '잘 자요',
  'good evening': '좋은 저녁이에요',
  'morning': '아침',
  'night': '밤',
  'today': '오늘',
  'tomorrow': '내일',
  'now': '지금',
  'later': '나중에',
  'soon': '곧',
  'wait': '잠깐만요',
  // Actions
  'come': '와요',
  'go': '가요',
  'eat': '먹어요',
  'drink': '마셔요',
  'sleep': '자요',
  'talk': '이야기해요',
  'listen': '들어요',
  'watch': '봐요',
  'run': '뛰어요',
  'walk': '걸어요',
  'work': '일해요',
  'play': '놀아요',
  'meet': '만나요',
  'call': '전화해요',
  // Chat phrases
  'me too': '저도요',
  'same': '같아요',
  'really': '정말요?',
  'oh': '오',
  'lol': '하하',
  'haha': '하하',
  'hehe': '헤헤',
  'omg': '세상에',
  'what': '뭐요?',
  'why': '왜요?',
  'how': '어떻게요?',
  'who': '누구요?',
  'when': '언제요?',
  'where': '어디요?',
  'i know': '알아요',
  'i see': '그렇군요',
  'i understand': '이해해요',
  'i dont know': '모르겠어요',
  "i don't know": '모르겠어요',
  'be careful': '조심해요',
  'good luck': '행운을 빌어요',
  'fighting': '화이팅',
  'lets go': '가요',
  "let's go": '가요',
  'wait for me': '기다려요',
  'miss you': '보고 싶어요',
  'love you': '사랑해요',
  'thinking of you': '생각하고 있어요',
  'take care': '잘 지내요',
};

/**
 * Lookup in local dictionary (pure Hangul only).
 * Returns null if not found.
 */
const dictLookup = (text) => {
  const key = text.toLowerCase().trim().replace(/[!?.,]+$/, '');
  if (DICT[key]) return DICT[key];

  // Try word-by-word — only if ALL words are in dict
  const words = key.split(/\s+/);
  if (words.length > 1) {
    const parts = words.map((w) => DICT[w]);
    if (parts.every((p) => p !== undefined)) {
      return parts.join(' ');
    }
  }
  return null;
};

// ─── Google Translate (unofficial, free, no API key needed) ──────────────────
// Uses the same engine as translate.google.com — completely free, no signup.
// Package: @vitalets/google-translate-api
// Handles rate-limiting gracefully by falling through to MyMemory.

let googleTranslateFn = null;

try {
  const mod = require('@vitalets/google-translate-api');
  // The package exports { translate } or the function directly depending on version
  googleTranslateFn = mod.translate || mod.default?.translate || mod.default || mod;
  if (typeof googleTranslateFn !== 'function') googleTranslateFn = null;
  if (googleTranslateFn) console.log('✅ Google Translate (free/unofficial) ready');
} catch (e) {
  console.warn('⚠️  @vitalets/google-translate-api not installed, skipping');
}

const googleFreeTranslate = async (text) => {
  if (!googleTranslateFn) throw new Error('Google free translate not available');

  const result = await googleTranslateFn(text, { to: 'ko' });

  // The package returns { text: '...' }
  const translated = result?.text;
  if (!translated) throw new Error('No result from Google free translate');

  const hasHangul = /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/.test(translated);
  if (!hasHangul) throw new Error(`Not Korean: "${translated}"`);

  return translated;
};

// ─── MyMemory — free translation API, no key needed ──────────────────────────
// Limit: ~500 words/day (unauthenticated). Backup to Google free.

const myMemoryTranslate = async (text) => {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ko&de=pandachat@example.com`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);

    const data = await res.json();
    const translated = data?.responseData?.translatedText;
    if (!translated) throw new Error('No translation in MyMemory response');

    const hasHangul = /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/.test(translated);
    if (!hasHangul) throw new Error(`Result not Korean: "${translated}"`);

    return translated;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
};

// ─── Lingva Translate — community proxy, no key ───────────────────────────────

const lingvaTranslate = async (text) => {
  const url = `https://lingva.ml/api/v1/en/ko/${encodeURIComponent(text)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Lingva HTTP ${res.status}`);
    const data = await res.json();
    const translated = data?.translation;
    if (!translated) throw new Error('No Lingva translation');
    const hasHangul = /[\uAC00-\uD7A3]/.test(translated);
    if (!hasHangul) throw new Error('Not Korean');
    return translated;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
};

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Translates any text to Korean.
 *
 * Priority chain (all FREE, no credit card, no signup):
 *   1. Local dictionary            — instant, unlimited, perfect for common phrases
 *   2. Google Translate (free)     — unofficial web API, Google quality, no key needed
 *   3. MyMemory                    — ~500 words/day free, no key needed
 *   4. Lingva                      — community proxy, unlimited
 *   5. Korean fallback phrase      — always returns valid Korean for TTS
 *
 * @param {string} text - Input text (any language)
 * @returns {Promise<string>} Pure Korean (Hangul) translation
 */
const translateToKorean = async (text) => {
  if (!text || !text.trim()) return '';

  const input = text.trim();

  // 1. Local dictionary — instant for common words/phrases
  const dictResult = dictLookup(input);
  if (dictResult) return dictResult;

  // 2. Google Translate (free, unofficial — best quality, no key needed)
  try {
    const result = await googleFreeTranslate(input);
    return result;
  } catch (err) {
    console.warn('Google free translate error:', err.message);
  }

  // 3. MyMemory (free backup)
  try {
    const result = await myMemoryTranslate(input);
    return result;
  } catch (err) {
    console.warn('MyMemory error:', err.message);
  }

  // 4. Lingva (community proxy backup)
  try {
    const result = await lingvaTranslate(input);
    return result;
  } catch (err) {
    console.warn('Lingva error:', err.message);
  }

  // 5. Ultimate fallback — pure Korean so TTS always speaks Korean
  return '메시지가 왔어요';
};

module.exports = { translateToKorean };
