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

  // Флаг защиты от нулевых стартовых сигналов плеера
  const iframeLoadedTimeRef = useRef<number>(Date.now());
  const isUserSeekingRef = useRef<boolean>(false);

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
  const [isEmbedBlocked, setIsEmbedBlocked] = useState(false);

  const [iframeKey, setIframeKey] = useState<number>(Date.now());

  const [iframeSrc, setIframeSrc] = useState<string>(() => {
    return getEmbedUrlWithTime(mediaInfo, room.playback_position_seconds || 0, false);
  });

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

  // Отправка команд в iframe плеера (VK, Rutube)
  const sendIframeCommand = (command: 'play' | 'pause' | 'seek' | 'volume', value?: number) => {
    if (!iframeRef.current?.contentWindow) return;
    const win = iframeRef.current.contentWindow;

    try {
      if (command === 'play') {
        win.postMessage({ box_msg: 'play' }, '*');
        win.postMessage({ type: 'play' }, '*');
        win.postMessage({ event: 'play' }, '*');
        win.postMessage({ method: 'play' }, '*');
        win.postMessage(JSON.stringify({ type: 'action', action: 'play' }), '*');
        win.postMessage(JSON.stringify({ box_msg: 'play' }), '*');
      } else if (command === 'pause') {
        win.postMessage({ box_msg: 'pause' }, '*');
        win.postMessage({ type: 'pause' }, '*');
        win.postMessage({ event: 'pause' }, '*');
        win.postMessage({ method: 'pause' }, '*');
        win.postMessage(JSON.stringify({ type: 'action', action: 'pause' }), '*');
        win.postMessage(JSON.stringify({ box_msg: 'pause' }), '*');
      } else if (command === 'seek' && typeof value === 'number') {
        win.postMessage({ box_msg: 'seek', value: value }, '*');
        win.postMessage({ type: 'seek', time: value, value: value }, '*');
        win.postMessage({ event: 'seek', param: value }, '*');
        win.postMessage({ method: 'seek', param: value }, '*');
        win.postMessage(JSON.stringify({ type: 'action', action: 'seek', value: value }), '*');
        win.postMessage(JSON.stringify({ box_msg: 'seek', value: value }), '*');
      }
    } catch (e) {
      console.error('Failed to send iframe command:', e);
    }
  };

  // Перехват PostMessage сообщений от VK Видео и обработка времени с защитой от сброса на 0
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      try {
        let data = event.data;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch {}
        }

        if (!data) return;

        const eventType = data.event || data.type || data.box_msg || (Array.isArray(data) ? data[0] : null);

        let timeVal: number | undefined = undefined;
        if (typeof data.time === 'number') timeVal = data.time;
        else if (typeof data.param === 'number') timeVal = data.param;
        else if (typeof data.value === 'number') timeVal = data.value;
        else if (typeof data.currentTime === 'number') timeVal = data.currentTime;
        else if (Array.isArray(data) && typeof data[1] === 'number') timeVal = data[1];

        if (typeof timeVal === 'number' && timeVal >= 0 && !isNaN(timeVal)) {
          const now = Date.now();
          const isInitialBufferingPeriod = now - iframeLoadedTimeRef.current < 2500;

          // ЗАЩИТА: Если идет период загрузки плеера ИЛИ время внезапно сбросилось в 0 когда видео уже шло,
          // НЕ перезаписываем время ведущего на 0
          const isSpuriousZero = timeVal < 1 && currentTime > 3 && !isUserSeekingRef.current;

          if (!isInitialBufferingPeriod && !isSpuriousZero) {
            setCurrentTime(timeVal);

            if (isHost && isPlaying) {
              if (now - lastHostSyncSaveRef.current > 3000) {
                lastHostSyncSaveRef.current = now;
                updateRoomProgress(room.id, timeVal, true);
              }
            }
          }
        }

        if (eventType === 'play' || eventType === 'video_play' || eventType === 'started' || eventType === 'playing') {
          setIsPlaying(true);
          if (isHost && Date.now() - iframeLoadedTimeRef.current > 2000) {
            updateRoomProgress(room.id, currentTime, true);
          }
        } else if (eventType === 'pause' || eventType === 'video_pause' || eventType === 'paused') {
          setIsPlaying(false);
          if (isHost && Date.now() - iframeLoadedTimeRef.current > 2000) {
            updateRoomProgress(room.id, currentTime, false);
          }
        }
      } catch (e) {}
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [isHost, isPlaying, currentTime, room.id]);

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

  // Локальный таймер для сторонних iframe (VK, Rutube)
  useEffect(() => {
    if (isIframePlayer) {
      let interval: NodeJS.Timeout | null = null;
      if (isPlaying) {
        interval = setInterval(() => {
          setCurrentTime((prev) => {
            const next = prev + 1;
            if (isHost && Date.now() - iframeLoadedTimeRef.current > 3000 && Date.now() - lastHostSyncSaveRef.current > 3000) {
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
    iframeLoadedTimeRef.current = Date.now();

    const initialSec = getCalculatedHostTime();
    setCurrentTime(initialSec);
    setIframeSrc(getEmbedUrlWithTime(mediaInfo, initialSec, room.is_playing));
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

      const startSec = getCalculatedHostTime();

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

  // Синхронизация зрителей с создателем комнаты
  useEffect(() => {
    if (!isHost && room.last_updated_at !== prevLastUpdatedRef.current) {
      prevLastUpdatedRef.current = room.last_updated_at;
      const targetHostTime = getCalculatedHostTime();

      if (mediaInfo.type === 'youtube' && ytPlayerRef.current?.seekTo) {
        let localTime = 0;
        try {
          localTime = ytPlayerRef.current.getCurrentTime?.() || 0;
        } catch (err) {}

        if (Math.abs(localTime - targetHostTime) > 3) {
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
        if (Math.abs(v.currentTime - targetHostTime) > 3) {
          v.currentTime = targetHostTime;
        }
        if (room.is_playing) {
          v.play().catch(() => setNeedUserGesture(true));
          setIsPlaying(true);
        } else {
          v.pause();
          setIsPlaying(false);
        }
      } else if (isIframePlayer) {
        const timeDiff = Math.abs(currentTime - targetHostTime);

        // Мягкий пост-месседж сдвиг времени без перезагрузок плеера
        if (timeDiff > 3) {
          sendIframeCommand('seek', targetHostTime);
          setCurrentTime(targetHostTime);
        }

        if (room.is_playing !== isPlaying) {
          setIsPlaying(room.is_playing);
          sendIframeCommand(room.is_playing ? 'play' : 'pause');
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
      const syncTime = getCalculatedHostTime();
      setIframeSrc(getEmbedUrlWithTime(mediaInfo, syncTime, true));
      setIframeKey(Date.now());
      sendIframeCommand('play');
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

    if (!isHost) return;

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
    } else {
      const nextPlaying = !isPlaying;
      setIsPlaying(nextPlaying);
      sendIframeCommand(nextPlaying ? 'play' : 'pause');
      updateRoomProgress(room.id, currentTime, nextPlaying);
    }
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
    }
  };

  const handleSeek = (newProgressPercent: number) => {
    if (!isHost) return;

    isUserSeekingRef.current = true;
    setTimeout(() => {
      isUserSeekingRef.current = false;
    }, 2000);

    if (duration > 0 || mediaInfo.type === 'vk') {
      const maxSec = duration > 0 ? duration : 3600;
      const targetSeconds = (newProgressPercent / 100) * maxSec;
      setCurrentTime(targetSeconds);

      if (mediaInfo.type === 'youtube' && ytPlayerRef.current?.seekTo) {
        ytPlayerRef.current.seekTo(targetSeconds, true);
      } else if (mediaInfo.type === 'direct' && videoElementRef.current) {
        videoElementRef.current.currentTime = targetSeconds;
      } else {
        sendIframeCommand('seek', targetSeconds);
      }

      updateRoomProgress(room.id, targetSeconds, isPlaying);
    }
  };

  const handleSyncClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const syncTime = getCalculatedHostTime();

    if (isHost) {
      let curSec = currentTime;
      if (mediaInfo.type === 'youtube' && ytPlayerRef.current?.getCurrentTime) {
        curSec = ytPlayerRef.current.getCurrentTime() || currentTime;
      } else if (mediaInfo.type === 'direct' && videoElementRef.current) {
        curSec = videoElementRef.current.currentTime || currentTime;
      }
      updateRoomProgress(room.id, curSec, isPlaying);
      showSuccess('Время трансляции синхронизировано!');
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
        setIsPlaying(true);

        sendIframeCommand('seek', syncTime);
        sendIframeCommand('play');

        const newEmbedUrl = getEmbedUrlWithTime(mediaInfo, syncTime, true);
        setIframeSrc(newEmbedUrl);
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