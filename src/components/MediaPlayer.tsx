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
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Room } from '@/types/rave';
import { useRooms } from '@/context/RoomContext';
import { showError, showSuccess } from '@/utils/toast';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: any;
  }
}

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
  const { updateRoomProgress } = useRooms();
  const containerRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(room.is_playing);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCaptionsOn, setIsCaptionsOn] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const getCalculatedHostTime = () => {
    let startSec = room.playback_position_seconds || 0;
    if (room.is_playing && room.last_updated_at) {
      const elapsed = (Date.now() - new Date(room.last_updated_at).getTime()) / 1000;
      if (elapsed > 0) {
        startSec += elapsed;
      }
    }
    return Math.max(0, startSec);
  };

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

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const initPlayer = () => {
      if (!playerContainerRef.current) return;

      const startSec = getCalculatedHostTime();

      ytPlayerRef.current = new window.YT.Player(playerContainerRef.current, {
        videoId: videoId,
        playerVars: {
          autoplay: room.is_playing ? 1 : 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          autohide: 1,
          start: Math.floor(startSec),
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            if (room.is_playing) {
              event.target.playVideo();
            } else {
              event.target.pauseVideo();
            }
            event.target.setVolume(volume);
            if (startSec > 0) {
              event.target.seekTo(startSec, true);
            }
            const dur = event.target.getDuration();
            if (dur && dur > 0) setDuration(dur);
          },
          onStateChange: (event: any) => {
            if (event.data === 1) {
              setIsPlaying(true);
            } else if (event.data === 2) {
              setIsPlaying(false);
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    }

    interval = setInterval(() => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        const cur = ytPlayerRef.current.getCurrentTime();
        const dur = ytPlayerRef.current.getDuration();
        if (typeof cur === 'number') {
          setCurrentTime(cur);

          if (isHost) {
            const playerState = ytPlayerRef.current.getPlayerState?.();
            updateRoomProgress(room.id, cur, playerState === 1);
          } else {
            const targetHostTime = getCalculatedHostTime();
            if (room.is_playing && Math.abs(cur - targetHostTime) > 2.5) {
              ytPlayerRef.current.seekTo(targetHostTime, true);
            }
          }
        }
        if (typeof dur === 'number' && dur > 0) setDuration(dur);
      }
    }, 1000);

    return () => {
      if (interval) clearInterval(interval);
      if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
        ytPlayerRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (!isHost && ytPlayerRef.current) {
      if (room.is_playing && !isPlaying) {
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      } else if (!room.is_playing && isPlaying) {
        ytPlayerRef.current.pauseVideo();
        setIsPlaying(false);
      }
    }
  }, [room.is_playing, isHost]);

  useEffect(() => {
    if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
      const startSec = getCalculatedHostTime();
      ytPlayerRef.current.loadVideoById({
        videoId: videoId,
        startSeconds: startSec,
      });
      setCurrentTime(startSec);
      setDuration(0);
      if (!room.is_playing) {
        setTimeout(() => ytPlayerRef.current?.pauseVideo?.(), 200);
      }
    }
  }, [videoId]);

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

  const toggleCaptions = () => {
    const nextState = !isCaptionsOn;
    setIsCaptionsOn(nextState);
    if (ytPlayerRef.current) {
      if (nextState) {
        ytPlayerRef.current.loadModule?.('captions');
        ytPlayerRef.current.setOption?.('captions', 'track', { languageCode: 'ru' });
        showSuccess('Субтитры включены');
      } else {
        ytPlayerRef.current.unloadModule?.('captions');
        showSuccess('Субтитры выключены');
      }
    }
  };

  const handleSpeedChange = (speed: number) => {
    setCurrentSpeed(speed);
    if (ytPlayerRef.current?.setPlaybackRate) {
      ytPlayerRef.current.setPlaybackRate(speed);
      showSuccess(`Скорость: ${speed}x`);
    }
  };

  const handleTogglePlay = () => {
    if (!isHost) {
      showError('Только владелец комнаты может управлять воспроизведением!');
      return;
    }

    if (!ytPlayerRef.current) return;
    if (isPlaying) {
      ytPlayerRef.current.pauseVideo();
      setIsPlaying(false);
      updateRoomProgress(room.id, currentTime, false);
      showSuccess('Пауза');
    } else {
      ytPlayerRef.current.playVideo();
      setIsPlaying(true);
      updateRoomProgress(room.id, currentTime, true);
      showSuccess('Воспроизведение запущенно!');
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (!ytPlayerRef.current) return;

    if (newVolume === 0) {
      setIsMuted(true);
      ytPlayerRef.current.mute();
    } else {
      if (isMuted) {
        setIsMuted(false);
        ytPlayerRef.current.unMute();
      }
      ytPlayerRef.current.setVolume(newVolume);
    }
  };

  const handleToggleMute = () => {
    if (!ytPlayerRef.current) return;
    if (isMuted) {
      setIsMuted(false);
      ytPlayerRef.current.unMute();
      ytPlayerRef.current.setVolume(volume || 50);
    } else {
      setIsMuted(true);
      ytPlayerRef.current.mute();
    }
  };

  const handleSeek = (newProgressPercent: number) => {
    if (!isHost) {
      showError('Только владелец комнаты может перематывать видео!');
      return;
    }

    if (duration > 0 && ytPlayerRef.current?.seekTo) {
      const targetSeconds = (newProgressPercent / 100) * duration;
      setCurrentTime(targetSeconds);
      ytPlayerRef.current.seekTo(targetSeconds, true);
      updateRoomProgress(room.id, targetSeconds, isPlaying);
    }
  };

  const handleSyncClick = () => {
    const syncTime = getCalculatedHostTime();
    if (ytPlayerRef.current?.seekTo) {
      ytPlayerRef.current.seekTo(syncTime, true);
      if (room.is_playing) {
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      }
      showSuccess('Синхронизировано!');
    }
  };

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
      <div className="relative w-full h-full bg-black overflow-hidden flex-1">
        <div ref={playerContainerRef} className="h-full w-full pointer-events-none scale-[1.04]" />

        <div
          onClick={handleVideoAreaClick}
          className="absolute inset-0 z-10 cursor-pointer"
        />

        {!isFullscreen && (
          <div
            className={`absolute top-3 left-3 z-20 flex items-center gap-2 transition-opacity duration-300 ${
              showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="flex items-center gap-1.5 rounded-full bg-slate-950/80 backdrop-blur-md px-3 py-1 text-xs text-white border border-purple-500/40">
              <Radio className="h-3.5 w-3.5 text-pink-500 animate-pulse" />
              <span className="font-semibold text-purple-200">
                {room.is_playing ? 'Прямой эфир' : 'На паузе (ожидание владельца)'}
              </span>
            </div>

            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleSyncClick();
              }}
              size="sm"
              variant="outline"
              className="h-7 text-[11px] px-2.5 bg-slate-950/70 border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/50 rounded-full"
            >
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Синхронизировать
            </Button>
          </div>
        )}

        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute bottom-16 right-3 z-20 flex items-center gap-1 bg-slate-950/80 backdrop-blur-md p-1 rounded-full border border-purple-800/30 transition-opacity duration-300 ${
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

      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute bottom-0 inset-x-0 z-30 p-3 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent flex flex-col gap-2 transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] font-mono text-purple-200 w-10 font-bold drop-shadow">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[progressPercent]}
            max={100}
            step={0.1}
            disabled={!isHost}
            onValueChange={(val) => handleSeek(val[0])}
            className={`flex-1 ${isHost ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}
          />
          <span className="text-[10px] font-mono text-slate-300 w-10 text-right font-bold drop-shadow">
            {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              onClick={handleTogglePlay}
              size="icon"
              title={isHost ? (isPlaying ? 'Пауза' : 'Запустить') : 'Только владелец комнаты может запускать видео'}
              className={`h-9 w-9 rounded-full text-white shadow-md shrink-0 transition-all ${
                isHost
                  ? 'bg-pink-600 hover:bg-pink-500 shadow-pink-500/30'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-400'
              }`}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : isHost ? (
                <Play className="h-4 w-4 ml-0.5 fill-white" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-amber-400" />
              )}
            </Button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleMute}
                className="text-slate-200 hover:text-white transition-colors drop-shadow"
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
              <span className="text-[10px] font-mono text-slate-300 w-6 hidden sm:inline font-bold drop-shadow">
                {isMuted ? '0%' : `${volume}%`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="hidden md:inline-block truncate max-w-[150px] lg:max-w-[220px] text-xs font-semibold text-purple-200 mr-2 drop-shadow">
              {room.current_media_title || 'Трансляция'}
            </span>

            <Button
              onClick={toggleCaptions}
              size="icon"
              variant="ghost"
              className={`h-8 w-8 rounded-lg text-slate-200 hover:text-white ${
                isCaptionsOn ? 'bg-pink-950/80 text-pink-400 border border-pink-500/50' : 'hover:bg-slate-900/60'
              }`}
              title="Субтитры"
            >
              <Subtitles className="h-4 w-4" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-lg text-slate-200 hover:text-white hover:bg-slate-900/60"
                  title="Настройки плеера"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 bg-slate-900/95 backdrop-blur-md border-purple-900/60 p-2 text-slate-200 text-xs shadow-xl">
                <div className="font-semibold text-purple-300 px-2 py-1 mb-1 border-b border-purple-950">
                  Скорость воспроизведения
                </div>
                <div className="space-y-0.5">
                  {PLAYBACK_SPEEDS.map((speed) => (
                    <button
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-purple-950/60 transition-colors text-left"
                    >
                      <span>{speed === 1 ? 'Обычная (1x)' : `${speed}x`}</span>
                      {currentSpeed === speed && <Check className="h-3.5 w-3.5 text-pink-400" />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Button
              onClick={toggleFullscreen}
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-lg text-slate-200 hover:text-white hover:bg-slate-900/60"
              title={isFullscreen ? 'Свернуть' : 'На весь экран'}
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};