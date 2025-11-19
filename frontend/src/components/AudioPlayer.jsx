import React, { useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

/**
 * AudioPlayer Component
 * Plays audio responses from the AI
 */
const AudioPlayer = ({ audioBlob, onEnded }) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const audioRef = useRef(null);
  const audioUrlRef = useRef(null);

  useEffect(() => {
    if (audioBlob) {
      // Create URL from blob
      const url = URL.createObjectURL(audioBlob);
      audioUrlRef.current = url;
      
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setIsPlaying(true);
      }
    }

    return () => {
      // Cleanup
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, [audioBlob]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const percent = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(percent);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    if (onEnded) onEnded();
  };

  if (!audioBlob) return null;

  return (
    <div className="glass-card p-6 animate-fadeIn">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        hidden
      />
      
      <div className="flex items-center gap-4">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlayPause}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-lumino-primary to-lumino-secondary flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-1" />
          )}
        </button>

        {/* Progress Bar */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Volume2 className="w-4 h-4 text-white/70" />
            <span className="text-sm text-white/70">
              {isPlaying ? 'Playing...' : 'Paused'}
            </span>
          </div>
          
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-lumino-primary to-lumino-accent transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
