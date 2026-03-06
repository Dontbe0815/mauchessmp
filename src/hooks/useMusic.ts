'use client';

import { useCallback, useRef, useState, useEffect } from 'react';

const MUSIC_PATH = '/music/background.mp3';

export function useMusic() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [isLoaded, setIsLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const audio = new Audio(MUSIC_PATH);
    audio.loop = true;
    audio.volume = 0.3;
    audioRef.current = audio;

    // Load saved preferences
    try {
      const savedMuted = localStorage.getItem('game-music-muted');
      const savedVolume = localStorage.getItem('game-music-volume');
      
      if (savedMuted !== null) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsMuted(savedMuted === 'true');
      }
      if (savedVolume !== null) {
        const vol = parseFloat(savedVolume);
        setVolume(vol);
        audio.volume = vol;
      }
    } catch (error) {
      console.warn('Failed to load music preferences:', error);
    }

    setIsLoaded(true);

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Save preferences
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('game-music-muted', String(isMuted));
      localStorage.setItem('game-music-volume', String(volume));
    } catch (error) {
      console.warn('Failed to save music preferences:', error);
    }
  }, [isMuted, volume, isLoaded]);

  // Play/pause based on muted state
  useEffect(() => {
    if (!audioRef.current || !isLoaded) return;

    if (isMuted) {
      audioRef.current.pause();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {
        // Autoplay blocked, will play on user interaction
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPlaying(true);
    }
  }, [isMuted, isLoaded]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const toggleMusic = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const play = useCallback(() => {
    if (audioRef.current && !isMuted) {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isMuted]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const setVolumeLevel = useCallback((level: number) => {
    setVolume(Math.max(0, Math.min(1, level)));
  }, []);

  return {
    isPlaying,
    isMuted,
    volume,
    isLoaded,
    toggleMusic,
    play,
    pause,
    setVolume: setVolumeLevel,
  };
}
