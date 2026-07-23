export type MediaType = 'youtube' | 'vk' | 'twitch' | 'rutube' | 'vimeo' | 'ok' | 'direct' | 'iframe';

export interface MediaInfo {
  type: MediaType;
  url: string;
  id: string;
  title: string;
  thumbnail: string;
  embedUrl?: string;
  twitchType?: 'channel' | 'video';
}

export const getEmbedUrlWithTime = (mediaInfo: MediaInfo, startSec: number, shouldAutoplay = true): string => {
  let baseUrl = mediaInfo.embedUrl || mediaInfo.url;
  if (!baseUrl) return '';

  const cleanSec = Math.max(0, Math.floor(startSec));

  if (mediaInfo.type === 'vk') {
    try {
      const urlObj = new URL(baseUrl);
      urlObj.searchParams.set('js_api', '1');
      
      if (shouldAutoplay) {
        urlObj.searchParams.set('autoplay', '1');
      } else {
        urlObj.searchParams.delete('autoplay');
      }

      if (cleanSec > 0) {
        const hours = Math.floor(cleanSec / 3600);
        const mins = Math.floor((cleanSec % 3600) / 60);
        const secs = cleanSec % 60;

        let tStr = '';
        if (hours > 0) {
          tStr = `${hours}h${mins}m${secs}s`;
        } else if (mins > 0) {
          tStr = `${mins}m${secs}s`;
        } else {
          tStr = `${secs}s`;
        }

        urlObj.searchParams.set('t', tStr);
      } else {
        urlObj.searchParams.delete('t');
      }

      return urlObj.toString();
    } catch {
      return baseUrl;
    }
  }

  if (mediaInfo.type === 'rutube') {
    try {
      const urlObj = new URL(baseUrl);
      urlObj.searchParams.set('start', cleanSec.toString());
      if (shouldAutoplay) urlObj.searchParams.set('autoplay', '1');
      return urlObj.toString();
    } catch {
      return baseUrl;
    }
  }

  if (mediaInfo.type === 'vimeo') {
    const urlWithoutHash = baseUrl.split('#')[0];
    return `${urlWithoutHash}#t=${cleanSec}s`;
  }

  if (mediaInfo.type === 'ok') {
    try {
      const urlObj = new URL(baseUrl);
      urlObj.searchParams.set('from', cleanSec.toString());
      if (shouldAutoplay) urlObj.searchParams.set('autoplay', '1');
      return urlObj.toString();
    } catch {
      return baseUrl;
    }
  }

  return baseUrl;
};

