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
import { CURRENT_USER } from '@/data/mockRaveData';
import { showSuccess } from '@/utils/toast';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated: (newRoom: Room) => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onRoomCreated,
}) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [mediaUrl, setMediaUrl] = useState('https://www.youtube.com/watch?v=4xDzrJKXOOY');
  const [category, setCategory] = useState<CategoryType>('music');
  const [isPrivate, setIsPrivate] = useState(false);
  const [allowGuestQueue, setAllowGuestQueue] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newRoom: Room = {
      id: `room-${Date.now()}`,
      title: title.trim(),
      category: category,
      host_id: CURRENT_USER.id,
      host_name: CURRENT_USER.username,
      host_avatar: CURRENT_USER.avatar_url,
      is_private: isPrivate,
      member_count: 1,
      current_media_url: mediaUrl,
      current_media_title: 'Custom party stream',
      current_media_thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
      playback_position_seconds: 0,
      is_playing: true,
      allow_guest_queue: allowGuestQueue,
      allow_guest_control: false,
      created_at: new Date().toISOString(),
    };

    onRoomCreated(newRoom);
    showSuccess('Party Room Created!');
    onClose();
    navigate(`/room/${newRoom.id}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 text-slate-100 border-purple-900/60 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Create Watch Party Room
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Start a live video or music session and invite your friends or the public to join in real-time.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-semibold text-slate-300">
              Party Title
            </Label>
            <Input
              id="title"
              placeholder="e.g. 🎧 Electronic Music Vibe Party"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-slate-950 border-purple-950 focus:border-pink-500 text-slate-100"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mediaUrl" className="text-xs font-semibold text-slate-300">
              Initial YouTube or Stream URL
            </Label>
            <Input
              id="mediaUrl"
              placeholder="https://www.youtube.com/watch?v=..."
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              className="bg-slate-950 border-purple-950 focus:border-pink-500 text-slate-100"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-300">Category</Label>
            <Select value={category} onValueChange={(val: CategoryType) => setCategory(val)}>
              <SelectTrigger className="bg-slate-950 border-purple-950 text-slate-100">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-purple-800 text-slate-200">
                <SelectItem value="music">Music & DJ</SelectItem>
                <SelectItem value="movies">Movies & Cinema</SelectItem>
                <SelectItem value="youtube">YouTube Videos</SelectItem>
                <SelectItem value="gaming">Gaming & Esports</SelectItem>
                <SelectItem value="anime">Anime & Cartoons</SelectItem>
                <SelectItem value="livestream">Live Streams</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-2 space-y-3 border-t border-purple-950">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-medium text-slate-200">Private Room</Label>
                <p className="text-[11px] text-slate-400">Only people with direct code can join</p>
              </div>
              <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-medium text-slate-200">Allow Listeners to Add Queue</Label>
                <p className="text-[11px] text-slate-400">Guests can submit video requests</p>
              </div>
              <Switch checked={allowGuestQueue} onCheckedChange={setAllowGuestQueue} />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-800 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold"
            >
              Launch Room
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};