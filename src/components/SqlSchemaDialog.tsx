import React from 'react';
import { Database, Copy, Check, Terminal, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { showSuccess } from '@/utils/toast';

interface SqlSchemaDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const FULL_SQL_SCHEMA = `-- ==========================================
-- PULSERAVE COMPLETE SUPABASE DATABASE SETUP (V2 FIXED)
-- Скопируйте этот код и запустите в Supabase -> SQL Editor -> Run
-- ==========================================

-- Удаление старых таблиц при пересоздании (если были созданы ранее)
drop table if exists public.room_members cascade;
drop table if exists public.chat_messages cascade;
drop table if exists public.queue_items cascade;
drop table if exists public.rooms cascade;
drop table if exists public.profiles cascade;

-- 1. Таблица профилей пользователей
create table public.profiles (
  id text primary key,
  username text not null,
  avatar_url text,
  status_message text default 'Enjoying watch party 🎧',
  is_vip boolean default false,
  watch_time_minutes integer default 0,
  parties_hosted integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Таблица комнат (Watch Party Rooms)
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

-- 3. Очередь треков/видео (Queue Items)
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

-- 4. Чат комнаты (Chat Messages)
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

-- 5. Участники комнаты (Room Members)
create table public.room_members (
  id text primary key,
  room_id text references public.rooms(id) on delete cascade not null,
  user_id text,
  user_name text not null,
  user_avatar text,
  role text default 'listener',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Публичный доступ к операциям (Row Level Security)
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.queue_items enable row level security;
alter table public.chat_messages enable row level security;
alter table public.room_members enable row level security;

create policy "Public Profiles Policy" on public.profiles for all using (true) with check (true);
create policy "Public Rooms Policy" on public.rooms for all using (true) with check (true);
create policy "Public Queue Policy" on public.queue_items for all using (true) with check (true);
create policy "Public Chat Policy" on public.chat_messages for all using (true) with check (true);
create policy "Public Members Policy" on public.room_members for all using (true) with check (true);

-- 7. Подключение таблиц к Realtime публикации
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.queue_items;
alter publication supabase_realtime add table public.room_members;
`;

export const SqlSchemaDialog: React.FC<SqlSchemaDialogProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(FULL_SQL_SCHEMA);
    setCopied(true);
    showSuccess('SQL-скрипт скопирован!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 text-slate-100 border-purple-900/60 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 flex items-center gap-2">
            <Database className="h-5 w-5 text-cyan-400" /> Настройка базы данных Supabase
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Запустите этот обновленный SQL-скрипт в вашей базе данных Supabase, чтобы включить мгновенную синхронизацию между всеми компьютерами и телефонами.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-slate-950 p-3 rounded-xl border border-purple-950/80 space-y-2 text-xs">
          <div className="font-semibold text-pink-400 flex items-center gap-1.5">
            <Terminal className="h-4 w-4" /> Как обновить базу в 3 клика:
          </div>
          <ol className="list-decimal list-inside text-slate-300 space-y-1 text-[11px] leading-relaxed">
            <li>Перейдите в <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline inline-flex items-center gap-0.5">supabase.com <ExternalLink className="h-2.5 w-2.5" /></a> в ваш проект</li>
            <li>Откройте <strong className="text-purple-300">SQL Editor</strong> &rarr; <strong className="text-purple-300">New Query</strong></li>
            <li>Вставьте этот SQL-код и нажмите <strong className="text-emerald-400">Run</strong></li>
          </ol>
        </div>

        <div className="relative mt-2">
          <Button
            onClick={handleCopy}
            size="sm"
            className="absolute top-3 right-3 bg-pink-600 hover:bg-pink-500 text-white text-xs z-10 font-bold shadow-lg shadow-pink-600/30"
          >
            {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
            {copied ? 'Скопировано!' : 'Скопировать обновленный SQL'}
          </Button>

          <ScrollArea className="h-72 w-full rounded-xl border border-purple-950 bg-slate-950 p-4 font-mono text-xs text-cyan-300 leading-relaxed">
            <pre>{FULL_SQL_SCHEMA}</pre>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};