export const parseMediaUrl = (url: string): MediaInfo => {
  let cleanUrl = url.trim();

  // 1. Извлечение ссылки из <iframe> кодов ВКонтакте или других сервисов
  if (cleanUrl.includes('<iframe')) {
    const srcMatch = cleanUrl.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      cleanUrl = srcMatch[1].replace(/&/g, '&');
    }
  }

  // 2. VK ВИДЕО (vk.com или vkvideo.ru)
  if (cleanUrl.includes('vk.com/') || cleanUrl.includes('vkvideo.ru/')) {
    let embedUrl = cleanUrl;
    let videoId = '';
    const isVkVideoDomain = cleanUrl.includes('vkvideo.ru');

    // Если вставлен готовый embed плеера (video_ext.php)
    if (cleanUrl.includes('video_ext.php')) {
      try {
        const u = new URL(cleanUrl);
        u.searchParams.set('js_api', '1');
        if (!u.searchParams.has('hd')) u.searchParams.set('hd', '2');
        embedUrl = u.toString();
        const oid = u.searchParams.get('oid');
        const id = u.searchParams.get('id');
        if (oid && id) videoId = `${oid}_${id}`;
      } catch {
        embedUrl = cleanUrl;
      }
    } else {
      // Прямые ссылки вида vkvideo.ru/video-228893636_456239357 или vk.com/video-228893636_456239357
      const match = cleanUrl.match(/(?:video|clip|wall)(-?\d+)_(\d+)/i);
      if (match) {
        const oid = match[1];
        const id = match[2];
        videoId = `${oid}_${id}`;

        let hash = '';
        try {
          const parsedUrl = new URL(cleanUrl);
          hash = parsedUrl.searchParams.get('hash') || '';
        } catch {}

        const hashParam = hash ? `&hash=${hash}` : '';
        const domain = isVkVideoDomain ? 'https://vkvideo.ru' : 'https://vk.com';
        embedUrl = `${domain}/video_ext.php?oid=${oid}&id=${id}${hashParam}&hd=2&js_api=1`;
      }
    }

    return {
      type: 'vk',
      url: cleanUrl,
      id: videoId || cleanUrl,
      title: `VK Видео (${videoId || 'эфир'})`,
      thumbnail: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=80',
      embedUrl: embedUrl,
    };
  }

  // 3. RUTUBE
  if (cleanUrl.includes('rutube.ru/')) {
    let videoId = '';
    const match = cleanUrl.match(/(?:video|embed)\/([a-zA-Z0-9]+)/i);
    if (match && match[1]) {
      videoId = match[1];
    } else {
      const parts = cleanUrl.split('/').filter(Boolean);
      videoId = parts[parts.length - 1] || '';
    }

    return {
      type: 'rutube',
      url: cleanUrl,
      id: videoId,
      title: `Rutube Видео (${videoId})`,
      thumbnail: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=600&auto=format&fit=crop&q=80',
      embedUrl: `https://rutube.ru/play/embed/${videoId}/?autoplay=0`,
    };
  }

  // 4. TWITCH
  if (cleanUrl.includes('twitch.tv/')) {
    if (cleanUrl.includes('twitch.tv/videos/')) {
      const parts = cleanUrl.split('twitch.tv/videos/');
      const videoId = parts[1]?.split('?')[0]?.split('/')[0] || '';
      return {
        type: 'twitch',
        url: cleanUrl,
        id: videoId,
        twitchType: 'video',
        title: `Twitch Запись (${videoId})`,
        thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
      };
    } else {
      const parts = cleanUrl.split('twitch.tv/');
      const channel = parts[1]?.split('?')[0]?.split('/')[0] || '';
      return {
        type: 'twitch',
        url: cleanUrl,
        id: channel,
        twitchType: 'channel',
        title: `Twitch Стрим: ${channel}`,
        thumbnail: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
      };
    }
  }

  // 5. VIMEO
  if (cleanUrl.includes('vimeo.com/')) {
    const match = cleanUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    const videoId = match ? match[1] : '';
    return {
      type: 'vimeo',
      url: cleanUrl,
      id: videoId,
      title: `Vimeo Видео (${videoId})`,
      thumbnail: 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?w=600&auto=format&fit=crop&q=80',
      embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=0`,
    };
  }

  // 6. OK.RU
  if (cleanUrl.includes('ok.ru/')) {
    const match = cleanUrl.match(/video(?:embed)?\/(\d+)/i);
    const videoId = match ? match[1] : '';
    return {
      type: 'ok',
      url: cleanUrl,
      id: videoId,
      title: `OK.ru Видео (${videoId})`,
      thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
      embedUrl: `https://ok.ru/videoembed/${videoId}?autoplay=0`,
    };
  }

  // 7. ПРЯМОЙ ВИДЕОФАЙЛ (MP4 / WebM / OGG)
  if (cleanUrl.match(/\.(mp4|webm|ogg|m3u8)(\?.*)?$/i)) {
    const filename = cleanUrl.split('/').pop()?.split('?')[0] || 'Прямой видеопоток';
    return {
      type: 'direct',
      url: cleanUrl,
      id: cleanUrl,
      title: filename,
      thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    };
  }

  // 8. YOUTUBE
  if (
    cleanUrl.includes('youtube.com/') ||
    cleanUrl.includes('youtu.be/')
  ) {
    let videoId = 'jfKfPfyJRdk';
    if (cleanUrl.includes('youtube.com/watch?v=')) {
      videoId = cleanUrl.split('v=')[1]?.split('&')[0] || videoId;
    } else if (cleanUrl.includes('youtu.be/')) {
      videoId = cleanUrl.split('youtu.be/')[1]?.split('?')[0] || videoId;
    } else if (cleanUrl.includes('youtube.com/embed/')) {
      videoId = cleanUrl.split('embed/')[1]?.split('?')[0] || videoId;
    } else if (cleanUrl.includes('youtube.com/shorts/')) {
      videoId = cleanUrl.split('shorts/')[1]?.split('?')[0] || videoId;
    }

    return {
      type: 'youtube',
      url: cleanUrl,
      id: videoId,
      title: `YouTube (${videoId})`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  }

  // 9. FALLBACK IFRAME
  return {
    type: 'iframe',
    url: cleanUrl,
    id: cleanUrl,
    title: 'Веб Видеопоток',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    embedUrl: cleanUrl,
  };
};