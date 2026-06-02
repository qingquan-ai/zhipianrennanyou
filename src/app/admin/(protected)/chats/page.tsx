import Link from 'next/link';

import {
  AdminEmptyState,
  AdminPagination,
  AdminSourceNotice,
} from '@/components/admin/AdminControls';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getAdminChatCharacterName, getAdminChats } from '@/lib/admin/chats';
import {
  SearchParamsInput,
  parseAdminListParams,
  type AdminListParams,
} from '@/lib/admin/query';

export default async function AdminChatsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsInput>;
}) {
  const resolvedSearchParams = (await searchParams) || {};
  const params = parseAdminListParams(resolvedSearchParams);
  const result = await getAdminChats(params);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">聊天记录</h1>
        <p className="text-sm text-muted-foreground">
          只读查看真实 chat_sessions / chat_messages 数据，支持按 character_id 筛选和标题搜索。
        </p>
      </div>

      <AdminSourceNotice message={result.source.message} />
      <ChatSearchForm params={params} characterOptions={result.characterOptions} />

      {result.rows.length > 0 ? (
        <div className="space-y-4 rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>用户</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>标题</TableHead>
                <TableHead>消息数</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>更新时间</TableHead>
                <TableHead className="w-24">详情</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="max-w-28 truncate font-mono text-xs" title={session.id}>
                    {session.shortId}
                  </TableCell>
                  <TableCell className="max-w-44 truncate">{session.userDisplayName}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className="w-fit">
                        {session.characterName}
                      </Badge>
                      {session.characterId && session.characterName !== session.characterId && (
                        <span className="text-xs text-muted-foreground">{session.characterId}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-64 truncate">{session.title || '-'}</TableCell>
                  <TableCell>{session.messageCount}</TableCell>
                  <TableCell>{session.createdAt || '-'}</TableCell>
                  <TableCell>{session.updatedAt || '-'}</TableCell>
                  <TableCell>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/chats/${encodeURIComponent(session.id)}`}>查看</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t p-4">
            <AdminPagination basePath="/admin/chats" params={params} pagination={result.pagination} />
          </div>
        </div>
      ) : (
        <AdminEmptyState
          title="暂无聊天会话"
          description={
            result.source.ok
              ? '当前筛选条件下没有 chat_sessions 记录。'
              : '后台没有读取到 chat_sessions 数据，请检查 DATABASE_URL/POSTGRES_URL 配置。'
          }
        />
      )}
    </div>
  );
}

function ChatSearchForm({
  params,
  characterOptions,
}: {
  params: AdminListParams;
  characterOptions: string[];
}) {
  return (
    <form action="/admin/chats" className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row">
      <Input
        name="search"
        defaultValue={params.search}
        placeholder="搜索 title"
        className="md:max-w-sm"
      />
      <select
        name="status"
        defaultValue={params.status || 'all'}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:w-44"
        disabled={characterOptions.length === 0}
      >
        <option value="all">全部角色</option>
        {characterOptions.map((characterId) => (
          <option key={characterId} value={characterId}>
            {getAdminChatCharacterName(characterId)}
          </option>
        ))}
      </select>
      <Button type="submit" className="md:w-auto">
        搜索
      </Button>
      {(params.search || params.status) && (
        <Button asChild type="button" variant="outline">
          <Link href="/admin/chats">重置</Link>
        </Button>
      )}
    </form>
  );
}
