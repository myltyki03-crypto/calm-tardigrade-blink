import React, { useState } from 'react';
import { Database, Copy, Check, Terminal, ExternalLink, Wifi, WifiOff, Key, Save, Trash2, ArrowRight } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { showSuccess, showError } from '@/utils/toast';
import {
  isSupabaseConfigured,
  getActiveSupabaseConfig,
  saveCustomSupabaseConfig,
  clearCustomSupabaseConfig,
} from '@/lib/supabase';

interface SqlSchemaDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const FULL_SQL_SCHEMA = `-- ==========================================
-- PULSERAVE COMPLETE SUPABASE DATABASE SETUP (REALTIME FIX)
-- Скопируйте этот код и запустите в Supabase -> SQL Editor -> Run
-- ==========================================

drop table if exists public.direct_messages cascade;
drop table if exists public.friend_requests cascade;
drop table if exists public.room_members cascade;
drop table if exists public.chat_messages cascade;
drop table if exists public.queue_items cascade;
drop table if exists public.rooms cascade;
drop table if exists public.profiles cascade;

create table public.profiles (
  id text primary key,
  username text not null,
  avatar_url text,
  status_message text default 'Enjoying watch party 🎧',
  is_vip boolean default false,
  watch_time_minutes integer default 0,
  parties_hosted integer default 0,
  password_hash text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.rooms (
  id text primary key,
  title text not null,
  description text,
  category text default 'music',
  host_id text,
  host_name text not null,
  host_avatar text,
  is_private boolean default false,
  access_code text,
  current_media_url text default 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
  current_media_title text default 'SYNTHWAVE Radio - Chill Beats',
  current_media_thumbnail text default 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
  playback_position_seconds numeric default 0,
  is_playing boolean default true,
  member_count integer default 1,
  allow_guest_queue boolean default true,
  allow_guest_control boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.queue_items (
  id text primary key,
  room_id text references public.rooms(id) on delete cascade not null,
  title text not null,
  url text not null,
  thumbnail_url text,
  duration_seconds integer default 240,
  added_by_name text not null,
  votes integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.chat_messages (
  id text primary key,
  room_id text references public.rooms(id) on delete cascade not null,
  user_id text not null,
  user_name text not null,
  user_avatar text,
  message text not null,
  type text default 'chat',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.room_members (
  id text primary key,
  room_id text references public.rooms(id) on delete cascade not null,
  user_id text,
  user_name text not null,
  user_avatar text,
  role text default 'listener',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.friend_requests (
  id text primary key,
  sender_id text not null,
  sender_name text not null,
  sender_avatar text,
  receiver_id text not null,
  receiver_name text not null,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.direct_messages (
  id text primary key,
  sender_id text not null,
  sender_name text not null,
  sender_avatar text,
  receiver_id text not null,
  receiver_name text not null,
  receiver_avatar text,
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Выдача полных прав роли anon (так как используется кастомная авторизация без JWT)
grant all on table public.profiles to anon, authenticated, service_role;
grant all on table public.rooms to anon, authenticated, service_role;
grant all on table public.queue_items to anon, authenticated, service_role;
grant all on table public.chat_messages to anon, authenticated, service_role;
grant all on table public.room_members to anon, authenticated, service_role;
grant all on table public.friend_requests to anon, authenticated, service_role;
grant all on table public.direct_messages to anon, authenticated, service_role;

-- Отключение RLS, чтобы WAL декодер Realtime не блокировал анонимные подписки
alter table public.profiles disable row level security;
alter table public.rooms disable row level security;
alter table public.queue_items disable row level security;
alter table public.chat_messages disable row level security;
alter table public.room_members disable row level security;
alter table public.friend_requests disable row level security;
alter table public.direct_messages disable row level security;

-- Установка REPLICA IDENTITY FULL
alter table public.profiles replica identity full;
alter table public.rooms replica identity full;
alter table public.queue_items replica identity full;
alter table public.chat_messages replica identity full;
alter table public.room_members replica identity full;
alter table public.friend_requests replica identity full;
alter table public.direct_messages replica identity full;

-- Добавление всех таблиц в публикацию Supabase Realtime
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.queue_items;
alter publication supabase_realtime add table public.room_members;
alter publication supabase_realtime add table public.friend_requests;
alter publication supabase_realtime add table public.direct_messages;
`;

