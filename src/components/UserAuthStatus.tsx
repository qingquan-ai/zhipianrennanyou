'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  getUserAuthDisplayName,
  type UserAuthStatusUser,
} from '@/lib/user-auth-status';
import {
  clearChatLocalStorageForLogout,
  syncChatLocalStorageForUser,
} from '@/lib/chat/localStorage';

type SessionResponse = {
  user: (UserAuthStatusUser & {
    id: string;
    status: string;
  }) | null;
};

export default function UserAuthStatus() {
  const router = useRouter();
  const [user, setUser] = useState<SessionResponse['user']>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const response = await fetch('/api/user/session', { cache: 'no-store' });
        if (!response.ok) throw new Error('Session API error');

        const data = (await response.json()) as SessionResponse;
        if (isMounted) {
          if (data.user && typeof window !== 'undefined') {
            syncChatLocalStorageForUser(data.user.id, window.localStorage);
          }
          setUser(data.user);
        }
      } catch {
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    setError('');
    setIsLoggingOut(true);

    try {
      const response = await fetch('/api/user/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Logout API error');

      clearChatLocalStorageForLogout(window.localStorage);
      setUser(null);
      router.refresh();
    } catch {
      setError('退出失败，请稍后重试');
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isLoading) {
    return <div className="text-xs text-gray-400">加载中</div>;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Link className="text-gray-600 hover:text-pink-600" href="/login">
          登录
        </Link>
        <span className="text-gray-300">/</span>
        <Link className="text-pink-600 hover:text-pink-700" href="/register">
          注册
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="max-w-[160px] truncate text-gray-600">
        {getUserAuthDisplayName(user)}
      </span>
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 transition-colors hover:border-pink-200 hover:text-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoggingOut ? '退出中' : '退出'}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
