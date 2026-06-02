import { AdminEmptyState, AdminSourceNotice } from '@/components/admin/AdminControls';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getAdminDashboard } from '@/lib/admin/dashboard';

export default async function AdminDashboardPage() {
  const dashboard = await getAdminDashboard();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">概览</h1>
        <p className="text-sm text-muted-foreground">运营关键数据总览。</p>
      </div>

      {dashboard.sourceMessages.map((message) => (
        <AdminSourceNotice key={message} message={message} />
      ))}

      {dashboard.metrics.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dashboard.metrics.map((metric) => (
            <Card key={metric.label}>
              <CardHeader className="pb-2">
                <CardDescription>{metric.label}</CardDescription>
                <CardTitle className="text-2xl">{metric.value}</CardTitle>
              </CardHeader>
              {metric.description && (
                <CardContent>
                  <p className="text-xs text-muted-foreground">{metric.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <AdminEmptyState
          title="暂无可展示指标"
          description="配置 DATABASE_URL/POSTGRES_URL 并同步 users、chat_sessions、chat_messages 后，这里会展示真实运营数据。"
        />
      )}
    </div>
  );
}
