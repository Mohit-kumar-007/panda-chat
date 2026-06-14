import { useCallback, useRef, useState, useEffect } from 'react';

/**
 * useTTS — Korean Text-to-Speech.
 *
 * Strategy:
 *  - Mobile (touch device): Use <audio> + Google Translate TTS URL.
 *    Audio elements can be played asynchronously after a single user gesture,
 *    unlike speechSynthesis which requires the call to be IN the gesture handler.
 *  - Desktop fallback: Web Speech API (speechSynthesis) as before.
 *
 * Mobile unlock: On the first user touch, we play a silent audio to satisfy
 * the browser's autoplay policy. After that, all subsequent plays work fine.
 */

const isMobile = () =>
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

// Build Google Translate TTS URL for Korean
const buildGoogleTTSUrl = (text) => {
  const encoded = encodeURIComponent(text.slice(0, 200)); // max safe length
  return `https://translate.google.com/translate_tts?ie=UTF-8&tl=ko&client=tw-ob&q=${encoded}`;
};

const useTTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(() => {
    try {
      return localStorage.getItem('pandachat_tts') !== 'false';
    } catch {
      return true;
    }
  });
  const [voicesReady, setVoicesReady] = useState(false);

  const ttsEnabledRef = useRef(ttsEnabled);
  const audioRef = useRef(null);        // <audio> element for mobile
  const synthRef = useRef(null);
  const utteranceRef = useRef(null);
  const pendingRef = useRef(null);
  const unlockedRef = useRef(false);
  const mobileRef = useRef(isMobile());

  useEffect(() => {
    ttsEnabledRef.current = ttsEnabled;
  }, [ttsEnabled]);

  // ─── Create persistent <audio> element for mobile ─────────────────────────
  useEffect(() => {
    if (!mobileRef.current) return;
    const audio = new Audio();
    audio.preload = 'none';
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // ─── Unlock audio on first user gesture ───────────────────────────────────
  useEffect(() => {
    const unlock = () => {
      if (unlockedRef.current) return;

      if (mobileRef.current) {
        // Play a silent/tiny audio to unlock the audio context on mobile
        const audio = audioRef.current;
        if (audio) {
          // Use a tiny silent data URI
          audio.src =
            'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
          audio.volume = 0;
          audio.play().catch(() => {});
        }
      } else {
        // Desktop: unlock Web Speech API
        const synth = window.speechSynthesis;
        if (synth) {
          try {
            const silent = new SpeechSynthesisUtterance('');
            silent.volume = 0;
            silent.rate = 10;
            synth.speak(silent);
          } catch (_) {}
        }
      }

      unlockedRef.current = true;

      // Fire any pending speak that was queued before unlock
      if (pendingRef.current) {
        const { text, callbacks } = pendingRef.current;
        pendingRef.current = null;
        setTimeout(() => doSpeak(text, callbacks), 150);
      }

      document.removeEventListener('touchstart', unlock, true);
      document.removeEventListener('click', unlock, true);
      document.removeEventListener('keydown', unlock, true);
    };

    document.addEventListener('touchstart', unlock, { once: true, capture: true });
    document.addEventListener('click', unlock, { once: true, capture: true });
    document.addEventListener('keydown', unlock, { once: true, capture: true });

    return () => {
      document.removeEventListener('touchstart', unlock, true);
      document.removeEventListener('click', unlock, true);
      document.removeEventListener('keydown', unlock, true);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Desktop: init speechSynthesis + wait for voices ──────────────────────
  useEffect(() => {
    if (mobileRef.current) {
      setVoicesReady(true); // not needed for mobile path
      return;
    }
    if (typeof window === 'undefined') return;
    const synth = window.speechSynthesis;
    synthRef.current = synth;

    const handleVoicesChanged = () => {
      if (synth.getVoices().length > 0) {
        setVoicesReady(true);
        if (pendingRef.current && unlockedRef.current) {
          const { text, callbacks } = pendingRef.current;
          pendingRef.current = null;
          doSpeak(text, callbacks);
        }
      }
    };

    synth.addEventListener('voiceschanged', handleVoicesChanged);
    if (synth.getVoices().length > 0) setVoicesReady(true);

    return () => {
      synth.removeEventListener('voiceschanged', handleVoicesChanged);
      synth.cancel();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Mobile: speak via <audio> + Google Translate TTS ─────────────────────
  const doSpeakMobile = (text, { onStart, onEnd } = {}) => {
    const audio = audioRef.current;
    if (!audio) { onEnd?.(); return; }

    // Stop previous
    audio.pause();
    audio.onended = null;
    audio.onerror = null;

    const url = buildGoogleTTSUrl(text);
    audio.src = url;
    audio.volume = 1;
    audio.playbackRate = 0.92;

    audio.oncanplay = () => {
      audio.oncanplay = null;
    };

    audio.onplay = () => {
      setIsSpeaking(true);
      onStart?.();
    };

    audio.onended = () => {
      setIsSpeaking(false);
      onEnd?.();
    };

    audio.onerror = () => {
      console.warn('TTS audio error — falling back to Web Speech API');
      setIsSpeaking(false);
      // Fallback to Web Speech API even on mobile
      doSpeakDesktop(text, { onStart, onEnd });
    };

    audio.play().catch((err) => {
      console.warn('Audio play blocked:', err);
      setIsSpeaking(false);
      onEnd?.();
    });
  };

  // ─── Desktop: speak via Web Speech API ────────────────────────────────────
  const doSpeakDesktop = (text, { onStart, onEnd } = {}) => {
    const synth = synthRef.current || window.speechSynthesis;
    if (!synth) { onEnd?.(); return; }

    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.85;
    utterance.pitch = 1.1;
    utterance.volume = 1;

    const voices = synth.getVoices();
    const voice =
      voices.find((v) => v.lang === 'ko-KR') ||
      voices.find((v) => v.lang.startsWith('ko')) ||
      voices[0] ||
      null;
    if (voice) utterance.voice = voice;

    utterance.onstart = () => { setIsSpeaking(true); onStart?.(); };
    utterance.onend = () => { setIsSpeaking(false); onEnd?.(); };
    utterance.onerror = (e) => {
      if (e.error !== 'interrupted') console.warn('TTS error:', e.error);
      setIsSpeaking(false);
      onEnd?.();
    };

    utteranceRef.current = utterance;
    synth.speak(utterance);
  };

  // ─── Unified internal speak ────────────────────────────────────────────────
  const doSpeak = (text, callbacks = {}) => {
    if (mobileRef.current) {
      doSpeakMobile(text, callbacks);
    } else {
      doSpeakDesktop(text, callbacks);
    }
  };

  // ─── Public speak API ──────────────────────────────────────────────────────
  const speak = useCallback((text, callbacks = {}) => {
    if (!ttsEnabledRef.current || !text?.trim()) {
      callbacks.onEnd?.();
      return;
    }

    // Queue until user has interacted (mobile autoplay policy)
    if (!unlockedRef.current) {
      pendingRef.current = { text, callbacks };
      return;
    }

    // Desktop: wait for voices
    if (!mobileRef.current) {
      const synth = synthRef.current || window.speechSynthesis;
      if (synth && synth.getVoices().length === 0) {
        pendingRef.current = { text, callbacks };
        return;
      }
    }

    doSpeak(text, callbacks);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = useCallback(() => {
    if (mobileRef.current) {
      const audio = audioRef.current;
      if (audio) { audio.pause(); audio.src = ''; }
    } else {
      synthRef.current?.cancel();
    }
    pendingRef.current = null;
    setIsSpeaking(false);
  }, []);

  const toggleTTS = useCallback(() => {
    setTtsEnabled((prev) => {
      const next = !prev;
      ttsEnabledRef.current = next;
      try { localStorage.setItem('pandachat_tts', String(next)); } catch {}
      if (!next) {
        if (mobileRef.current) {
          const audio = audioRef.current;
          if (audio) { audio.pause(); audio.src = ''; }
        } else {
          synthRef.current?.cancel();
        }
        pendingRef.current = null;
      }
      return next;
    });
  }, []);

  return { speak, stop, isSpeaking, ttsEnabled, voicesReady, toggleTTS };
};

export default useTTS;
