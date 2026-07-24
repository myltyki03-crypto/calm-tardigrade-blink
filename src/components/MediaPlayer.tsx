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

  const iframeLoadedTimeRef = useRef<number>(Date.now());
  const currentTimeRef = useRef<number>(0);
  const lastAutoSeekRef = useRef<number>(0);

  // WebRTC и Демонстрация экрана
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [fallbackFrame, setFallbackFrame] = useState<string | null>(null);
  const [needAudioClick, setNeedAudioClick] = useState<boolean>(false);

  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const viewerPeerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const webrtcChannelRef = useRef<any>(null);
  const canvasIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const lastHostSyncSaveRef = useRef<number>(0);

  const mediaInfo: MediaInfo = parseMediaUrl(room.current_media_url || '');

  const [isPlaying, setIsPlaying] = useState(room.is_playing);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [needUserGesture, setNeedUserGesture] = useState(false);
  const [isEmbedBlocked, setIsEmbedBlocked] = useState(false);

  const [iframeKey] = useState<number>(Date.now());

  const [iframeSrc, setIframeSrc] = useState<string>(() => {
    return getEmbedUrlWithTime(mediaInfo, room.playback_position_seconds || 0, false);
  });

  // Синхронизация ref текущего времени
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  // Автоматическое скрытие элементов управления
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

  // Безопасный расчет времени ведущего
  const getCalculatedHostTime = () => {
    let startSec = room.playback_position_seconds || 0;
    if (room.is_playing && room.last_updated_at) {
      const updatedTime = new Date(room.last_updated_at).getTime();
      if (!isNaN(updatedTime)) {
        const elapsed = (Date.now() - updatedTime) / 1000;
        if (elapsed > 0 && elapsed < 86400) {
          startSec += elapsed;
        }
      }
    }
    return Math.max(0, Math.floor(startSec));
  };

  // Отправка команд в iframe плеера (VK, Rutube)
  const sendIframeCommand = (command: 'play' | 'pause' | 'seek' | 'volume' | 'unmute', value?: number) => {
    if (!iframeRef.current?.contentWindow) return;
    const win = iframeRef.current.contentWindow;

    try {
      const val = typeof value === 'number' ? Math.floor(value) : 0;

      if (command === 'play') {
        win.postMessage({ box_msg: 'play' }, '*');
        win.postMessage(JSON.stringify({ box_msg: 'play' }), '*');
      } else if (command === 'pause') {
        win.postMessage({ box_msg: 'pause' }, '*');
        win.postMessage(JSON.stringify({ box_msg: 'pause' }), '*');
      } else if (command === 'seek' && typeof value === 'number') {
        win.postMessage({ box_msg: 'seek', value: val }, '*');
        win.postMessage({ box_msg: 'seek', time: val }, '*');
        win.postMessage(JSON.stringify({ box_msg: 'seek', value: val }), '*');
        win.postMessage(JSON.stringify({ box_msg: 'seek', time: val }), '*');
        win.postMessage({ type: 'player:setCurrentTime', data: { time: val } }, '*');
        win.postMessage(JSON.stringify({ type: 'player:setCurrentTime', data: { time: val } }), '*');
      } else if (command === 'unmute' || command === 'volume') {
        win.postMessage({ box_msg: 'unmute' }, '*');
        win.postMessage({ box_msg: 'set_volume', value: value ?? volume }, '*');
      }
    } catch (e) {
      console.error('Failed to send iframe command:', e);
    }
  };

  // Перехват PostMessage сообщений от VK Видео / Iframe плееров
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      try {
        let data = event.data;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch {}
        }

        if (!data || typeof data !== 'object') return;

        const eventType = String(
          data.event || data.type || data.box_msg || data.action || (Array.isArray(data) ? data[0] : '')
        ).toLowerCase();

        if (
          eventType.includes('status') ||
          eventType.includes('volume') ||
          eventType.includes('quality') ||
          eventType.includes('resize') ||
          eventType.includes('init')
        ) {
          if (eventType.includes('pause')) {
            if (isHost) setIsPlaying(false);
            else if (room.is_playing) sendIframeCommand('play');
          }
          if (eventType.includes('play')) setIsPlaying(true);
          return;
        }

        let timeVal: number | undefined = undefined;

        if (typeof data.currentTime === 'number') {
          timeVal = data.currentTime;
        } else if (typeof data.time === 'number') {
          timeVal = data.time;
        } else if (data.param && typeof data.param === 'object' && typeof data.param.time === 'number') {
          timeVal = data.param.time;
        } else if (data.param && typeof data.param === 'object' && typeof data.param.currentTime === 'number') {
          timeVal = data.param.currentTime;
        } else if (
          eventType.includes('time') ||
          eventType.includes('progress') ||
          eventType.includes('seek') ||
          eventType.includes('position')
        ) {
          if (typeof data.param === 'number') timeVal = data.param;
          else if (typeof data.value === 'number') timeVal = data.value;
          else if (Array.isArray(data) && typeof data[1] === 'number') timeVal = data[1];
        }

        const now = Date.now();

        if (now - lastAutoSeekRef.current < 5000) {
          return;
        }

        if (typeof timeVal === 'number' && !isNaN(timeVal) && timeVal >= 0) {
          const oldTime = currentTimeRef.current;

          if (timeVal < 2 && oldTime > 5) {
            return;
          }

          setCurrentTime(timeVal);

          if (isHost) {
            const timeJump = Math.abs(timeVal - oldTime);
            if ((timeJump > 2 && timeVal > 0) || now - lastHostSyncSaveRef.current > 5000) {
              lastHostSyncSaveRef.current = now;
              updateRoomProgress(room.id, timeVal, isPlaying);
            }
          }
        }

        if (
          eventType === 'play' ||
          eventType === 'video_play' ||
          eventType === 'started' ||
          eventType === 'playing'
        ) {
          setIsPlaying(true);
        } else if (
          eventType === 'pause' ||
          eventType === 'video_pause' ||
          eventType === 'paused'
        ) {
          if (isHost) {
            setIsPlaying(false);
          } else if (room.is_playing) {
            sendIframeCommand('play');
            setIsPlaying(true);
          } else {
            setIsPlaying(false);
          }
        }
      } catch (e) {}
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [isHost, isPlaying, room.id, room.is_playing]);

  // МГНОВЕННАЯ РЕАКЦИЯ ЗРИТЕЛЯ НА ПЕРЕМОТКУ ВЕДУЩЕГО
  const prevHostPositionRef = useRef<{ pos: number; updatedAt: string; isPlaying: boolean }>({
    pos: room.playback_position_seconds || 0,
    updatedAt: room.last_updated_at || '',
    isPlaying: room.is_playing,
  });

  useEffect(() => {
    if (isHost || isScreenSharingActive) return;

    const prev = prevHostPositionRef.current;
    const currentPos = room.playback_position_seconds || 0;
    const currentUpdatedAt = room.last_updated_at || '';
    const currentIsPlaying = room.is_playing;

    const posChanged = Math.abs(currentPos - prev.pos) > 2;
    const stateChanged = currentIsPlaying !== prev.isPlaying;
    const updatedTimeChanged = currentUpdatedAt !== prev.updatedAt;

    if (posChanged || stateChanged || updatedTimeChanged) {
      prevHostPositionRef.current = {
        pos: currentPos,
        updatedAt: currentUpdatedAt,
        isPlaying: currentIsPlaying,
      };

      const targetHostTime = getCalculatedHostTime();

      if (mediaInfo.type === 'youtube' && ytPlayerRef.current) {
        try {
          if (currentIsPlaying) {
            ytPlayerRef.current.playVideo?.();
            setIsPlaying(true);
          } else {
            ytPlayerRef.current.pauseVideo?.();
            setIsPlaying(false);
          }
          if (Math.abs((ytPlayerRef.current.getCurrentTime?.() || 0) - targetHostTime) > 3) {
            ytPlayerRef.current.seekTo?.(targetHostTime, true);
            setCurrentTime(targetHostTime);
            currentTimeRef.current = targetHostTime;
            lastAutoSeekRef.current = Date.now();
          }
        } catch (e) {}
      } else if (mediaInfo.type === 'direct' && videoElementRef.current) {
        const v = videoElementRef.current;
        if (currentIsPlaying) {
          v.play().catch(() => setNeedUserGesture(true));
          setIsPlaying(true);
        } else {
          v.pause();
          setIsPlaying(false);
        }
        if (Math.abs(v.currentTime - targetHostTime) > 3) {
          v.currentTime = targetHostTime;
          setCurrentTime(targetHostTime);
          currentTimeRef.current = targetHostTime;
          lastAutoSeekRef.current = Date.now();
        }
      } else if (isIframePlayer) {
        setIsPlaying(currentIsPlaying);
        sendIframeCommand(currentIsPlaying ? 'play' : 'pause');

        const currentViewerTime = currentTimeRef.current;
        const diff = Math.abs(currentViewerTime - targetHostTime);

        if (diff > 3) {
          lastAutoSeekRef.current = Date.now();
          setCurrentTime(targetHostTime);
          currentTimeRef.current = targetHostTime;
          sendIframeCommand('seek', targetHostTime);
          setIframeSrc(getEmbedUrlWithTime(mediaInfo, targetHostTime, currentIsPlaying));
        }
      }
    }
  }, [
    isHost,
    isScreenSharingActive,
    room.playback_position_seconds,
    room.last_updated_at,
    room.is_playing,
    mediaInfo.type,
  ]);

  // Закрепление видеопотока трансляции на HTML-теге
  useEffect(() => {
    const video = screenShareVideoRef.current;
    if (!video) return;

    const activeStream = isHost ? screenStream : remoteStream;

    if (isScreenSharingActive && activeStream) {
      if (video.srcObject !== activeStream) {
        video.srcObject = activeStream;
      }

      video.muted = isHost || isMuted;

      video
        .play()
        .then(() => {
          setIsEmbedBlocked(false);
          setNeedUserGesture(false);
        })
        .catch(() => {
          video.muted = true;
          video
            .play()
            .then(() => {
              if (!isHost) setNeedAudioClick(true);
              setIsEmbedBlocked(false);
            })
            .catch((e) => console.error('Even muted screen play failed:', e));
        });
    } else {
      if (!isScreenSharingActive && video.srcObject) {
        video.srcObject = null;
      }
    }
  }, [isScreenSharingActive, screenStream, remoteStream, isHost, isMuted]);

  // Демонстрация экрана
  const handleToggleScreenShare = async () => {
    if (!isHost) {
      showError('Только владелец комнаты может запускать трансляцию экрана');
      return;
    }

    if (isScreenSharingActive || screenStream) {
      stopLocalScreenShare();
      showSuccess('Трансляция экрана остановлена');
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        showError('Ваш браузер не поддерживает захват экрана');
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always', frameRate: { ideal: 30 } } as any,
        audio: true,
      });

      setIsEmbedBlocked(false);
      setNeedUserGesture(false);

      setScreenStream(stream);
      setRoomScreenShareState(room.id, true);
      showSuccess('Демонстрация экрана запущена!');

      if (screenShareVideoRef.current) {
        screenShareVideoRef.current.srcObject = stream;
        screenShareVideoRef.current.muted = true;
        screenShareVideoRef.current
          .play()
          .then(() => {
            setIsEmbedBlocked(false);
          })
          .catch(() => {});
      }

      if (webrtcChannelRef.current) {
        webrtcChannelRef.current.send({
          type: 'broadcast',
          event: 'screenshare-started',
          payload: { hostId: room.host_id },
        });
      }

      if (canvasIntervalRef.current) clearInterval(canvasIntervalRef.current);
      canvasIntervalRef.current = setInterval(() => {
        const video = screenShareVideoRef.current;
        const canvas = hiddenCanvasRef.current;
        if (video && canvas && video.videoWidth > 0 && video.videoHeight > 0) {
          canvas.width = Math.min(video.videoWidth, 854);
          canvas.height = Math.min(video.videoHeight, 480);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
            if (webrtcChannelRef.current) {
              webrtcChannelRef.current.send({
                type: 'broadcast',
                event: 'screenshare-frame',
                payload: { frame: dataUrl },
              });
            }
          }
        }
      }, 350);

      stream.getVideoTracks()[0].onended = () => {
        stopLocalScreenShare();
      };
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        showError('Не удалось запустить трансляцию экрана');
      }
    }
  };

  const stopLocalScreenShare = () => {
    if (canvasIntervalRef.current) {
      clearInterval(canvasIntervalRef.current);
      canvasIntervalRef.current = null;
    }

    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
    }
    if (screenShareVideoRef.current) {
      screenShareVideoRef.current.srcObject = null;
    }
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    setRoomScreenShareState(room.id, false);

    if (webrtcChannelRef.current) {
      webrtcChannelRef.current.send({
        type: 'broadcast',
        event: 'screenshare-stopped',
        payload: { hostId: room.host_id },
      });
    }
  };

  const handleRequestStreamAgain = () => {
    if (!webrtcChannelRef.current) return;
    const myUserId = currentUser.id || 'guest';
    webrtcChannelRef.current.send({
      type: 'broadcast',
      event: 'webrtc-request-offer',
      payload: { viewerId: myUserId },
    });
    showSuccess('Перезапрос видеопотока...');
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const channelName = 'webrtc-screenshare-' + room.id;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    const myUserId = currentUser.id || 'guest';

    channel
      .on('broadcast', { event: 'screenshare-started' }, () => {
        if (!isHost) {
          channel.send({
            type: 'broadcast',
            event: 'webrtc-request-offer',
            payload: { viewerId: myUserId },
          });
        }
      })
      .on('broadcast', { event: 'screenshare-stopped' }, () => {
        if (!isHost) {
          if (viewerPeerConnectionRef.current) {
            viewerPeerConnectionRef.current.close();
            viewerPeerConnectionRef.current = null;
          }
          setRemoteStream(null);
          setFallbackFrame(null);
          pendingIceCandidatesRef.current = [];
        }
      })
      .on('broadcast', { event: 'screenshare-frame' }, ({ payload }) => {
        if (!isHost && payload?.frame) {
          setFallbackFrame(payload.frame);
          setIsEmbedBlocked(false);
        }
      })
      .on('broadcast', { event: 'webrtc-request-offer' }, async ({ payload }) => {
        if (isHost && screenStream) {
          const viewerId = payload.viewerId;
          const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

          peerConnectionsRef.current.set(viewerId, pc);

          screenStream.getTracks().forEach((track) => {
            pc.addTrack(track, screenStream);
          });

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              channel.send({
                type: 'broadcast',
                event: 'webrtc-ice',
                payload: { candidate: event.candidate, senderId: myUserId, targetId: viewerId },
              });
            }
          };

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          channel.send({
            type: 'broadcast',
            event: 'webrtc-offer',
            payload: { offer, senderId: myUserId, targetId: viewerId },
          });
        }
      })
      .on('broadcast', { event: 'webrtc-offer' }, async ({ payload }) => {
        if (!isHost && payload.targetId === myUserId) {
          if (viewerPeerConnectionRef.current) {
            viewerPeerConnectionRef.current.close();
          }

          const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
          viewerPeerConnectionRef.current = pc;
          pendingIceCandidatesRef.current = [];

          pc.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
              setRemoteStream(event.streams[0]);
            } else if (event.track) {
              setRemoteStream(new MediaStream([event.track]));
            }
            setIsEmbedBlocked(false);
          };

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              channel.send({
                type: 'broadcast',
                event: 'webrtc-ice',
                payload: { candidate: event.candidate, senderId: myUserId, targetId: payload.senderId },
              });
            }
          };

          await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));

          while (pendingIceCandidatesRef.current.length > 0) {
            const candidate = pendingIceCandidatesRef.current.shift();
            if (candidate) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (e) {}
            }
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          channel.send({
            type: 'broadcast',
            event: 'webrtc-answer',
            payload: { answer, senderId: myUserId, targetId: payload.senderId },
          });
        }
      })
      .on('broadcast', { event: 'webrtc-answer' }, async ({ payload }) => {
        if (isHost && payload.targetId === myUserId) {
          const pc = peerConnectionsRef.current.get(payload.senderId);
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
          }
        }
      })
      .on('broadcast', { event: 'webrtc-ice' }, async ({ payload }) => {
        if (payload.targetId === myUserId) {
          if (isHost) {
            const pc = peerConnectionsRef.current.get(payload.senderId);
            if (pc && payload.candidate) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
              } catch (e) {}
            }
          } else {
            const pc = viewerPeerConnectionRef.current;
            if (pc && pc.remoteDescription) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
              } catch (e) {}
            } else if (payload.candidate) {
              pendingIceCandidatesRef.current.push(payload.candidate);
            }
          }
        }
      })
      .subscribe();

    webrtcChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id, isHost, isScreenSharingActive, screenStream, currentUser.id]);

  useEffect(() => {
    if (!isHost && isScreenSharingActive && !remoteStream && webrtcChannelRef.current) {
      const myUserId = currentUser.id || 'guest';
      const pollTimer = setInterval(() => {
        webrtcChannelRef.current.send({
          type: 'broadcast',
          event: 'webrtc-request-offer',
          payload: { viewerId: myUserId },
        });
      }, 2000);

      return () => clearInterval(pollTimer);
    }
  }, [isHost, isScreenSharingActive, remoteStream, currentUser.id]);

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

  // Локальный таймер для отсчета времени
  useEffect(() => {
    if (isIframePlayer) {
      let interval: NodeJS.Timeout | null = null;
      if (isPlaying) {
        interval = setInterval(() => {
          setCurrentTime((prev) => {
            const next = prev + 1;
            if (
              isHost &&
              Date.now() - iframeLoadedTimeRef.current > 3000 &&
              Date.now() - lastHostSyncSaveRef.current > 4000
            ) {
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
    if (!isHost || isScreenSharingActive) return;

    const autoSyncViewer = () => {
      const targetHostTime = getCalculatedHostTime();
      const now = Date.now();

      // 1. YouTube
      if (mediaInfo.type === 'youtube' && ytPlayerRef.current) {
        try {
          const playerState = ytPlayerRef.current.getPlayerState?.();
          const ytTime = ytPlayerRef.current.getCurrentTime?.() || 0;

          if (room.is_playing && playerState !== 1 && playerState !== 3) {
            ytPlayerRef.current.playVideo?.();
            setIsPlaying(true);
          } else if (!room.is_playing && playerState === 1) {
            ytPlayerRef.current.pauseVideo?.();
            setIsPlaying(false);
          }

          if (Math.abs(ytTime - targetHostTime) > 5 && now - lastAutoSeekRef.current > 8000) {
            lastAutoSeekRef.current = now;
            ytPlayerRef.current.seekTo?.(targetHostTime, true);
            setCurrentTime(targetHostTime);
            currentTimeRef.current = targetHostTime;
          }
        } catch (e) {}
      }
      // 2. Direct MP4
      else if (mediaInfo.type === 'direct' && videoElementRef.current) {
        const v = videoElementRef.current;
        if (room.is_playing && v.paused) {
          v.play().catch(() => setNeedUserGesture(true));
          setIsPlaying(true);
        } else if (!room.is_playing && !v.paused) {
          v.pause();
          setIsPlaying(false);
        }

        if (Math.abs(v.currentTime - targetHostTime) > 5 && now - lastAutoSeekRef.current > 8000) {
          lastAutoSeekRef.current = now;
          v.currentTime = targetHostTime;
          setCurrentTime(targetHostTime);
          currentTimeRef.current = targetHostTime;
        }
      }
      // 3. Iframe players
      else if (isIframePlayer) {
        if (room.is_playing !== isPlaying) {
          setIsPlaying(room.is_playing);
          sendIframeCommand(room.is_playing ? 'play' : 'pause');
        }

        const diff = Math.abs(currentTimeRef.current - targetHostTime);
        if (diff > 8 && now - lastAutoSeekRef.current > 10000) {
          lastAutoSeekRef.current = now;
          sendIframeCommand('seek', targetHostTime);
          setIframeSrc(getEmbedUrlWithTime(mediaInfo, targetHostTime, room.is_playing));
          setCurrentTime(targetHostTime);
          currentTimeRef.current = targetHostTime;
        }
      }
    };

    autoSyncViewer();
    const interval = setInterval(autoSyncViewer, 2500);

    return () => clearInterval(interval);
  }, [
    isHost,
    isScreenSharingActive,
    room.is_playing,
    mediaInfo.type,
    isPlaying,
  ]);

  // Слушатель мгновенной команды play/pause от ведущего
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || isHost) return;

    const channelName = 'pulserave-global-channel';
    const channel = supabase.channel(channelName + '-playpause-' + room.id, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'play_pause_command' }, ({ payload }) => {
        const data = payload;
        if (data && data.roomId === room.id && typeof data.is_playing === 'boolean') {
          setIsPlaying(data.is_playing);

          if (mediaInfo.type === 'youtube' && ytPlayerRef.current) {
            if (data.is_playing) {
              ytPlayerRef.current.playVideo();
            } else {
              ytPlayerRef.current.pauseVideo();
            }
          } else if (mediaInfo.type === 'direct' && videoElementRef.current) {
            if (data.is_playing) {
              videoElementRef.current.play();
            } else {
              videoElementRef.current.pause();
            }
          } else if (isIframePlayer) {
            sendIframeCommand(data.is_playing ? 'play' : 'pause');
            sendIframeCommand('unmute');
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id, isHost, isSupabaseConfigured, mediaInfo.type, isIframePlayer]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleMobileUnlockClick = () => {
    lastAutoSeekRef.current = Date.now();
    const syncTime = getCalculatedHostTime();

    if (mediaInfo.type === 'youtube' && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.unMute();
        ytPlayerRef.current.setVolume(volume || 80);
        ytPlayerRef.current.seekTo(syncTime, true);
        ytPlayerRef.current.playVideo();
      } catch (e) {}
    } else if (mediaInfo.type === 'direct' && videoElementRef.current) {
      videoElementRef.current.muted = false;
      videoElementRef.current.play();
    } else if (isIframePlayer) {
      sendIframeCommand('seek', syncTime);
      sendIframeCommand('play');
      sendIframeCommand('unmute');
      setIframeSrc(getEmbedUrlWithTime(mediaInfo, syncTime, true));
    }

    setIsMuted(false);
    setIsPlaying(true);
    setNeedUserGesture(false);
    forceDisableCaptions();
  };

  const handleEnableAudioClick = () => {
    if (screenShareVideoRef.current) {
      screenShareVideoRef.current.muted = false;
      screenShareVideoRef.current.volume = (volume || 80) / 100;
    }
    setIsMuted(false);
    setNeedAudioClick(false);
    showSuccess('Звук трансляции включен');
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
    if (needUserGesture) {
      handleMobileUnlockClick();
      return;
    }

    if (!isHost) {
      showError('Только ведущий может ставить на паузу');
      return;
    }

    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);

    if (mediaInfo.type === 'youtube' && ytPlayerRef.current) {
      if (nextPlaying) {
        ytPlayerRef.current.playVideo();
      } else {
        ytPlayerRef.current.pauseVideo();
      }
    } else if (mediaInfo.type === 'direct' && videoElementRef.current) {
      if (nextPlaying) {
        videoElementRef.current.play();
      } else {
        videoElementRef.current.pause();
      }
    } else if (isIframePlayer) {
      sendIframeCommand(nextPlaying ? 'play' : 'pause');
      sendIframeCommand('unmute');
    }

    // Отправляем мгновенную команду всем зрителям
    if (globalChannelRef.current) {
      globalChannelRef.current.send({
        type: 'broadcast',
        event: 'play_pause_command',
        payload: {
          roomId: room.id,
          is_playing: nextPlaying,
          last_updated_at: new Date().toISOString(),
        },
      });
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
      if (newVolume === 0) {
        ytPlayerRef.current.mute();
      } else {
        if (isMuted) {
          ytPlayerRef.current.unMute();
        }
        ytPlayerRef.current.setVolume(newVolume);
      }
    } else if (mediaInfo.type === 'direct' && videoElementRef.current) {
      videoElementRef.current.volume = newVolume / 100;
    } else if (isIframePlayer) {
      sendIframeCommand('volume', newVolume);
    }
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);

    if (screenShareVideoRef.current) {
      screenShareVideoRef.current.muted = isHost ? true : nextMute;
    }

    if (mediaInfo.type === 'youtube' && ytPlayerRef.current) {
      if (nextMute) ytPlayerRef.current.mute();
      else {
        ytPlayerRef.current.unMute();
        ytPlayerRef.current.setVolume(volume || 50);
      }
    } else if (mediaInfo.type === 'direct' && videoElementRef.current) {
      videoElementRef.current.muted = nextMute;
    } else if (isIframePlayer) {
      if (nextMute) sendIframeCommand('volume', 0);
      else sendIframeCommand('unmute');
    }
  };

  const handleSeek = (newProgressPercent: number) => {
    if (!isHost) return;

    if (duration > 0 || mediaInfo.type === 'vk') {
      const maxSec = duration > 0 ? duration : 3600;
      const targetSeconds = Math.max(0, Math.floor((newProgressPercent / 100) * maxSec));

      setCurrentTime(targetSeconds);
      currentTimeRef.current = targetSeconds;
      lastAutoSeekRef.current = Date.now();
      lastHostSyncSaveRef.current = Date.now();

      if (mediaInfo.type === 'youtube' && ytPlayerRef.current?.seekTo) {
        ytPlayerRef.current.seekTo(targetSeconds, true);
      } else if (mediaInfo.type === 'direct' && videoElementRef.current) {
        videoElementRef.current.currentTime = targetSeconds;
      } else {
        sendIframeCommand('seek', targetSeconds);
        setIframeSrc(getEmbedUrlWithTime(mediaInfo, targetSeconds, isPlaying));
      }

      updateRoomProgress(room.id, targetSeconds, isPlaying);
    }
  };

  const handleSyncClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const syncTime = getCalculatedHostTime();
    lastAutoSeekRef.current = Date.now();

    if (isHost) {
      let curSec = currentTime;
      if (mediaInfo.type === 'youtube' && ytPlayerRef.current?.getCurrentTime) {
        curSec = ytPlayerRef.current.getCurrentTime() || currentTime;
      } else if (mediaInfo.type === 'direct' && videoElementRef.current) {
        curSec = videoElementRef.current.currentTime || currentTime;
      }
      lastHostSyncSaveRef.current = Date.now();
      updateRoomProgress(room.id, curSec, isPlaying);
      showSuccess('Время трансляции отправлено всем зрителям!');
    } else {
      if (mediaInfo.type === 'youtube' && ytPlayerRef.current?.seekTo) {
        ytPlayerRef.current.seekTo(syncTime, true);
        if (room.is_playing) {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        } else {
          ytPlayerRef.current.pauseVideo();
          setIsPlaying(false);
        }
        forceDisableCaptions();
      } else if (mediaInfo.type === 'direct' && videoElementRef.current) {
        videoElementRef.current.currentTime = syncTime;
        if (room.is_playing) {
          videoElementRef.current.play().catch(() => setNeedUserGesture(true));
          setIsPlaying(true);
        } else {
          videoElementRef.current.pause();
          setIsPlaying(false);
        }
      } else if (isIframePlayer) {
        setCurrentTime(syncTime);
        currentTimeRef.current = syncTime;
        setIsPlaying(room.is_playing);

        sendIframeCommand('seek', syncTime);
        sendIframeCommand(room.is_playing ? 'play' : 'pause');
        sendIframeCommand('unmute');
        setIframeSrc(getEmbedUrlWithTime(mediaInfo, syncTime, room.is_playing));
      }

      showSuccess(`Синхронизировано на ${formatTime(syncTime)}`);
    }
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
      {/* Скрытый холст для снимков экрана */}
      <canvas ref={hiddenCanvasRef} className="hidden" />

      <div className="relative w-full h-full bg-black overflow-hidden flex-1 aspect-video">
        {/* КНОПКИ СИНХРОНИЗАЦИИ И ПОКАЗА ЭКРАНА */}
        {(!needUserGesture || isScreenSharingActive) && !isEmbedBlocked && (
          <div
            className={`absolute top-3 left-3 z-40 flex items-center gap-2 ${controlsVisibilityClass}`}
          >
            <Button
              onClick={handleSyncClick}
              size="sm"
              className="h-7 px-3 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-[11px] rounded-full shadow-lg shadow-cyan-500/30 backdrop-blur-md flex items-center gap-1.5 border border-white/20 opacity-80 hover:opacity-100 transition-opacity"
              title="Синхронизировать видео с создателем комнаты"
            >
              <Zap className="h-3 w-3 fill-amber-300 text-amber-300" />
              <span>Синхронизировать</span>
            </Button>

            {isHost && (
              <Button
                onClick={handleToggleScreenShare}
                size="sm"
                className={`h-7 px-3 font-bold text-[11px] rounded-full shadow-lg backdrop-blur-md flex items-center gap-1.5 border transition-all ${
                  isScreenSharingActive
                    ? 'bg-red-600 hover:bg-red-500 text-white border-red-400 animate-pulse'
                    : 'bg-purple-800/90 hover:bg-purple-700 text-purple-100 border-purple-500/50'
                }`}
                title={isScreenSharingActive ? 'Остановить трансляцию экрана' : 'Поделиться экраном компьютера'}
              >
                {isScreenSharingActive ? (
                  <>
                    <Square className="h-3 w-3 fill-white" />
                    <span>Стоп экран</span>
                  </>
                ) : (
                  <>
                    <Monitor className="h-3 w-3 text-cyan-300" />
                    <span>Транслировать экран</span>
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* ИНДИКАТОР ТРАНСЛЯЦИИ */}
        {isScreenSharingActive && (
          <div
            className={`absolute top-3 right-3 z-40 bg-pink-950/90 border border-pink-500/50 text-pink-300 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 backdrop-blur-md shadow-lg ${controlsVisibilityClass}`}
          >
            <Radio className="h-3 w-3 text-pink-400 animate-pulse" />
            <span>{isHost ? 'Вы транслируете экран' : 'Прямая трансляция экрана ведущего'}</span>
          </div>
        )}

        {/* АНИМАЦИЯ СМАЙЛОВ */}
        <VideoReactionsOverlay reactions={floatingReactions} />

        {/* 0. ПЛЕЕР ДЕМОНСТРАЦИИ ЭКРАНА */}
        <div
          className={`absolute inset-0 w-full h-full bg-black transition-opacity ${
            isScreenSharingActive ? 'z-30 opacity-100 pointer-events-auto' : 'z-0 opacity-0 pointer-events-none'
          }`}
        >
          {/* 0.1 Обычный видеопоток WebRTC */}
          <video
            ref={screenShareVideoRef}
            className="w-full h-full object-contain bg-black"
            autoPlay
            playsInline
            muted={isHost}
          />

          {/* 0.2 Отрисовка фоллбек кадров (Snapshots) при блокировке WebRTC фаерволами */}
          {!isHost && !remoteStream && fallbackFrame && (
            <img
              src={fallbackFrame}
              alt="Трансляция экрана"
              className="absolute inset-0 w-full h-full object-contain bg-black"
            />
          )}

          {/* Индикатор загрузки подключения */}
          {!isHost && !remoteStream && !fallbackFrame && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center z-40 space-y-2">
              <Loader2 className="h-8 w-8 text-pink-500 animate-spin mb-1" />
              <p className="text-xs font-bold text-white">Подключение к прямому эфиру ведущего ({room.host_name})...</p>
              <p className="text-[10px] text-slate-400">Устанавливается соединение трансляции</p>
              <Button
                onClick={handleRequestStreamAgain}
                size="sm"
                variant="outline"
                className="mt-2 text-[10px] h-7 border-purple-700 text-purple-300 hover:bg-purple-900/60 rounded-xl gap-1"
              >
                <RefreshCw className="h-3 w-3" /> Переподключить
              </Button>
            </div>
          )}

          {/* Подсказка для включения звука трансляции */}
          {!isHost && needAudioClick && (
            <div className={`absolute bottom-16 left-1/2 -translate-x-1/2 z-50 pointer-events-auto ${controlsVisibilityClass}`}>
              <Button
                onClick={handleEnableAudioClick}
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 to-pink-500 text-white font-bold text-xs h-9 px-4 rounded-full shadow-2xl animate-pulse gap-1.5 border border-white/20"
              >
                <Volume2 className="h-4 w-4 text-cyan-300" /> Включить звук трансляции
              </Button>
            </div>
          )}
        </div>

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
            className={`absolute inset-0 w-full h-full border-0 z-10 ${
              isHost ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
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
            className={`absolute inset-0 w-full h-full border-0 bg-black z-20 ${
              isHost ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock; clipboard-write; microphone; camera"
            allowFullScreen
          />
        )}

        {/* 4. DIRECT VIDEO (MP4 / WebM / OGG) */}
        {!isScreenSharingActive && mediaInfo.type === 'direct' && (
          <video
            ref={videoElementRef}
            src={mediaInfo.url}
            className={`absolute inset-0 w-full h-full object-contain bg-black ${
              isHost ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
            playsInline
          />
        )}

        {/* ПРОЗРАЧНЫЙ КЛИКЕР-ЗАЩИТА ДЛЯ ЗРИТЕЛЕЙ (Запрещает паузу кликом по видео) */}
        {!isHost && !isScreenSharingActive && (
          <div
            className="absolute inset-0 z-25 bg-transparent pointer-events-auto cursor-default"
            onClick={(e) => {
              e.stopPropagation();
              handleUserActivity();
            }}
          />
        )}

        {/* ОВЕРЛЕЙ ОШИБКИ ВСТРАИВАНИЯ */}
        {isEmbedBlocked && !isScreenSharingActive && (
          <div className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-amber-400 animate-pulse" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Автор ограничил встраивание видео</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                {isHost ? (
                  <>
                    Запустите <strong>Трансляцию экрана</strong> кнопкой ниже, чтобы показать это видео всем зрителям!
                  </>
                ) : (
                  <>
                    Ожидайте, пока владелец комнаты (<strong>{room.host_name}</strong>) запустит трансляцию своего экрана или выберите другое видео.
                  </>
                )}
              </p>
            </div>
            {isHost && (
              <Button
                onClick={handleToggleScreenShare}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 to-pink-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-lg shadow-pink-500/30"
              >
                <Monitor className="h-4 w-4 mr-1.5" /> Включить показ экрана
              </Button>
            )}
          </div>
        )}

        {(needUserGesture || (!isPlaying && room.is_playing && !isHost && mediaInfo.type === 'youtube')) &&
          !isEmbedBlocked &&
          !isScreenSharingActive && (
            <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
              <Button
                onClick={handleMobileUnlockClick}
                size="lg"
                className="bg-gradient-to-r from-purple-600 via-pink-600 to-pink-500 hover:opacity-90 text-white font-bold text-xs sm:text-sm h-11 px-6 rounded-2xl shadow-xl shadow-pink-500/40 animate-bounce gap-2"
              >
                <RotateCcw className="h-5 w-5 fill-white" />
                <span>Нажмите для запуска видео и звука</span>
              </Button>
            </div>
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