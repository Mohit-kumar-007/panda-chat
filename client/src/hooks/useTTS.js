import { useCallback, useRef, useState, useEffect } from 'react';

/**
 * useTTS — Korean Text-to-Speech using Web Speech API.
 *
 * Mobile fix: iOS Safari and Android Chrome block speechSynthesis.speak()
 * until the user has interacted with the page. We "unlock" it by speaking
 * a silent utterance on the first user tap anywhere on the page.
 */
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

  const synthRef = useRef(null);
  const ttsEnabledRef = useRef(ttsEnabled);   // always-current ref
  const utteranceRef = useRef(null);
  const pendingRef = useRef(null);             // speak call waiting for voices
  const unlockedRef = useRef(false);           // whether audio is unlocked on mobile

  // Keep ref in sync
  useEffect(() => {
    ttsEnabledRef.current = ttsEnabled;
  }, [ttsEnabled]);

  // ─── Unlock audio on first user gesture (critical for mobile) ─────────────
  // iOS Safari and Android Chrome require a user gesture before any audio.
  // We speak a zero-length utterance on the first tap to "unlock" the engine.
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    const unlock = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;

      // Speak a blank utterance — this satisfies the browser's gesture requirement
      try {
        const silent = new SpeechSynthesisUtterance('');
        silent.volume = 0;
        silent.rate = 10; // make it instant
        synth.speak(silent);
      } catch (_) {}

      // If there was already a pending speak, fire it now
      if (pendingRef.current) {
        const { text, callbacks } = pendingRef.current;
        pendingRef.current = null;
        // Small delay to let the unlock settle
        setTimeout(() => doSpeak(synth, text, callbacks), 100);
      }

      document.removeEventListener('touchstart', unlock, true);
      document.removeEventListener('click', unlock, true);
      document.removeEventListener('keydown', unlock, true);
    };

    // Listen on capture phase so we catch the gesture as early as possible
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

  // ─── Initialise speechSynthesis and wait for voices ───────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const synth = window.speechSynthesis;
    synthRef.current = synth;

    const handleVoicesChanged = () => {
      const voices = synth.getVoices();
      if (voices.length > 0) {
        setVoicesReady(true);
        // If there was a pending speak call, fire it now
        if (pendingRef.current && unlockedRef.current) {
          const { text, callbacks } = pendingRef.current;
          pendingRef.current = null;
          doSpeak(synth, text, callbacks);
        }
      }
    };

    synth.addEventListener('voiceschanged', handleVoicesChanged);

    // Voices may already be available
    if (synth.getVoices().length > 0) {
      setVoicesReady(true);
    }

    return () => {
      synth.removeEventListener('voiceschanged', handleVoicesChanged);
      synth.cancel();
    };
  }, []);

  /** Pick best Korean voice */
  const getKoreanVoice = (synth) => {
    const voices = synth.getVoices();
    return (
      voices.find((v) => v.lang === 'ko-KR') ||
      voices.find((v) => v.lang.startsWith('ko')) ||
      voices[0] ||           // last resort: any voice
      null
    );
  };

  /** Internal speak — assumes synth is ready and audio is unlocked */
  const doSpeak = (synth, text, { onStart, onEnd } = {}) => {
    // Chrome bug: synth gets stuck after ~15 utterances without this
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.85;
    utterance.pitch = 1.1;
    utterance.volume = 1;

    const voice = getKoreanVoice(synth);
    if (voice) utterance.voice = voice;

    utterance.onstart = () => {
      setIsSpeaking(true);
      onStart?.();
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      onEnd?.();
    };
    utterance.onerror = (e) => {
      // 'interrupted' is expected when synth.cancel() is called — not a real error
      if (e.error !== 'interrupted') {
        console.warn('TTS error:', e.error);
      }
      setIsSpeaking(false);
      onEnd?.();
    };

    utteranceRef.current = utterance;
    synth.speak(utterance);
  };

  const speak = useCallback((text, callbacks = {}) => {
    if (!ttsEnabledRef.current || !text?.trim()) {
      callbacks.onEnd?.();
      return;
    }

    const synth = synthRef.current;
    if (!synth) {
      callbacks.onEnd?.();
      return;
    }

    // If audio hasn't been unlocked yet (no user gesture), queue and wait
    if (!unlockedRef.current) {
      pendingRef.current = { text, callbacks };
      return;
    }

    if (synth.getVoices().length === 0) {
      // Voices not ready yet — queue this speak call
      pendingRef.current = { text, callbacks };
      return;
    }

    doSpeak(synth, text, callbacks);
  }, []); // no deps needed — everything is accessed via refs

  const stop = useCallback(() => {
    synthRef.current?.cancel();
    pendingRef.current = null;
    setIsSpeaking(false);
  }, []);

  const toggleTTS = useCallback(() => {
    setTtsEnabled((prev) => {
      const next = !prev;
      ttsEnabledRef.current = next;
      try {
        localStorage.setItem('pandachat_tts', String(next));
      } catch {}
      if (!next) {
        synthRef.current?.cancel();
        pendingRef.current = null;
      }
      return next;
    });
  }, []);

  return { speak, stop, isSpeaking, ttsEnabled, voicesReady, toggleTTS };
};

export default useTTS;
