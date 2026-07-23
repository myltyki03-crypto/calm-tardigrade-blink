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

export const parseMediaUrl = (url: string): MediaInfo => {
  const cleanUrl = url.trim();

  // 1. RUTUBE (rutube.ru/video/id/ или rutube.ru/play/embed/id/)
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
      embedUrl: `https://rutube.ru/play/embed/${videoId}/?autoplay=1`,
    };
  }

  // 2. VK ВИДЕО (vk.com/video-123_456, vkvideo.ru/video-123_456, vk.com/video_ext.php...)
  if (cleanUrl.includes('vk.com/') || cleanUrl.includes('vkvideo.ru/')) {
    let oid = '';
    let id = '';
    let hash = '';

    const extMatch = cleanUrl.match(/oid=(-?\d+)&id=(\d+)/i);
    const stdMatch = cleanUrl.match(/video(-?\d+)_(\d+)/i);
    const hashMatch = cleanUrl.match(/hash=([a-f0-9]+)/i);

    if (hashMatch) {
      hash = hashMatch[1];
    }

    if (extMatch) {
      oid = extMatch[1];
      id = extMatch[2];
    } else if (stdMatch) {
      oid = stdMatch[1];
      id = stdMatch[2];
    }

    if (oid && id) {
      const hashParam = hash ? `&hash=${hash}` : '';
      return {
        type: 'vk',
        url: cleanUrl,
        id: `${oid}_${id}`,
        title: `VK Видео (${oid}_${id})`,
        thumbnail: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=80',
        embedUrl: `https://vk.com/video_ext.php?oid=${oid}&id=${id}${hashParam}&hd=2&autoplay=1`,
      };
    }
  }

  // 3. TWITCH (twitch.tv/channel или twitch.tv/videos/id)
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

  // 4. VIMEO (vimeo.com/123456789)
  if (cleanUrl.includes('vimeo.com/')) {
    const match = cleanUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    const videoId = match ? match[1] : '';
    return {
      type: 'vimeo',
      url: cleanUrl,
      id: videoId,
      title: `Vimeo Видео (${videoId})`,
      thumbnail: 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?w=600&auto=format&fit=crop&q=80',
      embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=1`,
    };
  }

  // 5. OK.RU (ok.ru/video/123456789 или ok.ru/videoembed/123456789)
  if (cleanUrl.includes('ok.ru/')) {
    const match = cleanUrl.match(/video(?:embed)?\/(\d+)/i);
    const videoId = match ? match[1] : '';
    return {
      type: 'ok',
      url: cleanUrl,
      id: videoId,
      title: `OK.ru Видео (${videoId})`,
      thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
      embedUrl: `https://ok.ru/videoembed/${videoId}?autoplay=1`,
    };
  }

  // 6. ПРЯМОЙ ВИДЕОФАЙЛ (MP4 / WebM / OGG / M3U8)
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

  // 7. YOUTUBE (по умолчанию для ссылок youtube)
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

  // 8. УНИВЕРСАЛЬНЫЙ СУЩЕСТВУЮЩИЙ IFRAME / ССЫЛКА (Fallback)
  return {
    type: 'iframe',
    url: cleanUrl,
    id: cleanUrl,
    title: 'Веб Видеопоток',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    embedUrl: cleanUrl,
  };
};