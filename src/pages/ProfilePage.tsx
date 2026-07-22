import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Radio, Edit3, User, Image, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { useRooms } from '@/context/RoomContext';
import { showSuccess } from '@/utils/toast';

export const ProfilePage = () => {
  const navigate = useNavigate();
  const { currentUser, updateUserProfile } = useRooms();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [username, setUsername] = useState(currentUser.username);
  const [statusMessage, setStatusMessage] = useState(currentUser.status_message || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar_url);

  const handleOpenEdit = () => {
    setUsername(currentUser.username);
    setStatusMessage(currentUser.status_message || '');
    setAvatarUrl(currentUser.avatar_url);
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    updateUserProfile({
      username: username.trim(),
      status_message: statusMessage.trim(),
      avatar_url: avatarUrl.trim() || currentUser.avatar_url,
    });

    showSuccess('Profile updated successfully!');
    setIsEditModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col items-center">
      <div className="w-full max-w-xl space-y-6">
        <Button
          onClick={() => navigate('/')}
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-white gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" /> Home
        </Button>

        <div className="p-6 rounded-3xl border border-purple-900/50 bg-slate-900/90 text-center relative overflow-hidden shadow-2xl">
          {/* Edit Button */}
          <Button
            onClick={handleOpenEdit}
            size="sm"
            variant="outline"
            className="absolute top-4 right-4 border-purple-800 text-purple-300 hover:bg-purple-950 hover:text-white text-xs gap-1.5 rounded-xl"
          >
            <Edit3 className="h-3.5 w-3.5" /> Edit Profile
          </Button>

          <div className="relative mx-auto h-24 w-24 rounded-full ring-4 ring-pink-500/50 overflow-hidden mb-4 mt-2 shadow-lg">
            <img
              src={currentUser.avatar_url}
              alt={currentUser.username}
              className="h-full w-full object-cover"
            />
          </div>

          <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            {currentUser.username}
            <Badge className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[10px]">
              PRO HOST
            </Badge>
          </h2>

          <p className="text-xs text-purple-300 mt-1 max-w-xs mx-auto">
            {currentUser.status_message || 'No status message set'}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-purple-950 pt-4">
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-purple-900/30">
              <Clock className="h-5 w-5 text-cyan-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-slate-100">{currentUser.watch_time_minutes || 0} min</div>
              <div className="text-[10px] text-slate-400">Total Watch Time</div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/60 border border-purple-900/30">
              <Radio className="h-5 w-5 text-pink-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-slate-100">{currentUser.parties_hosted || 0}</div>
              <div className="text-[10px] text-slate-400">Parties Hosted</div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-slate-900 text-slate-100 border-purple-900/60 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              Edit Your Profile
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Update your nickname, status message, or profile avatar link.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-pink-400" /> Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter nickname..."
                className="bg-slate-950 border-purple-950 focus:border-pink-500 text-slate-100 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-cyan-400" /> Status Message
              </Label>
              <Input
                id="status"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                placeholder="e.g. Chilling with electronic music 🎧"
                className="bg-slate-950 border-purple-950 focus:border-pink-500 text-slate-100 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="avatar" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Image className="h-3.5 w-3.5 text-purple-400" /> Avatar Image URL
              </Label>
              <Input
                id="avatar"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="Paste avatar URL..."
                className="bg-slate-950 border-purple-950 focus:border-pink-500 text-slate-100 text-xs"
              />
            </div>

            {/* Avatar Preview */}
            <div className="pt-2 flex items-center gap-3">
              <span className="text-xs text-slate-400">Preview:</span>
              <img
                src={avatarUrl || currentUser.avatar_url}
                alt="Preview"
                className="h-10 w-10 rounded-full object-cover ring-2 ring-pink-500/50"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = currentUser.avatar_url;
                }}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-xs"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};