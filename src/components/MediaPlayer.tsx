import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RefreshCw,
  Volume2,
  VolumeX,
  Radio,
  Maximize,
  Minimize,
  Settings,
  Subtitles,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Room } from '@/types/rave';
import { showSuccess } from '@/utils/toast';

interface MediaPlayerProps {
  room: Room;
  isHost: boolean;
  onSendReaction: (emoji: string) => void;
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
  room,
  isHost,
  onSendReaction,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(room.is_playing);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCaptionsOn, setIsCaptionsOn] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);

  // Real video playback state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

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

  // Полноэкранный режим
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error('Exit fullscreen error:', err);
      });
    }
  };

  // Автоматическое скрытие плеера через 3.5 секунды бездействия
  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3500);
  };

  const handleVideoAreaClick = () => {
    setShowControls((prev) => !prev);
  };

  // Переключение субтитров
  const toggleCaptions = () => {
    const nextState = !isCaptionsOn;
    setIsCaptionsOn(nextState);
    if (nextState) {
      sendPlayerCommand('loadModule', ['captions']);
      sendPlayerCommand('setOption', ['captions', 'track', { languageCode: 'en' }]);
      showSuccess('Subtitles Enabled');
    } else {
      sendPlayerCommand('unloadModule', ['captions']);
      showSuccess('Subtitles Disabled');
    }
  };

  // Изменение скорости
  const handleSpeedChange = (speed: number) => {
    setCurrentSpeed(speed);
    sendPlayerCommand('setPlaybackRate', [speed]);
    showSuccess(`Playback Speed: ${speed}x`);
  };

  // Слушаем живые события от YouTube iframe API
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        if (data && data.event === 'infoDelivery' && data.info) {
          if (typeof data.info.currentTime === 'number') {
            setCurrentTime(data.info.currentTime);
          }
          if (typeof data.info.duration === 'number' && data.info.duration > 0) {
            setDuration(data.info.duration);
          }
          if (typeof data.info.playerState === 'number') {
            if (data.info.playerState === 1) setIsPlaying(true);
            if (data.info.playerState === 2) setIsPlaying(false);
          }
        }
      } catch (err) {
        // Игнорируем не-JSON сообщения
      }
    };

    window.addEventListener('message', handleMessage);

    const pingInterval = setInterval(() => {
      sendPlayerCommand('listening', []);
    }, 1000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(pingInterval);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [videoId]);

  // Сброс времени при смене видео
  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
  }, [videoId]);

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

  // Промотка видео на точную секунду
  const handleSeek = (newProgressPercent: number) => {
    if (duration > 0) {
      const targetSeconds = (newProgressPercent / 100) * duration;
      setCurrentTime(targetSeconds);
      sendPlayerCommand('seekTo', [targetSeconds, true]);
    }
  };

  // Пересинхронизация
  const handleSyncClick = () => {
    sendPlayerCommand('seekTo', [currentTime, true]);
    sendPlayerCommand('playVideo');
    setIsPlaying(true);
    showSuccess('Synchronized with Host Stream!');
  };

  const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&mute=0&controls=0&origin=${window.location.origin}`;

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleUserActivity}
      onClick={handleUserActivity}
      className={`relative flex flex-col bg-slate-950 overflow-hidden select-none transition-all group ${
        isFullscreen ? 'w-screen h-screen justify-between z-50' : 'rounded-2xl border border-purple-900/40 shadow-2xl aspect-video'
      }`}
    >
      {/* Video Container Frame */}
      <div className="relative w-full h-full bg-black overflow-hidden flex-1">
        <iframe
          ref={iframeRef}
          src={embedUrl}
          title={room.current_media_title || 'Media Stream'}
          className="h-full w-full border-0 select-none"
          allow="autoplay; encrypted-media; fullscreen"
        />

        {/* Clickable Overlay to Toggle Controls */}
        <div
          onClick={handleVideoAreaClick}
          className="absolute inset-0 z-10 cursor-pointer"
        />

        {/* Sync Status Floating Badge - скрывается в полноэкранном режиме и при отсутствии активности */}
        {!isFullscreen && (
          <div
            className={`absolute top-3 left-3 z-20 flex items-center gap-2 transition-opacity duration-300 ${
              showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
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
        )}

        {/* Floating Quick Reaction Bar */}
        <div
          className={`absolute bottom-16 right-3 z-20 flex items-center gap-1 bg-slate-950/80 backdrop-blur-md p-1 rounded-full border border-purple-800/40 transition-opacity duration-300 ${
            showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
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

      {/* Floating Control Bar Overlay (Smooth auto-hide) */}
      <div
        className={`absolute bottom-0 inset-x-0 z-30 p-3 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent flex flex-col gap-2 transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {/* Seek timeline */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] font-mono text-purple-300 w-10">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[progressPercent]}
            max={100}
            step={0.1}
            onValueChange={(val) => handleSeek(val[0])}
            className="flex-1 cursor-pointer"
          />
          <span className="text-[10px] font-mono text-slate-400 w-10 text-right">
            {formatTime(duration)}
          </span>
        </div>

        {/* Controls layout */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Play/Pause */}
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
                className="w-16 sm:w-24 cursor-pointer"
              />
              <span className="text-[10px] font-mono text-slate-400 w-6 hidden sm:inline">
                {isMuted ? '0%' : `${volume}%`}
              </span>
            </div>
          </div>

          {/* Right Player Buttons: Title, Subtitles, Settings, Fullscreen */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="hidden md:inline-block truncate max-w-[150px] lg:max-w-[220px] text-xs font-semibold text-purple-200 mr-2">
              {room.current_media_title || 'Playing Stream'}
            </span>

            {/* Subtitles Button (CC) */}
            <Button
              onClick={toggleCaptions}
              size="icon"
              variant="ghost"
              className={`h-8 w-8 rounded-lg text-slate-300 hover:text-white ${
                isCaptionsOn ? 'bg-pink-950/60 text-pink-400 border border-pink-500/50' : 'hover:bg-slate-800/80'
              }`}
              title="Subtitles / CC"
            >
              <Subtitles className="h-4 w-4" />
            </Button>

            {/* Settings Menu Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80"
                  title="Player Settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 bg-slate-900 border-purple-900/60 p-2 text-slate-200 text-xs shadow-xl">
                <div className="font-semibold text-purple-300 px-2 py-1 mb-1 border-b border-purple-950">
                  Playback Speed
                </div>
                <div className="space-y-0.5">
                  {PLAYBACK_SPEEDS.map((speed) => (
                    <button
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-purple-950/60 transition-colors text-left"
                    >
                      <span>{speed === 1 ? 'Normal (1x)' : `${speed}x`}</span>
                      {currentSpeed === speed && <Check className="h-3.5 w-3.5 text-pink-400" />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Fullscreen Button */}
            <Button
              onClick={toggleFullscreen}
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};