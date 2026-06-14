import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useTTS from '../../hooks/useTTS';

const INTERVAL_MIN = 8 * 60 * 1000; // 8 minutes
const INTERVAL_MAX = 12 * 60 * 1000; // 12 minutes
const DISPLAY_DURATION = 5000; // 5 seconds

/**
 * LessonPopup — Random interval Korean word popup overlay.
 * Appears every 8-12 minutes with a Korean vocabulary word.
 * Reads the word aloud and auto-dismisses after 5 seconds.
 */
const LessonPopup = ({ isVisible: externalVisible }) => {
  const [word, setWord] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [allWords, setAllWords] = useState([]);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const { speak } = useTTS();

  // Load vocab
  useEffect(() => {
    fetch('/vocab/korean_vocab.json')
      .then((r) => r.json())
      .then((data) => {
        const words = data.categories.flatMap((c) => c.words);
        setAllWords(words);
      })
      .catch(console.error);
  }, []);

  const showPopup = useCallback(() => {
    if (allWords.length === 0) return;
    const randomWord = allWords[Math.floor(Math.random() * allWords.length)];
    setWord(randomWord);
    setIsVisible(true);
    setCountdown(5);
    speak(randomWord.korean);

    // Countdown
    let c = 5;
    countdownRef.current = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(countdownRef.current);
        setIsVisible(false);
      }
    }, 1000);
  }, [allWords, speak]);

  const dismiss = useCallback(() => {
    clearInterval(countdownRef.current);
    setIsVisible(false);
  }, []);

  // Schedule random popups
  useEffect(() => {
    if (allWords.length === 0) return;

    const scheduleNext = () => {
      const delay = INTERVAL_MIN + Math.random() * (INTERVAL_MAX - INTERVAL_MIN);
      timerRef.current = setTimeout(() => {
        showPopup();
        scheduleNext();
      }, delay);
    };

    scheduleNext();
    return () => {
      clearTimeout(timerRef.current);
      clearInterval(countdownRef.current);
    };
  }, [allWords, showPopup]);

  if (!word) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="lesson-popup"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐼</span>
              <div>
                <p className="text-white font-bold text-sm">Word of the Moment!</p>
                <p className="text-white/60 text-xs">오늘의 단어</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/60 text-xs font-bold">{countdown}s</span>
              <button
                onClick={dismiss}
                className="text-white/60 hover:text-white transition-colors text-lg leading-none"
                aria-label="Dismiss popup"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Word display */}
          <div className="text-center py-2">
            <p className="font-korean font-bold text-3xl text-white mb-1">{word.korean}</p>
            <p className="text-white/70 text-sm mb-1">({word.romanization})</p>
            <p className="text-white font-semibold">{word.english}</p>
          </div>

          {/* Countdown progress bar */}
          <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white/60 rounded-full"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: DISPLAY_DURATION / 1000, ease: 'linear' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LessonPopup;
