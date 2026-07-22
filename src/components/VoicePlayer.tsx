import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface VoicePlayerProps {
  src: string;
  isMe?: boolean;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({ src, isMe = false }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Точное декодирование звуковых сэмплов через Web Audio API
  useEffect(() => {
    if (!src) return;

    let isCancelled = false;

    const decodeExactDuration = async () => {
      try {
        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;

        const audioCtx = new AudioCtx();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        if (!isCancelled && audioBuffer && audioBuffer.duration > 0) {
          setDuration(audioBuffer.duration);
        }
        audioCtx.close();
      } catch (e) {
        console.error('Failed to decode audio duration:', e);
      }
    };

    decodeExactDuration();

    return () => {
      isCancelled = true;
    };
  }, [src]);

  // Отслеживание текущего времени воспроизведения
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const target = parseFloat(e.target.value);
    audio.currentTime = target;
    setCurrentTime(target);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 py-1.5 px-1 min-w-[210px] sm:min-w-[240px]">
      <audio ref={audioRef} src={src} preload="auto" />

      {/* Кнопка Play / Pause */}
      <button
        type="button"
        onClick={togglePlay}
        className={`relative h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 shadow-lg active:scale-95 ${
          isMe
            ? 'bg-white text-pink-600 hover:bg-slate-100 shadow-pink-900/30'
            : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-90 shadow-purple-950/50'
        }`}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="h-4 w-4 fill-current ml-0.5" />
        )}
        {isPlaying && (
          <span className="absolute -inset-1 rounded-full border border-pink-400/60 animate-ping pointer-events-none" />
        )}
      </button>

      <div className="flex-1 flex flex-col justify-center min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-[11px] font-bold flex items-center gap-1 ${isMe ? 'text-white' : 'text-pink-300'}`}>
            <Volume2 className="h-3 w-3 text-cyan-400" /> Голосовое
          </span>
          <span className={`text-[10px] font-mono font-semibold ${isMe ? 'text-pink-100' : 'text-slate-300'}`}>
            {isPlaying ? formatTime(currentTime) : formatTime(duration)}
          </span>
        </div>

        {/* Шкала воспроизведения с высоким контрастом */}
        <div className="relative flex items-center w-full h-2 rounded-full bg-slate-950/60 p-0.5 border border-purple-800/40 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400 transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.01"
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};