export type UserRole = 'host' | 'dj' | 'moderator' | 'listener';

export type CategoryType = 'all' | 'music' | 'movies' | 'youtube' | 'gaming' | 'anime' | 'livestream';

export interface UserProfile {
  id: string;
  username: string;
  avatar_url: string;
  is_online?: boolean;
  status_message?: string;
  is_vip?: boolean;
  watch_time_minutes?: number;
  parties_hosted?: number;
}

export interface QueueItem {
  id: string;
  room_id: string;
  title: string;
  url: string;
  thumbnail_url?: string;
  duration_seconds: number;
  added_by_name: string;
  added_by_avatar?: string;
  votes: number;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  message: string;
  type?: 'chat' | 'system' | 'reaction';
  reaction_symbol?: string;
  created_at: string;
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  role: UserRole;
  is_speaking?: boolean;
  is_muted?: boolean;
  joined_at: string;
}

export interface Room {
  id: string;
  title: string;
  description?: string;
  category: CategoryType;
  host_id: string;
  host_name: string;
  host_avatar: string;
  is_private: boolean;
  access_code?: string;
  max_listeners?: number;
  current_media_url?: string;
  current_media_title?: string;
  current_media_thumbnail?: string;
  playback_position_seconds: number;
  is_playing: boolean;
  member_count: number;
  allow_guest_queue: boolean;
  allow_guest_control: boolean;
  created_at: string;
}