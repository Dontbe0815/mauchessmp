'use client';

import { useCallback, useRef, useState, useEffect } from 'react';

// Sound types
export type SoundName = 
  | 'card_play'
  | 'card_draw'
  | 'win'
  | 'invalid'
  | 'select'
  | 'game_start'
  | 'check';

// Generate simple sound effects using Web Audio API
const createSoundGenerator = (audioContext: AudioContext) => {
  const sounds: Record<SoundName, () => void> = {
    card_play: () => {
      // Short click sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    },
    card_draw: () => {
      // Whoosh sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 400;
      oscillator.type = 'triangle';
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    },
    win: () => {
      // Victory fanfare - three ascending notes
      const playNote = (freq: number, delay: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + delay);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + delay + 0.3);
        oscillator.start(audioContext.currentTime + delay);
        oscillator.stop(audioContext.currentTime + delay + 0.3);
      };
      playNote(523.25, 0);    // C5
      playNote(659.25, 0.15); // E5
      playNote(783.99, 0.3);  // G5
    },
    invalid: () => {
      // Error buzz
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 200;
      oscillator.type = 'sawtooth';
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    },
    select: () => {
      // Selection ping
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 600;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.08);
    },
    game_start: () => {
      // Start game sound - two notes
      const playNote = (freq: number, delay: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = freq;
        oscillator.type = 'triangle';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + delay);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + delay + 0.2);
        oscillator.start(audioContext.currentTime + delay);
        oscillator.stop(audioContext.currentTime + delay + 0.2);
      };
      playNote(440, 0);    // A4
      playNote(554.37, 0.1); // C#5
    },
    check: () => {
      // Check/chess sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 1000;
      oscillator.type = 'square';
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    },
  };

  return sounds;
};

export function useSound() {
  const [isMuted, setIsMuted] = useState(() => {
    // Initialize from localStorage synchronously
    if (typeof window === 'undefined') return false;
    try {
      const saved = localStorage.getItem('game-sound-muted');
      return saved === 'true';
    } catch {
      return false;
    }
  });
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize AudioContext on first user interaction
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
    };

    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });

    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
  }, []);

  // Save preference
  useEffect(() => {
    try {
      localStorage.setItem('game-sound-muted', String(isMuted));
    } catch (error) {
      console.warn('Failed to save sound preference:', error);
    }
  }, [isMuted]);

  const playSound = useCallback((name: SoundName) => {
    if (isMuted || !audioContextRef.current) return;

    try {
      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      const sounds = createSoundGenerator(audioContextRef.current);
      if (sounds[name]) {
        sounds[name]();
      }
    } catch (error) {
      console.warn('Failed to play sound:', error);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  return {
    playSound,
    isMuted,
    toggleMute,
  };
}

// Map old sound names to new ones for backwards compatibility
export const soundMap: Record<string, SoundName> = {
  your_turn: 'card_play',
  mau_mau: 'win',
  draw_card: 'card_draw',
  winner: 'win',
  reverse: 'card_play',
  skip: 'card_play',
  choose_suit: 'select',
  draw_two: 'card_draw',
  game_start: 'game_start',
  invalid: 'invalid',
  draw_again: 'card_draw',
  last_card: 'card_play',
};
