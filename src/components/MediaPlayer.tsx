import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RefreshCw, Volume2, VolumeX, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Room } from '@/types/rave';
import { showSuccess } from '@/utils/toast';

interface MediaPlayerProps {
  room: Room;
  isHost: boolean;
  onSendReaction: (emoji: string) => void;
}

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
  room,
  isHost,
  onSendReaction,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlaying, setIsPlaying] = useState(room.is_playing);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(15);
  const totalDurationSeconds = 300; // Примерная длительность медиа (5 минут)

  // Извлечение ID видео YouTube
  const getYouTubeVideoId = (url: string = '') => {
    let videoId = '4xDzrJKXOOY';
    if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1]?.split('&')[0] || videoId;
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0] || videoId;
    }
    return videoId;
  };

  const videoId = getYouTubeVideoId(room.current_media_url);

  // Вспомогательная функция отправки команд в YouTube Player API
  const sendPlayerCommand = (func: string, args: any[] = []) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: func,
          args: args,
        }),
        '*'
      );
    }
  };

  // Переключение воспроизведения/паузы
  const handleTogglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    if (nextState) {
      sendPlayerCommand('playVideo');
      showSuccess('Playback Resumed');
    } else {
      sendPlayerCommand('pauseVideo');
      showSuccess('Playback Paused');
    }
  };

  // Изменение громкости
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (newVolume === 0) {
      setIsMuted(true);
      sendPlayerCommand('mute');
    } else {
      if (isMuted) {
        setIsMuted(false);
        sendPlayerCommand('unMute');
      }
      sendPlayerCommand('setVolume', [newVolume]);
    }
  };

  // Включение / выключение звука
  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      sendPlayerCommand('unMute');
      sendPlayerCommand('setVolume', [volume || 50]);
    } else {
      setIsMuted(true);
      sendPlayerCommand('mute');
    }
  };

  // Промотка видео
  const handleSeek = (newProgressPercent: number) => {
    setProgress(newProgressPercent);
    const targetSeconds = (newProgressPercent / 100) * totalDurationSeconds;
    sendPlayerCommand('seekTo', [targetSeconds, true]);
  };

  // Пересинхронизация с сервером/хостом
  const handleSyncClick = () => {
    sendPlayerCommand('seekTo', [45, true]);
    sendPlayerCommand('playVideo');
    setIsPlaying(true);
    showSuccess('Synchronized with Host Stream!');
  };

  // Имитация хода таймлайна во время проигрывания
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => (prev >= 100 ? 0 : prev + 0.3));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Ссылка для YouTube Embed с включенным enablejsapi=1
  const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&mute=0&controls=0&origin=${window.location.origin}`;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentSeconds = (progress / 100) * totalDurationSeconds;

  return (
    <div className="relative flex flex-col rounded-2xl border border-purple-900/40 bg-slate-950 overflow-hidden shadow-2xl">
      {/* Video Container Frame */}
      <div className="relative aspect-video w-full bg-black overflow-hidden group">
        <iframe
          ref={iframeRef}
          src={embedUrl}
          title={room.current_media_title || 'Media Stream'}
          className="h-full w-full object-cover border-0 pointer-events-none"
          allow="autoplay; encrypted-media"
        />

        {/* Sync Status Floating Badge */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-slate-950/80 backdrop-blur-md px-3 py-1 text-xs text-white border border-purple-500/40">
            <Radio className="h-3.5 w-3.5 text-pink-500 animate-pulse" />
            <span className="font-semibold text-purple-200">LIVE SYNC</span>
          </div>

          <Button
            onClick={handleSyncClick}
            size="sm"
            variant="outline"
            className="h-7 text-[11px] px-2.5 bg-slate-950/70 border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/50 rounded-full"
          >
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Resync
          </Button>
        </div>

        {/* Floating Quick Reaction Bar */}
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 bg-slate-950/80 backdrop-blur-md p-1 rounded-full border border-purple-800/40">
          {['🔥', '❤️', '🎉', '🎧', '😮'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSendReaction(emoji)}
              className="h-7 w-7 rounded-full flex items-center justify-center text-sm hover:scale-125 hover:bg-purple-800/50 transition-all"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Control Bar Below Player */}
      <div className="p-3 bg-slate-900/90 border-t border-purple-950 flex flex-col gap-2">
        {/* Seek timeline */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] font-mono text-purple-300 w-9">
            {formatTime(currentSeconds)}
          </span>
          <Slider
            value={[progress]}
            max={100}
            step={0.1}
            onValueChange={(val) => handleSeek(val[0])}
            className="flex-1 cursor-pointer"
          />
          <span className="text-[10px] font-mono text-slate-400 w-9 text-right">
            {formatTime(totalDurationSeconds)}
          </span>
        </div>

        {/* Controls layout */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            <Button
              onClick={handleTogglePlay}
              size="icon"
              className="h-9 w-9 rounded-full bg-pink-600 hover:bg-pink-500 text-white shadow-md shadow-pink-500/30 shrink-0"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5 fill-white" />}
            </Button>

            {/* Volume Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleMute}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4 text-red-400" />
                ) : (
                  <Volume2 className="h-4 w-4 text-cyan-400" />
                )}
              </button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={100}
                step={1}
                onValueChange={(val) => handleVolumeChange(val[0])}
                className="w-20 md:w-28 cursor-pointer"
              />
              <span className="text-[10px] font-mono text-slate-400 w-6">
                {isMuted ? '0%' : `${volume}%`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="truncate max-w-[120px] sm:max-w-[220px] font-semibold text-purple-200">
              {room.current_media_title || 'Playing Stream'}
            </span>
            {isHost && (
              <span className="hidden sm:inline-block text-[10px] bg-purple-950 border border-purple-700/50 text-purple-300 px-2 py-0.5 rounded-full">
                Host Controls
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};