export const SqlSchemaDialog: React.FC<SqlSchemaDialogProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const activeConfig = getActiveSupabaseConfig();

  const [supabaseUrl, setSupabaseUrl] = useState(activeConfig.url || '');
  const [supabaseKey, setSupabaseKey] = useState(
    activeConfig.key || 'sb_publishable_2GZpwssfzVzCtIvMHeYOrA_3Q_RRJXO'
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(FULL_SQL_SCHEMA);
    setCopied(true);
    showSuccess('SQL-скрипт скопирован!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveKeys = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      showError('Укажите Project URL и API Key');
      return;
    }
    saveCustomSupabaseConfig(supabaseUrl, supabaseKey);
  };

  const handleClearKeys = () => {
    clearCustomSupabaseConfig();
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogContent className="bg-slate-900 text-slate-100 border-purple-900/60 sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Database className="h-6 w-6 text-pink-500" /> Подключение Supabase
            </span>
            <span className="text-xs px-3 py-1 rounded-full font-sans border flex items-center gap-1.5">
              {isSupabaseConfigured ? (
                <span className="text-emerald-400 bg-emerald-950/80 border-emerald-500/40 flex items-center gap-1 px-2 py-0.5 rounded-full">
                  <Wifi className="h-3 w-3 animate-pulse" /> Подключено
                </span>
              ) : (
                <span className="text-amber-400 bg-amber-950/80 border-amber-500/40 flex items-center gap-1 px-2 py-0.5 rounded-full font-bold">
                  <WifiOff className="h-3 w-3" /> Не подключено
                </span>
              )}
            </span>
          </DialogTitle>
          <DialogDescription className="text-slate-300 text-xs mt-1">
            Введите адрес и ключ вашего проекта из панели Supabase ниже.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSaveKeys} className="bg-gradient-to-b from-purple-950/80 to-slate-950 p-4 rounded-2xl border-2 border-pink-500/50 space-y-3 shadow-xl">
          <div className="font-bold text-sm text-pink-400 flex items-center gap-2">
            <Key className="h-4 w-4 text-cyan-400" /> 1. Введите ключи проекта Supabase:
          </div>

          <div className="space-y-2.5">
            <div>
              <Label className="text-xs font-semibold text-slate-200">
                1) Supabase Project URL <span className="text-pink-400">*</span>
              </Label>
              <Input
                placeholder="https://xxxx.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                className="bg-slate-900 border-purple-800 text-xs h-9 text-cyan-300 mt-1 placeholder:text-slate-600 focus:border-pink-500 font-mono"
                required
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Взять из Supabase: Project Settings &rarr; API &rarr; Project URL</p>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-200">
                2) Supabase Anon Public Key <span className="text-pink-400">*</span>
              </Label>
              <Input
                placeholder="sb_publishable_... или eyJhbG..."
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                className="bg-slate-900 border-purple-800 text-xs h-9 text-cyan-300 mt-1 placeholder:text-slate-600 focus:border-pink-500 font-mono"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              type="submit"
              size="sm"
              className="bg-gradient-to-r from-purple-600 via-pink-600 to-pink-500 hover:opacity-90 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-lg shadow-pink-500/30 gap-1.5"
            >
              <Save className="h-4 w-4" /> Сохранить и подключить <ArrowRight className="h-3.5 w-3.5" />
            </Button>

            {localStorage.getItem('custom_supabase_url') && (
              <Button
                type="button"
                onClick={handleClearKeys}
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300 text-xs h-8 gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" /> Очистить
              </Button>
            )}
          </div>
        </form>

        <div className="bg-slate-950 p-3.5 rounded-xl border border-purple-900/60 space-y-2 text-xs mt-2">
          <div className="font-bold text-slate-200 flex items-center gap-1.5">
            <Terminal className="h-4 w-4 text-purple-400" /> 2. Запустите этот SQL в Supabase (SQL Editor):
          </div>
          <ol className="list-decimal list-inside text-slate-300 space-y-1 text-[11px] leading-relaxed">
            <li>Зайдите в ваш проект на <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline inline-flex items-center gap-0.5 font-semibold">supabase.com <ExternalLink className="h-2.5 w-2.5" /></a></li>
            <li>Перейдите в <strong className="text-purple-300">SQL Editor</strong> &rarr; <strong className="text-purple-300">New Query</strong></li>
            <li>Вставьте скопированный скрипт ниже и нажмите <strong className="text-emerald-400 font-bold">Run</strong></li>
          </ol>
        </div>

        <div className="relative mt-1">
          <Button
            onClick={handleCopy}
            size="sm"
            className="absolute top-3 right-3 bg-pink-600 hover:bg-pink-500 text-white text-xs z-10 font-bold shadow-lg shadow-pink-600/30"
          >
            {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
            {copied ? 'Скопировано!' : 'Скопировать SQL'}
          </Button>

          <ScrollArea className="h-44 w-full rounded-xl border border-purple-950 bg-slate-950 p-4 font-mono text-xs text-cyan-300 leading-relaxed">
            <pre>{FULL_SQL_SCHEMA}</pre>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};