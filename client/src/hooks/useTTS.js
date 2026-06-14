import { useCallback, useRef, useState, useEffect } from 'react';

/**
 * useTTS — Korean Text-to-Speech using Web Speech API.
 * Fixes:
 *  - Voices are loaded async; we wait for voiceschanged before speaking.
 *  - synth is stored in a ref (not a const) so it is always fresh.
 *  - Stale closure bug fixed: ttsEnabled accessed via ref inside speak().
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

  // Keep ref in sync
  useEffect(() => {
    ttsEnabledRef.current = ttsEnabled;
  }, [ttsEnabled]);

  // Initialise speechSynthesis and wait for voices to load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const synth = window.speechSynthesis;
    synthRef.current = synth;

    const handleVoicesChanged = () => {
      const voices = synth.getVoices();
      if (voices.length > 0) {
        setVoicesReady(true);
        // If there was a pending speak call, fire it now
        if (pendingRef.current) {
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

  /** Internal speak — assumes synth is ready */
  const doSpeak = (synth, text, { onStart, onEnd } = {}) => {
    synth.cancel(); // stop any current speech

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
