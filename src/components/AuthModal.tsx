import React, { useState } from 'react';
import { User, Lock, LogIn, UserPlus, Sparkles, ShieldCheck, Loader2, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRooms } from '@/context/RoomContext';
import { showSuccess, showError } from '@/utils/toast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { registerUser, loginUser, clearAllAccountsAndData } = useRooms();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('register');
  const [isLoading, setIsLoading] = useState(false);

  // Форма входа
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Форма регистрации
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) {
      showError('Заполните все поля');
      return;
    }

    setIsLoading(true);
    try {
      const success = await loginUser(loginUsername.trim(), loginPassword.trim());
      if (success) {
        setLoginUsername('');
        setLoginPassword('');
        onClose();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regPassword.trim()) {
      showError('Заполните логин и пароль');
      return;
    }

    if (regPassword.length < 4) {
      showError('Пароль должен быть не менее 4 символов');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      showError('Пароли не совпадают');
      return;
    }

    setIsLoading(true);
    try {
      const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(regUsername.trim())}`;
      const success = await registerUser(regUsername.trim(), regPassword.trim(), defaultAvatar);

      if (success) {
        setRegUsername('');
        setRegPassword('');
        setRegConfirmPassword('');
        onClose();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetAll = async () => {
    if (window.confirm('Вы уверены, что хотите удалить все зарегистрированные аккаунты и сообщения?')) {
      await clearAllAccountsAndData();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-900 text-slate-100 border-purple-900/60 sm:max-w-md p-6">
        <DialogHeader className="text-center">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 p-0.5 mx-auto mb-2 shadow-lg shadow-pink-500/30">
            <div className="h-full w-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-pink-400" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-300">
            PULSERAVE Аккаунт
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs mt-1">
            Зарегистрируйтесь, чтобы создавать комнаты, писать в чате и синхронизировать просмотр.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="mt-2">
          <TabsList className="grid grid-cols-2 bg-slate-950 border border-purple-900/40 p-1 rounded-xl">
            <TabsTrigger
              value="register"
              className="text-xs font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white rounded-lg"
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Регистрация
            </TabsTrigger>
            <TabsTrigger
              value="login"
              className="text-xs font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white rounded-lg"
            >
              <LogIn className="h-3.5 w-3.5 mr-1.5" /> Вход
            </TabsTrigger>
          </TabsList>

          {/* Форма регистрации */}
          <TabsContent value="register" className="space-y-3 pt-3">
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="regUser" className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-pink-400" /> Логин
                </Label>
                <Input
                  id="regUser"
                  placeholder="Придумайте логин..."
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="bg-slate-950 border-purple-900/60 focus:border-pink-500 text-xs text-slate-100"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="regPass" className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5 text-purple-400" /> Пароль
                </Label>
                <Input
                  id="regPass"
                  type="password"
                  placeholder="Придумайте пароль..."
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="bg-slate-950 border-purple-900/60 focus:border-pink-500 text-xs text-slate-100"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="regConfirm" className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" /> Повторите пароль
                </Label>
                <Input
                  id="regConfirm"
                  type="password"
                  placeholder="Повторите пароль..."
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  className="bg-slate-950 border-purple-900/60 focus:border-pink-500 text-xs text-slate-100"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-pink-500 hover:opacity-90 text-white font-bold text-xs h-9 rounded-xl shadow-lg shadow-pink-500/20 mt-2 gap-1.5"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Зарегистрироваться'}
              </Button>
            </form>
          </TabsContent>

          {/* Форма входа */}
          <TabsContent value="login" className="space-y-3 pt-3">
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="loginUser" className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-pink-400" /> Ваш логин
                </Label>
                <Input
                  id="loginUser"
                  placeholder="Введите логин..."
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="bg-slate-950 border-purple-900/60 focus:border-pink-500 text-xs text-slate-100"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="loginPass" className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5 text-purple-400" /> Ваш пароль
                </Label>
                <Input
                  id="loginPass"
                  type="password"
                  placeholder="Введите пароль..."
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="bg-slate-950 border-purple-900/60 focus:border-pink-500 text-xs text-slate-100"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-pink-500 hover:opacity-90 text-white font-bold text-xs h-9 rounded-xl shadow-lg shadow-pink-500/20 mt-2 gap-1.5"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Войти в аккаунт'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="mt-4 pt-3 border-t border-purple-900/40 text-center">
          <Button
            type="button"
            onClick={handleResetAll}
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300 hover:bg-red-950/40 text-[11px] h-7 gap-1"
          >
            <Trash2 className="h-3.5 w-3.5" /> Удалить все аккаунты и сбросить данные
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};