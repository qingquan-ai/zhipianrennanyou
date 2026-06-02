import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loginUserAction } from '@/lib/user-actions';
import { getCurrentUser } from '@/lib/user-auth';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const currentUser = await getCurrentUser();
  if (currentUser) redirect('/');

  const resolvedSearchParams = (await searchParams) || {};
  const error = getLoginError(getSearchParam(resolvedSearchParams, 'error'));

  return (
    <main className="flex min-h-screen items-center justify-center bg-pink-50 px-4">
      <div className="w-full max-w-sm space-y-5 rounded-lg border bg-white p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-xl font-semibold text-gray-900">登录</h1>
          <p className="text-sm text-gray-500">登录后聊天会话会绑定到你的账号。</p>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form action={loginUserAction} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="email">
              邮箱
            </label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="password">
              密码
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" className="w-full">
            登录
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500">
          还没有账号？{' '}
          <Link href="/register" className="font-medium text-pink-600 hover:underline">
            去注册
          </Link>
        </p>
      </div>
    </main>
  );
}

function getSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

function getLoginError(error: string): string {
  if (error === 'invalid') return '邮箱或密码不正确。';
  return '';
}
