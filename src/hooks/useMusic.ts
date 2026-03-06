'use client';

import { useCallback, useRef, useState, useEffect } from 'react';

const MUSIC_PATH = '/music/background.mp3';

export function useMusic() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    // Initialize from localStorage synchronously
    if (typeof window === 'undefined') return true;
    try {
      const saved = localStorage.getItem('game-music-muted');
      return saved === 'true';
    } catch {
      return true;
    }
  });
  const [volume, setVolume] = useState(0.3);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasInteracted = useRef(false);

  // Initialize audio
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const audio = new Audio(MUSIC_PATH);
    audio.loop = true;
    audio.volume = volume;
    audioRef.current = audio;

    // Handle first user interaction to enable audio
    const handleInteraction = () => {
      if (!hasInteracted.current) {
        hasInteracted.current = true;
        // If user hasn't explicitly muted, start playing
        const savedMuted = localStorage.getItem('game-music-muted');
        if (savedMuted === null || savedMuted === 'false') {
          setIsMuted(false);
        }
      }
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);

    return () => {
      audio.pause();
      audio.src = '';
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, [volume]);

  // Save preferences
  useEffect(() => {
    try {
      localStorage.setItem('game-music-muted', String(isMuted));
    } catch (error) {
      console.warn('Failed to save music preferences:', error);
    }
  }, [isMuted]);

  // Play/pause based on muted state
  useEffect(() => {
    if (!audioRef.current) return;

    if (isMuted) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().then(() => {
        // Only set state if we actually started playing
      }).catch(() => {
        // Autoplay blocked - this is expected
      });
    }
  }, [isMuted]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const toggleMusic = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const setVolumeLevel = useCallback((level: number) => {
    setVolume(Math.max(0, Math.min(1, level)));
  }, []);

  return {
    isPlaying,
    isMuted,
    volume,
    toggleMusic,
    setVolume: setVolumeLevel,
  };
}
