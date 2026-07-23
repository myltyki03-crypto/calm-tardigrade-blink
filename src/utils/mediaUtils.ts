export type MediaType = 'youtube' | 'twitch' | 'rutube' | 'vk' | 'vimeo' | 'ok' | 'direct' | 'iframe';

export interface MediaInfo {
  type: MediaType;
  url: string;
  id: string;
  title: string;
  thumbnail: string;
  embedUrl?: string;
  twitchType?: 'channel' | 'video';
}

export const getEmbedUrlWithTime = (mediaInfo: MediaInfo, startSec: number, shouldAutoplay = false): string => {
  let baseUrl = mediaInfo.embedUrl || mediaInfo.url;
  if (!baseUrl) return '';

  const cleanSec = Math.max(0, Math.floor(startSec));
  const autoParam = shouldAutoplay ? '1' : '0';

  if (mediaInfo.type === 'vk') {
    // Очищаем старые параметры времени и автозапуска
    let urlWithoutParams = baseUrl
      .replace(/([?&])t=[^&]*/gi, '')
      .replace(/([?&])start=[^&]*/gi, '')
      .replace(/([?&])time=[^&]*/gi, '')
      .replace(/([?&])autoplay=[^&]*/gi, '')
      .replace(/&+/g, '&')
      .replace(/\?&/g, '?');

    const separator = urlWithoutParams.includes('?') ? '&' : '?';
    return `${urlWithoutParams}${separator}t=${cleanSec}s&autoplay=${autoParam}&js_api=1`;
  }

  if (mediaInfo.type === 'rutube') {
    let urlWithoutParams = baseUrl
      .replace(/([?&])t=[^&]*/gi, '')
      .replace(/([?&])start=[^&]*/gi, '')
      .replace(/([?&])autoplay=[^&]*/gi, '')
      .replace(/&+/g, '&')
      .replace(/\?&/g, '?');

    const separator = urlWithoutParams.includes('?') ? '&' : '?';
    return `${urlWithoutParams}${separator}start=${cleanSec}&autoplay=${autoParam}`;
  }

  if (mediaInfo.type === 'vimeo') {
    const urlWithoutHash = baseUrl.split('#')[0];
    return `${urlWithoutHash}#t=${cleanSec}s`;
  }

  if (mediaInfo.type === 'ok') {
    let urlWithoutParams = baseUrl
      .replace(/([?&])from=[^&]*/gi, '')
      .replace(/([?&])autoplay=[^&]*/gi, '')
      .replace(/&+/g, '&');
    const separator = urlWithoutParams.includes('?') ? '&' : '?';
    return `${urlWithoutParams}${separator}from=${cleanSec}&autoplay=${autoParam}`;
  }

  return baseUrl;
};

export const parseMediaUrl = (url: string): MediaInfo => {
  let cleanUrl = url.trim();

  // 1. Извлечение ссылки из скопированного кода <iframe> ВКонтакте
  if (cleanUrl.includes('<iframe')) {
    const srcMatch = cleanUrl.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      cleanUrl = srcMatch[1].replace(/&/g, '&');
    }
  }

  // 2. VK ВИДЕО (vk.com, vkvideo.ru, vk.ru, video_ext.php, клипы)
  if (
    cleanUrl.includes('vk.com') ||
    cleanUrl.includes('vkvideo.ru') ||
    cleanUrl.includes('vk.ru') ||
    cleanUrl.includes('video_ext.php')
  ) {
    const domain = cleanUrl.includes('vkvideo.ru') ? 'vkvideo.ru' : 'vk.com';

    let embedUrl = cleanUrl;

    if (!cleanUrl.includes('video_ext.php')) {
      let oid = '';
      let id = '';
      let hash = '';

      const hashMatch = cleanUrl.match(/[?&]hash=([a-f0-9]+)/i);
      if (hashMatch) hash = hashMatch[1];

      const extMatch = cleanUrl.match(/[?&]oid=(-?\d+)&id=(\d+)/i);
      const stdMatch = cleanUrl.match(/(?:video|clip)(-?\d+)_(\d+)/i);

      if (extMatch) {
        oid = extMatch[1];
        id = extMatch[2];
      } else if (stdMatch) {
        oid = stdMatch[1];
        id = stdMatch[2];
      }

      if (oid && id) {
        const hashParam = hash ? `&hash=${hash}` : '';
        // autoplay=0 по умолчанию, чтобы видео не запускалось само по себе
        embedUrl = `https://${domain}/video_ext.php?oid=${oid}&id=${id}${hashParam}&hd=2&autoplay=0&js_api=1`;
      }
    } else {
      if (!embedUrl.includes('autoplay=')) {
        embedUrl += (embedUrl.includes('?') ? '&' : '?') + 'autoplay=0';
      } else {
        embedUrl = embedUrl.replace(/autoplay=1/gi, 'autoplay=0');
      }
      if (!embedUrl.includes('js_api=')) {
        embedUrl += '&js_api=1';
      }
    }

    return {
      type: 'vk',
      url: cleanUrl,
      id: cleanUrl,
      title: 'VK Видео Трансляция',
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

  // 7. ПРЯМОЙ ВИДЕОФАЙЛ
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