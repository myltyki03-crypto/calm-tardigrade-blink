export type MediaType = 'youtube' | 'twitch' | 'direct';

export interface MediaInfo {
  type: MediaType;
  url: string;
  id: string;
  title: string;
  thumbnail: string;
  twitchType?: 'channel' | 'video';
}

export const parseMediaUrl = (url: string): MediaInfo => {
  const cleanUrl = url.trim();

  // Проверка Twitch
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

  // Проверка прямого видео (MP4 / WebM / Ogg)
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

  // YouTube по умолчанию
  let videoId = '4xDzrJKXOOY';
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
};