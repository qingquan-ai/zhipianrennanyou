import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AdminEmptyState } from '@/components/admin/AdminControls';
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
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getAdminChatDetail } from '@/lib/admin/chats';

export default async function AdminChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getAdminChatDetail(decodeURIComponent(id));
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">聊天详情</h1>
          <p className="font-mono text-sm text-muted-foreground">{detail.session.id}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/chats">返回聊天记录</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>会话信息</CardTitle>
          <CardDescription>读取 chat_sessions 真实字段，只读展示。</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 md:grid-cols-3">
            <InfoItem label="用户" value={detail.session.userDisplayName} />
            <InfoItem label="角色" value={detail.session.characterName} />
            <InfoItem label="标题" value={detail.session.title || '-'} />
            <InfoItem label="消息数" value={String(detail.session.messageCount)} />
            <InfoItem label="创建时间" value={detail.session.createdAt || '-'} />
            <InfoItem label="character_id" value={detail.session.characterId || '-'} />
          </dl>
        </CardContent>
      </Card>

      {detail.messages.length > 0 ? (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>role</TableHead>
                <TableHead>content</TableHead>
                <TableHead>image_url</TableHead>
                <TableHead>audio_url</TableHead>
                <TableHead>created_at</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.messages.map((message, index) => (
                <TableRow key={`${message.createdAt}-${index}`}>
                  <TableCell>
                    <Badge variant="outline">{message.role}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xl whitespace-pre-wrap break-words">
                    {message.content || '-'}
                  </TableCell>
                  <TableCell className="max-w-56 break-words text-xs">
                    {message.imageUrl || '-'}
                  </TableCell>
                  <TableCell className="max-w-56 break-words text-xs">
                    {message.audioUrl || '-'}
                  </TableCell>
                  <TableCell>{message.createdAt || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <AdminEmptyState
          title="暂无消息"
          description="该会话下没有 chat_messages 记录。"
        />
      )}
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
