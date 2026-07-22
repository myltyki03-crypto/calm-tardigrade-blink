import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CategoryType, Room } from '@/types/rave';
import { useRooms } from '@/context/RoomContext';
import { showSuccess } from '@/utils/toast';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_CATEGORY_MEDIA: Record<CategoryType, { url: string; title: string; thumbnail: string }> = {
  music: {
    url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
    title: 'SYNTHWAVE Radio - Chill Beats to Relax/Study to',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
  },
  youtube: {
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    title: 'Lofi Hip Hop Radio - beats to relax/study to',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
  },
  movies: {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: 'Инди Анимационная Короткометражка',
    thumbnail: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80',
  },
  gaming: {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: 'Лучшие игровые хайлайты',
    thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
  },
  anime: {
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    title: 'Аниме Музыкальный Микс',
    thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
  },
  livestream: {
    url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
    title: 'Прямой DJ Стрим',
    thumbnail: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
  },
  all: {
    url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
    title: 'Популярная трансляция',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
  },
};

const extractYouTubeDetails = (url: string) => {
  let videoId = '4xDzrJKXOOY';
  if (url.includes('youtube.com/watch?v=')) {
    videoId = url.split('v=')[1]?.split('&')[0] || videoId;
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split('?')[0] || videoId;
  }
  return {
    videoId,
    thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  };
};

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const { addRoom, currentUser } = useRooms();
  const [title, setTitle] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [category, setCategory] = useState<CategoryType>('music');
  const [isPrivate, setIsPrivate] = useState(false);
  const [allowGuestQueue, setAllowGuestQueue] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const defaultMedia = DEFAULT_CATEGORY_MEDIA[category] || DEFAULT_CATEGORY_MEDIA.music;

    let finalUrl = defaultMedia.url;
    let finalTitle = defaultMedia.title;
    let finalThumbnail = defaultMedia.thumbnail;

    if (mediaUrl.trim()) {
      finalUrl = mediaUrl.trim();
      const ytDetails = extractYouTubeDetails(finalUrl);
      finalTitle = `YouTube Видео (${ytDetails.videoId})`;
      finalThumbnail = ytDetails.thumbnail;
    }

    const newRoom: Room = {
      id: `room-${Date.now()}`,
      title: title.trim(),
      category: category,
      host_id: currentUser.id,
      host_name: currentUser.username,
      host_avatar: currentUser.avatar_url,
      is_private: isPrivate,
      member_count: 1,
      current_media_url: finalUrl,
      current_media_title: finalTitle,
      current_media_thumbnail: finalThumbnail,
      playback_position_seconds: 0,
      is_playing: true,
      allow_guest_queue: allowGuestQueue,
      allow_guest_control: false,
      created_at: new Date().toISOString(),
    };

    addRoom(newRoom);
    showSuccess('Комната успешно создана!');
    setTitle('');
    setMediaUrl('');
    onClose();
    navigate(`/room/${newRoom.id}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 text-slate-100 border-purple-900/60 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Создать комнату просмотра
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Запустите совместный эфир и пригласите друзей для просмотра в реальном времени.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-semibold text-slate-300">
              Название комнаты
            </Label>
            <Input
              id="title"
              placeholder="Например: 🎧 Вечеринка с электронной музыкой"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-slate-950 border-purple-950 focus:border-pink-500 text-slate-100 text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mediaUrl" className="text-xs font-semibold text-slate-300">
              Ссылка на YouTube <span className="text-slate-500 font-normal">(необязательно)</span>
            </Label>
            <Input
              id="mediaUrl"
              placeholder="Вставьте ссылку на видео..."
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              className="bg-slate-950 border-purple-950 focus:border-pink-500 text-slate-100 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-300">Категория</Label>
            <Select value={category} onValueChange={(val: CategoryType) => setCategory(val)}>
              <SelectTrigger className="bg-slate-950 border-purple-950 text-slate-100 text-xs">
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-purple-800 text-slate-200 text-xs">
                <SelectItem value="music">Музыка и DJ</SelectItem>
                <SelectItem value="movies">Фильмы и кино</SelectItem>
                <SelectItem value="youtube">YouTube Видео</SelectItem>
                <SelectItem value="gaming">Игры и киберспорт</SelectItem>
                <SelectItem value="anime">Аниме и мультфильмы</SelectItem>
                <SelectItem value="livestream">Прямые стримы</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-2 space-y-3 border-t border-purple-950">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-medium text-slate-200">Приватная комната</Label>
                <p className="text-[11px] text-slate-400">Вход только по прямой ссылке</p>
              </div>
              <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-medium text-slate-200">Разрешить зрителям добавлять треки</Label>
                <p className="text-[11px] text-slate-400">Гости смогут пополнять очередь</p>
              </div>
              <Switch checked={allowGuestQueue} onCheckedChange={setAllowGuestQueue} />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-xs"
            >
              Запустить комнату
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};