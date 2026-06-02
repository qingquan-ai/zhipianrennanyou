import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  AdminFeedback,
  StatusUpdateForm,
} from '@/components/admin/AdminControls';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table';
import { updateOrderStatusAction } from '@/lib/admin/actions';
import { getAdminOrderDetail } from '@/lib/admin/data';
import { SearchParamsInput, getSearchParam } from '@/lib/admin/query';

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<SearchParamsInput>;
}) {
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) || {};
  const order = await getAdminOrderDetail(decodeURIComponent(id));
  if (!order) notFound();

  const returnTo = `/admin/orders/${encodeURIComponent(order.id)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">订单详情</h1>
          <p className="text-sm text-muted-foreground">{order.orderNo || order.id}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/orders">返回订单列表</Link>
        </Button>
      </div>

      <AdminFeedback
        notice={getSearchParam(resolvedSearchParams, 'notice')}
        error={getSearchParam(resolvedSearchParams, 'error')}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
            <CardDescription>基于订单表真实字段映射展示。</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 md:grid-cols-2">
              <InfoItem label="订单 ID" value={order.id} />
              <InfoItem label="订单号" value={order.orderNo || order.id} />
              <InfoItem label="创建时间" value={order.createdAt || '-'} />
              <div className="space-y-1">
                <dt className="text-sm text-muted-foreground">状态</dt>
                <dd>
                  <Badge variant="outline">{order.status || '-'}</Badge>
                </dd>
              </div>
              {order.amount && <InfoItem label="金额" value={order.amount} />}
              {order.remark && <InfoItem label="备注" value={order.remark} />}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>关联用户</CardTitle>
            <CardDescription>按订单用户关联字段读取。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.user ? (
              <dl className="space-y-3">
                <InfoItem label="用户 ID" value={order.user.id} />
                <InfoItem label="姓名" value={order.user.name || '-'} />
                <InfoItem label="邮箱" value={order.user.email || '-'} />
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">没有可识别的关联用户。</p>
            )}
            <div className="border-t pt-4">
              <p className="mb-2 text-sm font-medium">编辑订单状态</p>
              <StatusUpdateForm
                id={order.id}
                currentStatus={order.status}
                statusOptions={order.statusOptions}
                returnTo={returnTo}
                action={updateOrderStatusAction}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>原始字段</CardTitle>
          <CardDescription>仅展示订单表返回的真实字段，不新增业务字段。</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              {order.rawFields.map((field) => (
                <TableRow key={field.name}>
                  <TableCell className="w-56 font-mono text-xs text-muted-foreground">
                    {field.name}
                  </TableCell>
                  <TableCell className="whitespace-normal break-words">{field.value || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm font-medium">{value}</dd>
    </div>
  );
}
