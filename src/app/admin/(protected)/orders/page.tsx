import Link from 'next/link';

import {
  AdminEmptyState,
  AdminFeedback,
  AdminPagination,
  AdminSearchForm,
  AdminSourceNotice,
  StatusUpdateForm,
} from '@/components/admin/AdminControls';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { updateOrderStatusAction } from '@/lib/admin/actions';
import { getAdminOrders } from '@/lib/admin/data';
import {
  AdminListParams,
  SearchParamsInput,
  getSearchParam,
  parseAdminListParams,
} from '@/lib/admin/query';

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsInput>;
}) {
  const resolvedSearchParams = (await searchParams) || {};
  const params = parseAdminListParams(resolvedSearchParams);
  const result = await getAdminOrders(params);
  const returnTo = buildListPath('/admin/orders', params);
  const hasAmount = Boolean(result.source.mapping?.amount);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">订单管理</h1>
        <p className="text-sm text-muted-foreground">
          查看订单列表，搜索订单号或关联用户，并编辑订单状态。
        </p>
      </div>

      <AdminFeedback
        notice={getSearchParam(resolvedSearchParams, 'notice')}
        error={getSearchParam(resolvedSearchParams, 'error')}
      />
      <AdminSourceNotice message={result.source.message} />

      <AdminSearchForm
        action="/admin/orders"
        params={params}
        statusOptions={result.statusOptions}
        searchPlaceholder="搜索订单号、用户姓名或邮箱"
      />

      {result.rows.length > 0 ? (
        <div className="space-y-4 rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>订单</TableHead>
                <TableHead>用户</TableHead>
                {hasAmount && <TableHead>金额</TableHead>}
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="w-44">编辑状态</TableHead>
                <TableHead className="w-24">详情</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="font-medium">{order.orderNo || order.id}</div>
                    <div className="max-w-48 truncate font-mono text-xs text-muted-foreground">
                      {order.id}
                    </div>
                  </TableCell>
                  <TableCell>
                    {order.user ? (
                      <div>
                        <div>{order.user.name || order.user.id}</div>
                        <div className="text-xs text-muted-foreground">{order.user.email || '-'}</div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  {hasAmount && <TableCell>{order.amount || '-'}</TableCell>}
                  <TableCell>
                    <Badge variant="outline">{order.status || '-'}</Badge>
                  </TableCell>
                  <TableCell>{order.createdAt || '-'}</TableCell>
                  <TableCell>
                    <StatusUpdateForm
                      id={order.id}
                      currentStatus={order.status}
                      statusOptions={result.statusOptions}
                      returnTo={returnTo}
                      action={updateOrderStatusAction}
                    />
                  </TableCell>
                  <TableCell>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/orders/${encodeURIComponent(order.id)}`}>查看</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t p-4">
            <AdminPagination basePath="/admin/orders" params={params} pagination={result.pagination} />
          </div>
        </div>
      ) : (
        <AdminEmptyState
          title="暂无订单"
          description={
            result.source.ok
              ? '当前筛选条件下没有订单记录。'
              : '后台没有读取到可用订单数据。请检查数据源配置和订单表字段。'
          }
        />
      )}
    </div>
  );
}

function buildListPath(basePath: string, params: AdminListParams): string {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('status', params.status);
  if (params.page > 1) searchParams.set('page', String(params.page));

  const query = searchParams.toString();
  return query ? `${basePath}?${query}` : basePath;
}
