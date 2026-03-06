'use client';

import { Button } from '@/components/ui/button';
import { Music, Music2, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MusicToggleProps {
  isMuted: boolean;
  onToggle: () => void;
  variant?: 'icon' | 'button';
  className?: string;
}

export function MusicToggle({ 
  isMuted, 
  onToggle, 
  variant = 'icon',
  className 
}: MusicToggleProps) {
  if (variant === 'button') {
    return (
      <Button
        onClick={onToggle}
        variant="outline"
        className={cn(
          'gap-2 transition-all duration-300',
          isMuted 
            ? 'bg-gray-100 hover:bg-gray-200 text-gray-600' 
            : 'bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300',
          className
        )}
      >
        {isMuted ? (
          <>
            <VolumeX className="w-4 h-4" />
            <span className="hidden sm:inline">Musik aus</span>
          </>
        ) : (
          <>
            <Music2 className="w-4 h-4 animate-pulse" />
            <span className="hidden sm:inline">Musik an</span>
          </>
        )}
      </Button>
    );
  }

  return (
    <Button
      onClick={onToggle}
      variant="ghost"
      size="icon"
      className={cn(
        'rounded-full transition-all duration-300',
        isMuted 
          ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100' 
          : 'text-purple-600 hover:text-purple-700 hover:bg-purple-100',
        className
      )}
      title={isMuted ? 'Musik einschalten' : 'Musik ausschalten'}
    >
      {isMuted ? (
        <VolumeX className="w-5 h-5" />
      ) : (
        <Music className="w-5 h-5 animate-pulse" />
      )}
    </Button>
  );
}

export default MusicToggle;
