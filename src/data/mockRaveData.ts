import { Room, QueueItem, ChatMessage, UserProfile } from '@/types/rave';

export const CURRENT_USER: UserProfile = {
  id: 'user_me',
  username: 'VibeRaver_99',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  is_online: true,
  status_message: 'Слушаю Synthwave ритмы 🎧',
  is_vip: true,
  watch_time_minutes: 1420,
  parties_hosted: 18,
};

export const MOCK_FRIENDS: UserProfile[] = [];

export const INITIAL_ROOMS: Room[] = [
  {
    id: 'room-1',
    title: '🔥 Synthwave & Retrowave Ночная Вечеринка',
    description: 'Нон-стоп синтвейв и визуализатор! Все могут добавлять треки в очередь.',
    category: 'music',
    host_id: 'user_me',
    host_name: 'VibeRaver_99',
    host_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    is_private: false,
    member_count: 1,
    current_media_url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
    current_media_title: 'SYNTHWAVE Radio - Chill Beats to Relax/Study to',
    current_media_thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    playback_position_seconds: 120,
    last_updated_at: new Date().toISOString(),
    is_playing: true,
    allow_guest_queue: true,
    allow_guest_control: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'room-2',
    title: '🎬 Киновечер: Лучшие анимационные короткометражки',
    description: 'Смотрим шедевры инди-анимации вместе с живым чатом.',
    category: 'movies',
    host_id: 'host-2',
    host_name: 'КиноМан',
    host_avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    is_private: false,
    member_count: 1,
    current_media_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    current_media_title: 'Короткометражный CGI Фильм HD',
    current_media_thumbnail: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80',
    playback_position_seconds: 45,
    last_updated_at: new Date().toISOString(),
    is_playing: true,
    allow_guest_queue: true,
    allow_guest_control: true,
    created_at: new Date().toISOString(),
  }
];

export const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'm1',
    room_id: 'room-1',
    user_id: 'system',
    user_name: 'Система',
    message: 'Добро пожаловать в комнату! Поделитесь ссылкой, чтобы пригласить друзей.',
    type: 'system',
    created_at: '22:00',
  }
];

export const INITIAL_QUEUE: QueueItem[] = [
  {
    id: 'q1',
    room_id: 'room-1',
    title: 'SYNTHWAVE Radio - Chill Beats to Relax/Study to',
    url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
    thumbnail_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80',
    duration_seconds: 240,
    added_by_name: 'VibeRaver_99',
    votes: 1,
    created_at: new Date().toISOString(),
  }
];