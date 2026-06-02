import {
  AdminEmptyState,
  AdminFeedback,
  AdminPagination,
  AdminSearchForm,
  AdminSourceNotice,
  StatusUpdateForm,
} from '@/components/admin/AdminControls';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { updateUserStatusAction } from '@/lib/admin/actions';
import {
  AdminListParams,
  SearchParamsInput,
  getSearchParam,
  parseAdminListParams,
} from '@/lib/admin/query';
import { getAdminUsers } from '@/lib/admin/users';

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsInput>;
}) {
  const resolvedSearchParams = (await searchParams) || {};
  const params = parseAdminListParams(resolvedSearchParams);
  const result = await getAdminUsers(params);
  const returnTo = buildListPath('/admin/users', params);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">用户管理</h1>
        <p className="text-sm text-muted-foreground">
          读取真实 users 表，支持按 email / nickname 搜索、状态筛选和状态编辑。
        </p>
      </div>

      <AdminFeedback
        notice={getSearchParam(resolvedSearchParams, 'notice')}
        error={getSearchParam(resolvedSearchParams, 'error')}
      />
      <AdminSourceNotice message={result.source.message} />

      <AdminSearchForm
        action="/admin/users"
        params={params}
        statusOptions={result.statusOptions}
        searchPlaceholder="搜索 email 或 nickname"
      />

      {result.rows.length > 0 ? (
        <div className="space-y-4 rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Nickname</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="w-44">编辑状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="max-w-48 truncate font-mono text-xs">{user.id}</TableCell>
                  <TableCell>{user.email || '-'}</TableCell>
                  <TableCell>{user.nickname || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.status || '-'}</Badge>
                  </TableCell>
                  <TableCell>{user.createdAt || '-'}</TableCell>
                  <TableCell>
                    <StatusUpdateForm
                      id={user.id}
                      currentStatus={user.status}
                      statusOptions={result.statusOptions}
                      returnTo={returnTo}
                      action={updateUserStatusAction}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t p-4">
            <AdminPagination basePath="/admin/users" params={params} pagination={result.pagination} />
          </div>
        </div>
      ) : (
        <AdminEmptyState
          title="暂无用户"
          description={
            result.source.ok
              ? '当前筛选条件下没有 users 记录。'
              : '后台没有读取到 users 表数据，请检查 DATABASE_URL/POSTGRES_URL 配置。'
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
