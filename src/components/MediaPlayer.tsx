import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  AlertCircle,
  Zap,
  Monitor,
  Square,
  Radio,
  Loader2,
  Volume2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Room } from '@/types/rave';
import { useRooms } from '@/context/RoomContext';
import { parseMediaUrl, getEmbedUrlWithTime, MediaInfo } from '@/utils/mediaUtils';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { showSuccess, showError } from '@/utils/toast';
import { VideoReactionsOverlay } from '@/components/media/VideoReactionsOverlay';
import { MediaControlsOverlay } from '@/components/media/MediaControlsOverlay';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: any;
  }
}

interface MediaPlayerProps {
  room: Room;
  isHost: boolean;
  floatingReactions?: { id: string; emoji: string; x: number }[];
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
  room,
  isHost,
  floatingReactions = [],
}) => {
  const { currentUser, updateRoomProgress, setRoomScreenShareState } = useRooms();
  const containerRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const screenShareVideoRef = useRef<HTMLVideoElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebRTC и Демонстрация экрана
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [fallbackFrame, setFallbackFrame] = useState<string | null>(null);
  const [needAudioClick, setNeedAudioClick] = useState<boolean>(false);

  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const viewerPeerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const webrtcChannelRef = useRef<any>(null);
  const syncChannelRef = useRef<any>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const canvasIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const lastHostSyncSaveRef = useRef<number>(0);
  const prevLastUpdatedRef = useRef<string | undefined>(room.last_updated_at);

  // Сохраненные параметры вещания владельца
  const latestHostTimeRef = useRef<{ time: number; isPlaying: boolean; timestamp: number } | null>(null);

  const mediaInfo: MediaInfo = parseMediaUrl(room.current_media_url || '');

  const [isPlaying, setIsPlaying] = useState(room.is_playing);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const [currentTime, setCurrentTime] = useState(room.playback_position_seconds || 0);
  const [duration, setDuration] = useState(0);
  const [needUserGesture, setNeedUserGesture] = useState(false);
  const [isEmbedBlocked, setIsEmbedBlocked] = useState(false);

  // Ключ пересборки iframe для мгновенной отмотки
  const [iframeKey, setIframeKey] = useState<number>(Date.now());

  const [iframeSrc, setIframeSrc] = useState<string>(() => {
    return getEmbedUrlWithTime(mediaInfo, room.playback_position_seconds || 0, false);
  });

  // Получить реальное текущее время с плеера владельца
  const getHostLiveTime = (): number => {
    if (mediaInfo.type === 'youtube' && ytPlayerRef.current?.getCurrentTime) {
      try {
        const cur = ytPlayerRef.current.getCurrentTime();
        if (typeof cur === 'number' && !isNaN(cur)) return cur;
      } catch {}
    } else if (mediaInfo.type === 'direct' && videoElementRef.current) {
      return videoElementRef.current.currentTime || currentTime;
    }
    return currentTime;
  };

  // Автоматическое скрытие органов управления
  useEffect(() => {
    if (isPlaying) {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    } else {
      setShowControls(true);
    }

    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  const isScreenSharingActive =
    Boolean(room.is_screen_sharing) || Boolean(screenStream) || Boolean(remoteStream) || Boolean(fallbackFrame);

  const isIframePlayer =
    !isScreenSharingActive &&
    (mediaInfo.type === 'vk' ||
      mediaInfo.type === 'rutube' ||
      mediaInfo.type === 'vimeo' ||
      mediaInfo.type === 'ok' ||
      mediaInfo.type === 'iframe');

  // ДВУХКАНАЛЬНАЯ СИНХРОНИЗАЦИЯ (BroadcastChannel API + Supabase Realtime)
  useEffect(() => {
    // 1. Межвкладочный радиоканал BroadcastChannel (работает в любом браузере)
    try {
      const bc = new BroadcastChannel('pulserave_sync_' + room.id);
      broadcastChannelRef.current = bc;

      bc.onmessage = (event) => {
        const data = event.data;
        if (!data) return;

        if (data.type === 'REQUEST_HOST_TIME' && isHost) {
          const liveTime = getHostLiveTime();
          bc.postMessage({
            type: 'HOST_TIME_REPLY',
            time: liveTime,
            isPlaying: isPlaying,
            timestamp: Date.now(),
          });
        } else if (data.type === 'HOST_TIME_REPLY' && !isHost) {
          latestHostTimeRef.current = {
            time: data.time,
            isPlaying: data.isPlaying,
            timestamp: data.timestamp || Date.now(),
          };
          applyHostTime(data.time, data.isPlaying, data.timestamp);
        }
      };
    } catch (e) {
      console.error('BroadcastChannel unsupported:', e);
    }

    // 2. Supabase Realtime Канал (если подключен Supabase)
    if (isSupabaseConfigured && supabase) {
      const channelName = 'room-playback-sync-' + room.id;
      const channel = supabase.channel(channelName, {
        config: { broadcast: { self: false } },
      });

      channel
        .on('broadcast', { event: 'request_host_time' }, () => {
          if (isHost) {
            const liveTime = getHostLiveTime();
            channel.send({
              type: 'broadcast',
              event: 'host_time_update',
              payload: { time: liveTime, isPlaying: isPlaying, timestamp: Date.now() },
            });
          }
        })
        .on('broadcast', { event: 'host_time_update' }, ({ payload }) => {
          if (!isHost && payload) {
            latestHostTimeRef.current = {
              time: payload.time,
              isPlaying: payload.isPlaying,
              timestamp: payload.timestamp || Date.now(),
            };
            applyHostTime(payload.time, payload.isPlaying, payload.timestamp);
          }
        })
        .subscribe();

      syncChannelRef.current = channel;
    }

    // Ведущий постоянно отправляет отбивки времени
    let hostTimer: NodeJS.Timeout | null = null;
    if (isHost) {
      hostTimer = setInterval(() => {
        const liveTime = getHostLiveTime();
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({
            type: 'HOST_TIME_REPLY',
            time: liveTime,
            isPlaying: isPlaying,
            timestamp: Date.now(),
          });
        }
        if (syncChannelRef.current) {
          syncChannelRef.current.send({
            type: 'broadcast',
            event: 'host_time_update',
            payload: { time: liveTime, isPlaying: isPlaying, timestamp: Date.now() },
          });
        }
      }, 2000);
    }

    return () => {
      if (hostTimer) clearInterval(hostTimer);
      if (broadcastChannelRef.current) broadcastChannelRef.current.close();
      if (syncChannelRef.current && supabase) supabase.removeChannel(syncChannelRef.current);
    };
  }, [room.id, isHost, isPlaying, currentTime, mediaInfo.type]);

  // Применение полученного времени ведущего к плееру зрителя
  const applyHostTime = (targetTime: number, hostIsPlaying: boolean, msgTimestamp?: number) => {
    let exactTime = targetTime;
    if (hostIsPlaying && msgTimestamp) {
      const elapsed = (Date.now() - msgTimestamp) / 1000;
      if (elapsed > 0 && elapsed < 300) exactTime += elapsed;
    }

    setCurrentTime(exactTime);
    setIsPlaying(hostIsPlaying);

    if (mediaInfo.type === 'youtube' && ytPlayerRef.current?.seekTo) {
      ytPlayerRef.current.seekTo(exactTime, true);
      if (hostIsPlaying) {
        ytPlayerRef.current.playVideo();
      } else {
        ytPlayerRef.current.pauseVideo();
      }
      forceDisableCaptions();
    } else if (mediaInfo.type === 'direct' && videoElementRef.current) {
      videoElementRef.current.currentTime = exactTime;
      if (hostIsPlaying) {
        videoElementRef.current.play().catch(() => setNeedUserGesture(true));
      } else {
        videoElementRef.current.pause();
      }
    } else if (isIframePlayer) {
      const newUrl = getEmbedUrlWithTime(mediaInfo, exactTime, hostIsPlaying);
      setIframeSrc(newUrl);
      setIframeKey(Date.now());
    }
  };

  // Местный таймер тиков для iframe плеера ведущего
  useEffect(() => {
    if (isIframePlayer) {
      let interval: NodeJS.Timeout | null = null;
      if (isPlaying) {
        interval = setInterval(() => {
          setCurrentTime((prev) => {
            const next = prev + 1;
            if (isHost && Date.now() - lastHostSyncSaveRef.current > 3000) {
              lastHostSyncSaveRef.current = Date.now();
              updateRoomProgress(room.id, next, true);
            }
            return next;
          });
        }, 1000);
      }
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [isPlaying, isHost, isIframePlayer, room.id]);

  useEffect(() => {
    setIsEmbedBlocked(false);
    const initialSec = room.playback_position_seconds || 0;
    setCurrentTime(initialSec);
    setIframeSrc(getEmbedUrlWithTime(mediaInfo, initialSec, false));
    setIframeKey(Date.now());
  }, [mediaInfo.id, mediaInfo.url]);

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
    if (mediaInfo.type !== 'youtube' || isScreenSharingActive) return;

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    let interval: NodeJS.Timeout | null = null;

    const initPlayer = () => {
      if (!playerContainerRef.current) return;

      playerContainerRef.current.innerHTML = '';
      const targetElement = document.createElement('div');
      playerContainerRef.current.appendChild(targetElement);

      const startSec = room.playback_position_seconds || 0;

      try {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
          ytPlayerRef.current.destroy();
        }
      } catch (e) {}

      ytPlayerRef.current = new window.YT.Player(targetElement, {
        host: 'https://www.youtube-nocookie.com',
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
          enablejsapi: 1,
          start: Math.floor(startSec),
        },
        events: {
          onReady: (event: any) => {
            event.target.setVolume(volume);
            forceDisableCaptions();

            if (startSec > 0) {
              event.target.seekTo(startSec, true);
            }
            if (room.is_playing) {
              try {
                const playPromise = event.target.playVideo();
                if (playPromise && typeof playPromise.catch === 'function') {
                  playPromise.catch(() => setNeedUserGesture(true));
                }
              } catch {
                setNeedUserGesture(true);
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
              setIsEmbedBlocked(false);
            } else if (event.data === 2) {
              setIsPlaying(false);
            } else if (event.data === 0) {
              setIsPlaying(false);
            }
          },
          onError: (event: any) => {
            if (event.data === 101 || event.data === 150 || event.data === 2) {
              setIsEmbedBlocked(true);
            } else {
              setNeedUserGesture(true);
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
          if (isHost && now - lastHostSyncSaveRef.current > 3000) {
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
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {}
      }
      if (playerContainerRef.current) {
        playerContainerRef.current.innerHTML = '';
      }
    };
  }, [mediaInfo.type, mediaInfo.id, isScreenSharingActive]);

  const forceDisableCaptions = () => {
    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.unloadModule?.('captions');
        ytPlayerRef.current.setOption?.('captions', 'track', {});
        ytPlayerRef.current.setOption?.('cc', 'track', {});
      } catch (e) {}
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // КНОПКА СИНХРОНИЗАЦИИ ПО ВЛАДЕЛЬЦУ
  const handleSyncClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (isHost) {
      const curSec = getHostLiveTime();
      updateRoomProgress(room.id, curSec, isPlaying);

      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: 'HOST_TIME_REPLY',
          time: curSec,
          isPlaying: isPlaying,
          timestamp: Date.now(),
        });
      }
      if (syncChannelRef.current) {
        syncChannelRef.current.send({
          type: 'broadcast',
          event: 'host_time_update',
          payload: { time: curSec, isPlaying: isPlaying, timestamp: Date.now() },
        });
      }

      showSuccess('Вы опубликовали свою точную секунду всем!');
    } else {
      // 1. Отправляем радиозапрос
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({ type: 'REQUEST_HOST_TIME' });
      }
      if (syncChannelRef.current) {
        syncChannelRef.current.send({
          type: 'broadcast',
          event: 'request_host_time',
        });
      }

      // 2. Если у нас уже есть данные от владельца
      if (latestHostTimeRef.current) {
        applyHostTime(
          latestHostTimeRef.current.time,
          latestHostTimeRef.current.isPlaying,
          latestHostTimeRef.current.timestamp
        );
        showSuccess(`Подстроено под владельца (${formatTime(latestHostTimeRef.current.time)})`);
      } else {
        // Запасной вариант из общей памяти
        const fallbackTime = room.playback_position_seconds || 0;
        applyHostTime(fallbackTime, room.is_playing);
        showSuccess(`Синхронизировано (${formatTime(fallbackTime)})`);
      }
    }
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
    }, 2500);
  };

  const handleTogglePlay = () => {
    if (!isHost) return;

    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);

    if (mediaInfo.type === 'youtube' && ytPlayerRef.current) {
      if (nextPlaying) ytPlayerRef.current.playVideo();
      else ytPlayerRef.current.pauseVideo();
    } else if (mediaInfo.type === 'direct' && videoElementRef.current) {
      if (nextPlaying) videoElementRef.current.play();
      else videoElementRef.current.pause();
    }

    updateRoomProgress(room.id, currentTime, nextPlaying);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    setIsMuted(newVolume === 0);

    if (screenShareVideoRef.current) {
      screenShareVideoRef.current.volume = newVolume / 100;
    }

    if (mediaInfo.type === 'youtube' && ytPlayerRef.current) {
      ytPlayerRef.current.setVolume(newVolume);
    } else if (mediaInfo.type === 'direct' && videoElementRef.current) {
      videoElementRef.current.volume = newVolume / 100;
    }
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);

    if (mediaInfo.type === 'youtube' && ytPlayerRef.current) {
      if (nextMute) ytPlayerRef.current.mute();
      else ytPlayerRef.current.unMute();
    } else if (mediaInfo.type === 'direct' && videoElementRef.current) {
      videoElementRef.current.muted = nextMute;
    }
  };

  const handleSeek = (newProgressPercent: number) => {
    if (!isHost) return;

    const maxSec = duration > 0 ? duration : 3600;
    const targetSeconds = (newProgressPercent / 100) * maxSec;
    setCurrentTime(targetSeconds);

    if (mediaInfo.type === 'youtube' && ytPlayerRef.current?.seekTo) {
      ytPlayerRef.current.seekTo(targetSeconds, true);
    } else if (mediaInfo.type === 'direct' && videoElementRef.current) {
      videoElementRef.current.currentTime = targetSeconds;
    } else {
      const newEmbedUrl = getEmbedUrlWithTime(mediaInfo, targetSeconds, isPlaying);
      setIframeSrc(newEmbedUrl);
      setIframeKey(Date.now());
    }

    updateRoomProgress(room.id, targetSeconds, isPlaying);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : (currentTime % 3600) / 36;
  const currentHostname = window.location.hostname || 'localhost';

  const twitchParamKey = mediaInfo.twitchType === 'video' ? 'video=' : 'channel=';
  const twitchAutoplay = room.is_playing ? 'true' : 'false';
  const twitchSrc = `https://player.twitch.tv/?${twitchParamKey}${mediaInfo.id}&parent=${currentHostname}&autoplay=${twitchAutoplay}&muted=false`;

  const fullscreenClass = isFullscreen
    ? 'w-screen h-screen justify-between z-50'
    : 'rounded-2xl border-2 border-pink-500/30 shadow-2xl shadow-purple-500/20 aspect-video';

  const controlsVisibilityClass = showControls
    ? 'opacity-100 pointer-events-auto transition-all duration-300'
    : 'opacity-0 pointer-events-none invisible transition-all duration-300';

  return (
    <div
      ref={containerRef}
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      onClick={handleUserActivity}
      className={`relative flex flex-col bg-slate-950 overflow-hidden select-none transition-all group ${fullscreenClass}`}
    >
      <canvas ref={hiddenCanvasRef} className="hidden" />

      <div className="relative w-full h-full bg-black overflow-hidden flex-1 aspect-video">
        {/* КНОПКА СИНХРОНИЗАЦИИ И ПОКАЗА ЭКРАНА */}
        {!isEmbedBlocked && (
          <div className={`absolute top-3 left-3 z-40 flex items-center gap-2 ${controlsVisibilityClass}`}>
            <Button
              onClick={handleSyncClick}
              size="sm"
              className="h-7 px-3 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-[11px] rounded-full shadow-lg shadow-cyan-500/30 backdrop-blur-md flex items-center gap-1.5 border border-white/20 opacity-90 hover:opacity-100 transition-opacity"
              title="Синхронизировать видео под владельца"
            >
              <Zap className="h-3 w-3 fill-amber-300 text-amber-300" />
              <span>Синхронизировать</span>
            </Button>
          </div>
        )}

        {/* АНИМАЦИЯ СМАЙЛОВ */}
        <VideoReactionsOverlay reactions={floatingReactions} />

        {/* 1. YOUTUBE */}
        {!isScreenSharingActive && mediaInfo.type === 'youtube' && (
          <div
            ref={playerContainerRef}
            className="absolute inset-0 w-full h-full pointer-events-none [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:pointer-events-none"
          />
        )}

        {/* 2. TWITCH */}
        {!isScreenSharingActive && mediaInfo.type === 'twitch' && (
          <iframe
            ref={iframeRef}
            src={twitchSrc}
            className="absolute inset-0 w-full h-full border-0 z-10 pointer-events-auto"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        )}

        {/* 3. RUTUBE, VK, VIMEO, OK И IFRAME */}
        {!isScreenSharingActive && isIframePlayer && (
          <iframe
            ref={iframeRef}
            key={iframeKey}
            src={iframeSrc || mediaInfo.embedUrl || mediaInfo.url}
            className="absolute inset-0 w-full h-full border-0 bg-black z-20 pointer-events-auto"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock; clipboard-write; microphone; camera"
            allowFullScreen
          />
        )}

        {/* 4. DIRECT VIDEO (MP4 / WebM / OGG) */}
        {!isScreenSharingActive && mediaInfo.type === 'direct' && (
          <video
            ref={videoElementRef}
            src={mediaInfo.url}
            className="absolute inset-0 w-full h-full object-contain bg-black"
            playsInline
          />
        )}
      </div>

      {/* КАСТОМНАЯ ПАНЕЛЬ УПРАВЛЕНИЯ ПЛЕЕРОМ */}
      {(!isIframePlayer && mediaInfo.type !== 'twitch') || isScreenSharingActive ? (
        <MediaControlsOverlay
          showControls={showControls}
          isScreenSharingActive={isScreenSharingActive}
          currentTime={currentTime}
          duration={duration}
          progressPercent={progressPercent}
          isPlaying={isPlaying}
          isHost={isHost}
          isMuted={isMuted}
          volume={volume}
          isFullscreen={isFullscreen}
          formatTime={formatTime}
          onSeek={handleSeek}
          onTogglePlay={handleTogglePlay}
          onToggleMute={handleToggleMute}
          onVolumeChange={handleVolumeChange}
          onToggleFullscreen={toggleFullscreen}
        />
      ) : null}
    </div>
  );
};