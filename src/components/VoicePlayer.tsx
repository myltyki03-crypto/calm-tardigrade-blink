import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic } from 'lucide-react';

interface VoicePlayerProps {
  src: string;
  isMe?: boolean;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({ src, isMe = false }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let isCalibrating = false;

    // Спец-хак для сжатых WebM записей с мобильных браузеров
    const calibrateDuration = () => {
      if (isCalibrating) return;
      isCalibrating = true;

      // Принудительно запрашиваем реальный конец аудиопотока
      audio.currentTime = 1e101;

      const handleSeekEnd = () => {
        audio.removeEventListener('timeupdate', handleSeekEnd);
        const realDuration = audio.currentTime;
        audio.currentTime = 0;
        setDuration(realDuration);
        isCalibrating = false;
      };

      audio.addEventListener('timeupdate', handleSeekEnd);
    };

    const handleTimeUpdate = () => {
      if (!isCalibrating && audio.currentTime < 1e100) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', calibrateDuration);
    audio.addEventListener('durationchange', calibrateDuration);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', calibrateDuration);
      audio.removeEventListener('durationchange', calibrateDuration);
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
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
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

  return (
    <div className="flex items-center gap-2.5 py-1 min-w-[180px] sm:min-w-[220px]">
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        type="button"
        onClick={togglePlay}
        className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md ${
          isMe
            ? 'bg-white text-purple-900 hover:bg-slate-100'
            : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
        }`}
      >
        {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <Mic className={`h-3 w-3 shrink-0 ${isMe ? 'text-pink-200' : 'text-pink-400'}`} />
          <span className={`text-[10px] font-semibold ${isMe ? 'text-pink-100' : 'text-slate-300'}`}>
            Голосовое сообщение
          </span>
        </div>

        {/* Шкала воспроизведения */}
        <div className="relative flex items-center w-full">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-black/20 accent-pink-400"
          />
        </div>

        <div className="flex justify-between items-center mt-1 text-[9px] font-mono opacity-80">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};