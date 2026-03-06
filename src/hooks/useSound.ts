'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { SoundName } from '@/lib/types';

// Sound file paths
const SOUND_PATHS: Record<SoundName, string> = {
  your_turn: '/sounds/your_turn.wav',
  mau_mau: '/sounds/mau_mau.wav',
  draw_card: '/sounds/draw_card.wav',
  winner: '/sounds/winner.wav',
  reverse: '/sounds/reverse.wav',
  skip: '/sounds/skip.wav',
  choose_suit: '/sounds/choose_suit.wav',
  draw_two: '/sounds/draw_two.wav',
  game_start: '/sounds/game_start.wav',
  invalid: '/sounds/invalid.wav',
  draw_again: '/sounds/draw_again.wav',
  last_card: '/sounds/last_card.wav',
};

// Audio cache to prevent reloading
const audioCache = new Map<string, HTMLAudioElement>();

// Preload all sounds function (defined outside hook to avoid hoisting issues)
function preloadAllSounds() {
  if (typeof window === 'undefined') return;

  Object.entries(SOUND_PATHS).forEach(([name, path]) => {
    if (!audioCache.has(name)) {
      try {
        const audio = new Audio(path);
        audio.preload = 'auto';
        audioCache.set(name, audio);
      } catch (error) {
        console.warn(`Failed to preload sound: ${name}`, error);
      }
    }
  });
}

export function useSound() {
  // Start with default values to avoid hydration mismatch
  const [isMuted, setIsMuted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const isClient = useRef(false);

  // Load saved preferences after hydration
  useEffect(() => {
    isClient.current = true;
    
    // Load saved mute preference
    try {
      const savedMuted = localStorage.getItem('maumau-muted');
      if (savedMuted !== null) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsMuted(savedMuted === 'true');
      }
    } catch (error) {
      console.warn('Failed to load mute preference:', error);
    }
    
    // Preload all sounds
    preloadAllSounds();
    setIsLoaded(true);
  }, []);

  // Save mute preference
  useEffect(() => {
    if (isClient.current) {
      try {
        localStorage.setItem('maumau-muted', String(isMuted));
      } catch (error) {
        console.warn('Failed to save mute preference:', error);
      }
    }
  }, [isMuted]);

  // Play a sound
  const playSound = useCallback((name: SoundName) => {
    if (isMuted || typeof window === 'undefined') return;

    const cachedAudio = audioCache.get(name);
    
    if (cachedAudio) {
      // Reset and play
      cachedAudio.currentTime = 0;
      cachedAudio.volume = 0.5;
      cachedAudio.play().catch((error) => {
        console.warn(`Failed to play sound: ${name}`, error);
      });
    } else {
      // Create and play new audio
      const audio = new Audio(SOUND_PATHS[name]);
      audio.volume = 0.5;
      audioCache.set(name, audio);
      audio.play().catch((error) => {
        console.warn(`Failed to play sound: ${name}`, error);
      });
    }
  }, [isMuted]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  return {
    playSound,
    isMuted,
    toggleMute,
    isLoaded,
  };
}

// Export for use in other components
export type UseSoundReturn = ReturnType<typeof useSound>;
