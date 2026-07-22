import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Radio, Edit3, User, Upload, RefreshCw, MessageSquare, Image, LogOut, Trash2 } from 'lucide-react';
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
import { showSuccess, showError } from '@/utils/toast';

const getDefaultAvatar = (seed: string) => {
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed || 'raver')}`;
};

export const ProfilePage = () => {
  const navigate = useNavigate();
  const { currentUser, updateUserProfile, logoutUser, clearAllAccountsAndData } = useRooms();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [username, setUsername] = useState(currentUser.username);
  const [statusMessage, setStatusMessage] = useState(currentUser.status_message || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar_url || getDefaultAvatar(currentUser.username));

  const handleOpenEdit = () => {
    setUsername(currentUser.username);
    setStatusMessage(currentUser.status_message || '');
    setAvatarUrl(currentUser.avatar_url || getDefaultAvatar(currentUser.username));
    setIsEditModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showError('Размер файла не должен превышать 5МБ');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
        showSuccess('Фото профиля выбрано!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetToDefaultAvatar = () => {
    const defaultImg = getDefaultAvatar(username || 'raver');
    setAvatarUrl(defaultImg);
    showSuccess('Установлена аватарка по умолчанию');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    const finalAvatar = avatarUrl.trim() || getDefaultAvatar(username);

    const success = await updateUserProfile({
      username: username.trim(),
      status_message: statusMessage.trim(),
      avatar_url: finalAvatar,
    });

    if (success) {
      showSuccess('Профиль успешно обновлен!');
      setIsEditModalOpen(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

  const handleResetAllAccounts = async () => {
    if (window.confirm('Вы точно хотите удалить все зарегистрированные аккаунты?')) {
      await clearAllAccountsAndData();
      navigate('/');
    }
  };

  const displayAvatar = currentUser.avatar_url || getDefaultAvatar(currentUser.username);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col items-center">
      <div className="w-full max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Главная
          </Button>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleResetAllAccounts}
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300 hover:bg-red-950/40 text-xs gap-1.5 rounded-xl"
              title="Удалить все созданные аккаунты"
            >
              <Trash2 className="h-4 w-4" /> Очистить все аккаунты
            </Button>

            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-slate-200 text-xs gap-1.5 rounded-xl"
            >
              <LogOut className="h-4 w-4" /> Выйти
            </Button>
          </div>
        </div>

        <div className="p-6 rounded-3xl border border-purple-900/50 bg-slate-900/90 text-center relative overflow-hidden shadow-2xl">
          {/* Редактировать */}
          <Button
            onClick={handleOpenEdit}
            size="sm"
            variant="outline"
            className="absolute top-4 right-4 border-purple-800 text-purple-300 hover:bg-purple-950 hover:text-white text-xs gap-1.5 rounded-xl"
          >
            <Edit3 className="h-3.5 w-3.5" /> Изменить
          </Button>

          <div className="relative mx-auto h-24 w-24 rounded-full ring-4 ring-pink-500/50 overflow-hidden mb-4 mt-2 shadow-lg bg-slate-950">
            <img
              src={displayAvatar}
              alt={currentUser.username}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = getDefaultAvatar(currentUser.username);
              }}
            />
          </div>

          <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            {currentUser.username}
            <Badge className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[10px]">
              ВЕДУЩИЙ
            </Badge>
          </h2>

          <p className="text-xs text-purple-300 mt-1 max-w-xs mx-auto">
            {currentUser.status_message || 'Статус не установлен'}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-purple-950 pt-4">
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-purple-900/30">
              <Clock className="h-5 w-5 text-cyan-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-slate-100">{currentUser.watch_time_minutes || 0} мин</div>
              <div className="text-[10px] text-slate-400">Время просмотра</div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/60 border border-purple-900/30">
              <Radio className="h-5 w-5 text-pink-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-slate-100">{currentUser.parties_hosted || 0}</div>
              <div className="text-[10px] text-slate-400">Создано эфиров</div>
            </div>
          </div>
        </div>
      </div>

      {/* Модалка редактирования */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-slate-900 text-slate-100 border-purple-900/60 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              Редактирование профиля
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Загрузите фото с компьютера или используйте стандартный аватар.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-pink-400" /> Имя пользователя
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Введите имя..."
                className="bg-slate-950 border-purple-950 focus:border-pink-500 text-slate-100 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-cyan-400" /> Статус
              </Label>
              <Input
                id="status"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                placeholder="Например: Слушаю музыку 🎧"
                className="bg-slate-950 border-purple-950 focus:border-pink-500 text-slate-100 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Image className="h-3.5 w-3.5 text-purple-400" /> Фото профиля
              </Label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-full overflow-hidden ring-2 ring-pink-500/50 bg-slate-950 shrink-0">
                  <img
                    src={avatarUrl || getDefaultAvatar(username)}
                    alt="Превью"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getDefaultAvatar(username);
                    }}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    size="sm"
                    className="bg-purple-800 hover:bg-purple-700 text-white text-xs gap-1.5 rounded-xl h-8"
                  >
                    <Upload className="h-3.5 w-3.5" /> Загрузить файл
                  </Button>

                  <Button
                    type="button"
                    onClick={handleResetToDefaultAvatar}
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-white text-[11px] h-6 p-0 gap-1 justify-start"
                  >
                    <RefreshCw className="h-3 w-3" /> Сбросить аватарку
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 to-pink-500 text-white font-semibold text-xs"
              >
                Сохранить
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};