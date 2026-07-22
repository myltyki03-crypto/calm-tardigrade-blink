import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RefreshCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Lock,
  Tv,
  SkipForward,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Room } from '@/types/rave';
import { useRooms } from '@/context/RoomContext';
import { parseMediaUrl, MediaInfo } from '@/utils/mediaUtils';
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
  onSendReaction?: (emoji: string) => void;
}

const RAVE_REACTIONS = ['❤️', '🔥', '😂', '🎉', '💩', '😮'];

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
  room,
  isHost,
}) => {
  const { updateRoomProgress, voteToSkip, sendMessage, currentUser } = useRooms();
  const containerRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const lastHostSyncSaveRef = useRef<number>(0);
  const prevLastUpdatedRef = useRef<string | undefined>(room.last_updated_at);

  const mediaInfo: MediaInfo = parseMediaUrl(room.current_media_url || '');

  const [isPlaying, setIsPlaying] = useState(room.is_playing);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [needUserGesture, setNeedUserGesture] = useState(false);

  // Состояние с визуальными эффектами парящих эмодзи поверх видео
  const [floatingEmojis, setFloatingEmojis] = useState<
    { id: string; emoji: string; leftPercent: number }[]
  >([]);

  const triggerFloatingEmoji = (emoji: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const leftPercent = Math.floor(Math.random() * 80) + 10;

    setFloatingEmojis((prev) => [...prev, { id, emoji, leftPercent }]);

    // Отправляем короткое системное сообщение о реакции в чат
    sendMessage(room.id, {
      id: `rx-${Date.now()}-${id}`,
      room_id: room.id,
      user_id: currentUser.id,
      user_name: currentUser.username,
      user_avatar: currentUser.avatar_url,
      message: `${currentUser.username} ${emoji}`,
      type: 'reaction',
      reaction_symbol: emoji,
      created_at: new Date().toISOString(),
    });

    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
    }, 2200);
  };

  const forceDisableCaptions = () => {
    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.unloadModule?.('captions');
        ytPlayerRef.current.setOption?.('captions', 'track', {});
        ytPlayerRef.current.setOption?.('cc', 'track', {});
      } catch (e) {}
    }
  };

  const getCalculatedHostTime = () => {
    let startSec = room.playback_position_seconds || 0;
    if (room.is_playing && room.last_updated_at) {
      const elapsed = (Date.now() - new Date(room.last_updated_at).getTime()) / 1000;
      if (elapsed > 0 && elapsed < 86400) {
        startSec += elapsed;
      }
    }
    return Math.max(0, startSec);
  };

  useEffect(() => {
    if (mediaInfo.type === 'direct' && videoElementRef.current) {
      const v = videoElementRef.current;
      v.volume = volume / 100;
      v.muted = isMuted;

      const handleTimeUpdate = () => {
        setCurrentTime(v.currentTime);
        if (v.duration) setDuration(v.duration);
      };

      v.addEventListener('timeupdate', handleTimeUpdate);
      return () => v.removeEventListener('timeupdate', handleTimeUpdate);
    }
  }, [mediaInfo.type]);

  useEffect(() => {
    if (mediaInfo.type !== 'youtube') return;

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    let interval: NodeJS.Timeout | null = null;

    const initPlayer = () => {
      if (!playerContainerRef.current) return;

      const startSec = getCalculatedHostTime();

      ytPlayerRef.current = new window.YT.Player(playerContainerRef.current, {
        videoId: mediaInfo.id,
        playerVars: {
          autoplay: room.is_playing ? 1 : 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          cc_load_policy: 0,
          autohide: 1,
          playsinline: 1,
          start: Math.floor(startSec),
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            event.target.setVolume(volume);
            forceDisableCaptions();

            if (startSec > 0) {
              event.target.seekTo(startSec, true);
            }
            if (room.is_playing) {
              const playPromise = event.target.playVideo();
              if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => setNeedUserGesture(true));
              }
            } else {
              event.target.pauseVideo();
            }
            const dur = event.target.getDuration();
            if (dur && dur > 0) setDuration(dur);
          },
          onStateChange: (event: any) => {
            forceDisableCaptions();
            if (event.data === 1) {
              setIsPlaying(true);
              setNeedUserGesture(false);
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
      window.onYouTubeIframeAPIReady = () => initPlayer();
    }

    interval = setInterval(() => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        const cur = ytPlayerRef.current.getCurrentTime();
        const dur = ytPlayerRef.current.getDuration();
        const now = Date.now();

        forceDisableCaptions();

        if (typeof cur === 'number') {
          setCurrentTime(cur);
          if (isHost && now - lastHostSyncSaveRef.current > 6000) {
            lastHostSyncSaveRef.current = now;
            if (ytPlayerRef.current.getPlayerState?.() === 1) {
              updateRoomProgress(room.id, cur, true);
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
  }, [mediaInfo.type, mediaInfo.id]);

  useEffect(() => {
    if (!isHost && room.last_updated_at !== prevLastUpdatedRef.current) {
      prevLastUpdatedRef.current = room.last_updated_at;
      const targetHostTime = getCalculatedHostTime();

      if (mediaInfo.type === 'youtube' && ytPlayerRef.current?.seekTo) {
        let localTime = 0;
        try {
          localTime = ytPlayerRef.current.getCurrentTime?.() || 0;
        } catch (err) {}

        if (Math.abs(localTime - targetHostTime) > 10.0) {
          ytPlayerRef.current.seekTo(targetHostTime, true);
        }

        if (room.is_playing) {
          ytPlayerRef.current.playVideo?.();
          setIsPlaying(true);
        } else {
          ytPlayerRef.current.pauseVideo?.();
          setIsPlaying(false);
        }
      } else if (mediaInfo.type === 'direct' && videoElementRef.current) {
        const v = videoElementRef.current;
        if (Math.abs(v.currentTime - targetHostTime) > 3.0) {
          v.currentTime = targetHostTime;
        }
        if (room.is_playing) {
          v.play().catch(() => setNeedUserGesture(true));
          setIsPlaying(true);
        } else {
          v.pause();
          setIsPlaying(false);
        }
      }
    }
  }, [room.last_updated_at, room.playback_position_seconds, room.is_playing, isHost, mediaInfo.type]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleMobileUnlockClick = () => {
    if (mediaInfo.type === 'youtube' && ytPlayerRef.current) {
      const syncTime = getCalculatedHostTime();
      ytPlayerRef.current.unMute();
      ytPlayerRef.current.setVolume(volume || 80);
      ytPlayerRef.current.seekTo(syncTime, true);
      ytPlayerRef.current.playVideo();
    } else if (mediaInfo.type === 'direct' && videoElementRef.current) {
      videoElementRef.current.muted = false;
      videoElementRef.current.play();
    }
    setIsMuted(false);
    setIsPlaying(true);
    setNeedUserGesture(false);
    forceDisableCaptions();
    showSuccess('Воспроизведение запущенно!');
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.error(err));
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
    }
  };

  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
  };

  const handleTogglePlay = () => {
    if (needUserGesture) {
      handleMobileUnlockClick();
      return;
    }

    if (!isHost) {
      showError('Только владелец комнаты может управлять воспроизведением!');
      return;
    }

    if (mediaInfo.type === 'youtube' && ytPlayerRef.current) {
      if (isPlaying) {
        ytPlayerRef.current.pauseVideo();
        setIsPlaying(false);
        updateRoomProgress(room.id, currentTime, false);
      } else {
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
        updateRoomProgress(room.id, currentTime, true);
        forceDisableCaptions();
      }
    } else if (mediaInfo.type === 'direct' && videoElementRef.current) {
      if (isPlaying) {
        videoElementRef.current.pause();
        setIsPlaying(false);
        updateRoomProgress(room.id, videoElementRef.current.currentTime, false);
      } else {
        videoElementRef.current.play();
        setIsPlaying(true);
        updateRoomProgress(room.id, videoElementRef.current.currentTime, true);
      }
    } else if (mediaInfo.type === 'twitch') {
      const nextPlaying = !isPlaying;
      setIsPlaying(nextPlaying);
      updateRoomProgress(room.id, currentTime, nextPlaying);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (mediaInfo.type === 'youtube' && ytPlayerRef.current) {
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
    } else if (mediaInfo.type === 'direct' && videoElementRef.current) {
      videoElementRef.current.volume = newVolume / 100;
      setIsMuted(newVolume === 0);
    }
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (mediaInfo.type === 'youtube' && ytPlayerRef.current) {
      if (nextMute) ytPlayerRef.current.mute();
      else {
        ytPlayerRef.current.unMute();
        ytPlayerRef.current.setVolume(volume || 50);
      }
    } else if (mediaInfo.type === 'direct' && videoElementRef.current) {
      videoElementRef.current.muted = nextMute;
    }
  };

  const handleSeek = (newProgressPercent: number) => {
    if (!isHost) {
      showError('Только владелец комнаты может перематывать!');
      return;
    }

    if (duration > 0) {
      const targetSeconds = (newProgressPercent / 100) * duration;
      setCurrentTime(targetSeconds);
      if (mediaInfo.type === 'youtube' && ytPlayerRef.current?.seekTo) {
        ytPlayerRef.current.seekTo(targetSeconds, true);
      } else if (mediaInfo.type === 'direct' && videoElementRef.current) {
        videoElementRef.current.currentTime = targetSeconds;
      }
      updateRoomProgress(room.id, targetSeconds, isPlaying);
    }
  };

  const handleSyncClick = () => {
    const syncTime = getCalculatedHostTime();
    if (mediaInfo.type === 'youtube' && ytPlayerRef.current?.seekTo) {
      ytPlayerRef.current.seekTo(syncTime, true);
      if (room.is_playing) {
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      }
      forceDisableCaptions();
    } else if (mediaInfo.type === 'direct' && videoElementRef.current) {
      videoElementRef.current.currentTime = syncTime;
      if (room.is_playing) {
        videoElementRef.current.play();
        setIsPlaying(true);
      }
    }
    showSuccess('Синхронизировано!');
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const currentHostname = window.location.hostname || 'localhost';

  const skipVotesCount = room.skip_votes?.length || 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleUserActivity}
      onClick={handleUserActivity}
      className={`relative flex flex-col bg-slate-950 overflow-hidden select-none transition-all group ${
        isFullscreen ? 'w-screen h-screen justify-between z-50' : 'rounded-2xl border-2 border-pink-500/30 shadow-2xl shadow-purple-500/20 aspect-video'
      }`}
    >
      <div className="relative w-full h-full bg-black overflow-hidden flex-1 aspect-video">
        {/* АНИМАЦИЯ ПАРЯЩИХ СМАЙЛОВ В СТИЛЕ RAVE */}
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
          {floatingEmojis.map((e) => (
            <div
              key={e.id}
              style={{ left: `${e.leftPercent}%` }}
              className="absolute bottom-10 text-4xl sm:text-5xl animate-[bounce_1.5s_ease-out_infinite] transition-all duration-1000 ease-out drop-shadow-[0_0_15px_rgba(236,72,153,0.8)]"
            >
              {e.emoji}
            </div>
          ))}
        </div>

        {/* РЕНДЕР YOUTUBE */}
        {mediaInfo.type === 'youtube' && (
          <div
            ref={playerContainerRef}
            className="absolute inset-0 w-full h-full pointer-events-none [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:pointer-events-none"
          />
        )}

        {/* РЕНДЕР TWITCH */}
        {mediaInfo.type === 'twitch' && (
          <iframe
            src={`https://player.twitch.tv/?${
              mediaInfo.twitchType === 'video' ? `video=${mediaInfo.id}` : `channel=${mediaInfo.id}`
            }&parent=${currentHostname}&autoplay=${room.is_playing ? 'true' : 'false'}&muted=false`}
            className="absolute inset-0 w-full h-full border-0"
            allowFullScreen
          />
        )}

        {/* РЕНДЕР DIRECT VIDEO (MP4) */}
        {mediaInfo.type === 'direct' && (
          <video
            ref={videoElementRef}
            src={mediaInfo.url}
            className="absolute inset-0 w-full h-full object-contain bg-black"
            playsInline
          />
        )}

        <div
          onClick={() => setShowControls((prev) => !prev)}
          className="absolute inset-0 z-10 cursor-pointer pointer-events-auto"
        />

        {/* Левый верхний блок синхронизации и пропуска */}
        {!isFullscreen && !needUserGesture && (
          <div
            className={`absolute top-3 left-3 z-20 flex items-center gap-2 transition-opacity duration-300 ${
              showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            {mediaInfo.type !== 'twitch' && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSyncClick();
                }}
                size="sm"
                variant="outline"
                className="h-7 text-[11px] px-2.5 bg-slate-950/80 border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/60 rounded-full shadow-lg backdrop-blur-md"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Синхронизировать
              </Button>
            )}

            {/* Кнопка Skip Vote (Голосование за пропуск) */}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                voteToSkip(room.id);
              }}
              size="sm"
              className="h-7 text-[11px] px-2.5 bg-pink-950/90 border border-pink-500/50 text-pink-300 hover:bg-pink-900 rounded-full shadow-lg backdrop-blur-md font-bold gap-1"
            >
              <SkipForward className="h-3 w-3 text-pink-400" />
              <span>Пропустить ({skipVotesCount})</span>
            </Button>
          </div>
        )}

        {/* RAVE ЭКРАННАЯ ПАНЕЛЬ СМАЙЛИКОВ-РЕАКЦИЙ ПРЯМО ПОВЕРХ ВИДЕО */}
        <div
          className={`absolute bottom-16 right-3 z-30 flex items-center gap-1.5 p-1.5 rounded-full bg-slate-950/80 border border-pink-500/40 backdrop-blur-md shadow-xl transition-all duration-300 ${
            showControls ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {RAVE_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => triggerFloatingEmoji(emoji)}
              className="h-8 w-8 rounded-full bg-purple-950/60 hover:bg-pink-600/80 hover:scale-125 active:scale-95 text-base flex items-center justify-center transition-all duration-150 border border-purple-800/40"
              title={`Запустить реакцию ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Бейдж Twitch */}
        {mediaInfo.type === 'twitch' && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/90 border border-purple-500/50 text-purple-200 text-xs font-bold backdrop-blur-md">
            <Tv className="h-3.5 w-3.5 text-pink-400" /> Twitch Стрим
          </div>
        )}

        {(needUserGesture || (!isPlaying && room.is_playing && !isHost && mediaInfo.type !== 'twitch')) && (
          <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
            <Button
              onClick={handleMobileUnlockClick}
              size="lg"
              className="bg-gradient-to-r from-purple-600 via-pink-600 to-pink-500 hover:opacity-90 text-white font-bold text-xs sm:text-sm h-11 px-6 rounded-2xl shadow-xl shadow-pink-500/40 animate-bounce gap-2"
            >
              <Play className="h-5 w-5 fill-white" />
              <span>Нажмите для запуска видео и звука</span>
            </Button>
          </div>
        )}
      </div>

      {/* Панель управления плером */}
      {mediaInfo.type !== 'twitch' && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute bottom-0 inset-x-0 z-30 p-3 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent flex flex-col gap-2 transition-all duration-300 ${
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
      )}
    </div>
  );
};