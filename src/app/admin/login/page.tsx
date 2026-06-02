import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

import { AdminFeedback, AdminSourceNotice } from '@/components/admin/AdminControls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAdminSession, isAdminAuthConfigured } from '@/lib/admin/auth';
import { loginAdminAction } from '@/lib/admin/actions';
import { getSearchParam, SearchParamsInput } from '@/lib/admin/query';

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsInput>;
}) {
  const session = await getAdminSession();
  if (session) redirect('/admin');

  const resolvedSearchParams = (await searchParams) || {};
  const error = getLoginErrorMessage(getSearchParam(resolvedSearchParams, 'error'));
  const returnTo = getSearchParam(resolvedSearchParams, 'returnTo') || '/admin';
  const isConfigured = isAdminAuthConfigured();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-5 rounded-lg border bg-background p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </div>
          <h1 className="text-xl font-semibold">管理后台登录</h1>
          <p className="text-sm text-muted-foreground">请输入管理员密码继续。</p>
        </div>

        {!isConfigured && (
          <AdminSourceNotice message="当前未配置 ADMIN_PASSWORD，后台登录已禁用。请在环境变量中配置管理员密码；TODO：接入真实认证/角色系统后替换此最小保护。" />
        )}
        <AdminFeedback error={error} />

        <form action={loginAdminAction} className="space-y-4">
          <input type="hidden" name="returnTo" value={returnTo} />
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">
              管理员密码
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              disabled={!isConfigured}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={!isConfigured}>
            登录
          </Button>
        </form>
      </div>
    </div>
  );
}

function getLoginErrorMessage(error: string): string {
  if (error === 'invalid') return '管理员密码不正确。';
  if (error === 'not-configured') return '未配置 ADMIN_PASSWORD，无法登录后台。';
  return '';
}
