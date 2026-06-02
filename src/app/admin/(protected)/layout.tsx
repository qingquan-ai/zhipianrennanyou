import { ShieldCheck } from 'lucide-react';

import { AdminNav } from '@/components/admin/AdminNav';
import { Button } from '@/components/ui/button';
import { logoutAdminAction } from '@/lib/admin/actions';
import { requireAdmin } from '@/lib/admin/auth';

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-background px-4 py-5 md:block">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">纸片人男友</p>
            <p className="text-xs text-muted-foreground">管理后台</p>
          </div>
        </div>
        <AdminNav />
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
          <div className="flex h-14 items-center justify-between gap-4 px-4 md:px-6">
            <div className="min-w-0">
              <p className="text-sm font-medium md:hidden">管理后台</p>
              <p className="hidden text-sm text-muted-foreground md:block">
                管理用户、订单与运营概览
              </p>
            </div>
            <form action={logoutAdminAction}>
              <Button type="submit" variant="outline" size="sm">
                退出登录
              </Button>
            </form>
          </div>
          <div className="border-t px-4 py-2 md:hidden">
            <AdminNav />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
