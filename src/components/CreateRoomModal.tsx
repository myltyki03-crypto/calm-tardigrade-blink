import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Lock, Tv } from 'lucide-react';
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
import { parseMediaUrl } from '@/utils/mediaUtils';
import { showSuccess, showError } from '@/utils/toast';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_CATEGORY_MEDIA: Record<CategoryType, { url: string; title: string; thumbnail: string }> = {
  music: {
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    title: 'Lofi Hip Hop Radio - Beats to relax/study to',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
  },
  youtube: {
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    title: 'Lofi Hip Hop Radio - Beats to relax/study to',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
  },
  movies: {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: 'Инди Анимационная Короткометражка',
    thumbnail: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80',
  },
  gaming: {
    url: 'https://www.twitch.tv/shroud',
    title: 'Twitch Стрим Games',
    thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
  },
  anime: {
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    title: 'Аниме Музыкальный Микс',
    thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
  },
  livestream: {
    url: 'https://www.twitch.tv/shroud',
    title: 'Прямой Twitch Стрим',
    thumbnail: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
  },
  all: {
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    title: 'Популярная трансляция',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
  },
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
  const [accessCode, setAccessCode] = useState('');
  const [allowGuestQueue, setAllowGuestQueue] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (isPrivate && !accessCode.trim()) {
      showError('Укажите пароль для приватной комнаты');
      return;
    }

    const defaultMedia = DEFAULT_CATEGORY_MEDIA[category] || DEFAULT_CATEGORY_MEDIA.music;

    let finalUrl = defaultMedia.url;
    let finalTitle = defaultMedia.title;
    let finalThumbnail = defaultMedia.thumbnail;

    if (mediaUrl.trim()) {
      finalUrl = mediaUrl.trim();
      const info = parseMediaUrl(finalUrl);
      finalTitle = info.title;
      finalThumbnail = info.thumbnail;
    }

    const newRoom: Room = {
      id: `room-${Date.now()}`,
      title: title.trim(),
      category: category,
      host_id: currentUser.id,
      host_name: currentUser.username,
      host_avatar: currentUser.avatar_url,
      is_private: isPrivate,
      access_code: isPrivate ? accessCode.trim() : undefined,
      member_count: 1,
      current_media_url: finalUrl,
      current_media_title: finalTitle,
      current_media_thumbnail: finalThumbnail,
      playback_position_seconds: 0,
      is_playing: false,
      allow_guest_queue: allowGuestQueue,
      allow_guest_control: false,
      created_at: new Date().toISOString(),
    };

    addRoom(newRoom);
    showSuccess('Комната создана!');
    setTitle('');
    setMediaUrl('');
    setAccessCode('');
    setIsPrivate(false);
    onClose();
    navigate(`/room/${newRoom.id}`, { state: { unlocked: true } });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 text-slate-100 border-purple-900/60 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Создать комнату просмотра
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Поддерживаются ссылки и код iframe с YouTube, VK Видео, Rutube, Twitch, Vimeo, OK.ru и MP4 файлы.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2" autoComplete="off">
          <input type="text" style={{ display: 'none' }} tabIndex={-1} />
          <input type="password" style={{ display: 'none' }} tabIndex={-1} />

          <div className="space-y-1.5">
            <Label htmlFor="room_title_field" className="text-xs font-semibold text-slate-300">
              Название комнаты
            </Label>
            <Input
              id="room_title_field"
              name="no_autofill_title"
              autoComplete="off"
              placeholder="Например: 🎧 Вечеринка со стримом или муз. клипами"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-slate-950 border-purple-950 focus:border-pink-500 text-slate-100 text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="room_media_url_field" className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Ссылка или код iframe</span>
              <span className="text-[10px] text-purple-400 font-normal flex items-center gap-1">
                <Tv className="h-3 w-3" /> VK Видео, YouTube, Rutube, Twitch, MP4
              </span>
            </Label>
            <Input
              id="room_media_url_field"
              name="no_autofill_media_url"
              autoComplete="off"
              placeholder="Вставьте ссылку от VK Видео, YouTube и др."
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
                <SelectItem value="youtube">VK Видео / YouTube / Rutube</SelectItem>
                <SelectItem value="gaming">Twitch / Игры</SelectItem>
                <SelectItem value="anime">Аниме и мультфильмы</SelectItem>
                <SelectItem value="livestream">Прямые стримы</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-2 space-y-3 border-t border-purple-950">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-amber-400" /> Приватная комната (по паролю)
                </Label>
                <p className="text-[11px] text-slate-400">Вход только по паролю</p>
              </div>
              <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
            </div>

            {isPrivate && (
              <div className="space-y-1.5 bg-amber-950/30 p-3 rounded-xl border border-amber-500/30">
                <Label htmlFor="room_access_code_field" className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-amber-400" /> Установите пароль
                </Label>
                <Input
                  id="room_access_code_field"
                  type="text"
                  name="room_access_pass_code"
                  placeholder="Придумайте пароль..."
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="bg-slate-950 border-amber-500/40 focus:border-amber-400 text-amber-200 text-xs font-mono [text-security:disc] [-webkit-text-security:disc]"
                  required={isPrivate}
                />
              </div>
            )}

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
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 to-pink-500 text-white font-semibold text-xs"
            >
              Запустить комнату
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};