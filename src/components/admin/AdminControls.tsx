import Link from 'next/link';
import { AlertCircle, CheckCircle2, Inbox } from 'lucide-react';

import { AdminListParams, PaginationMeta } from '@/lib/admin/query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';

export function AdminFeedback({
  notice,
  error,
}: {
  notice?: string;
  error?: string;
}) {
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>操作失败</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (notice === 'updated') {
    return (
      <Alert>
        <CheckCircle2 />
        <AlertTitle>已更新</AlertTitle>
        <AlertDescription>状态已保存，列表数据已刷新。</AlertDescription>
      </Alert>
    );
  }

  return null;
}

export function AdminSourceNotice({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <Alert>
      <AlertCircle />
      <AlertTitle>数据源提示</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function AdminEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function AdminSearchForm({
  action,
  params,
  statusOptions,
  searchPlaceholder,
}: {
  action: string;
  params: AdminListParams;
  statusOptions: string[];
  searchPlaceholder: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row">
      <Input
        name="search"
        defaultValue={params.search}
        placeholder={searchPlaceholder}
        className="md:max-w-sm"
      />
      <select
        name="status"
        defaultValue={params.status || 'all'}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:w-44"
        disabled={statusOptions.length === 0}
      >
        <option value="all">全部状态</option>
        {statusOptions.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <Button type="submit" className="md:w-auto">
        搜索
      </Button>
      {(params.search || params.status) && (
        <Button asChild type="button" variant="outline">
          <Link href={action}>重置</Link>
        </Button>
      )}
    </form>
  );
}

export function AdminPagination({
  basePath,
  params,
  pagination,
}: {
  basePath: string;
  params: AdminListParams;
  pagination: PaginationMeta;
}) {
  if (pagination.totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>
        共 {pagination.total} 条，第 {pagination.page} / {pagination.totalPages} 页
      </span>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={pageHref(basePath, params, pagination.page - 1)}
              aria-disabled={!pagination.hasPrevious}
              className={cn(!pagination.hasPrevious && 'pointer-events-none opacity-50')}
            />
          </PaginationItem>
          {visiblePages(pagination).map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                href={pageHref(basePath, params, page)}
                isActive={page === pagination.page}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              href={pageHref(basePath, params, pagination.page + 1)}
              aria-disabled={!pagination.hasNext}
              className={cn(!pagination.hasNext && 'pointer-events-none opacity-50')}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

export function StatusUpdateForm({
  id,
  currentStatus,
  statusOptions,
  returnTo,
  action,
}: {
  id: string;
  currentStatus: string;
  statusOptions: string[];
  returnTo: string;
  action: (formData: FormData) => Promise<void>;
}) {
  if (statusOptions.length === 0) {
    return <span className="text-muted-foreground">{currentStatus || '-'}</span>;
  }

  const options = statusOptions.includes(currentStatus) || !currentStatus
    ? statusOptions
    : [currentStatus, ...statusOptions];

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <select
        name="status"
        defaultValue={currentStatus || options[0]}
        className="h-8 min-w-28 rounded-md border border-input bg-background px-2 text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {options.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <Button type="submit" variant="outline" size="sm">
        保存
      </Button>
    </form>
  );
}

function pageHref(basePath: string, params: AdminListParams, page: number): string {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('status', params.status);
  if (page > 1) searchParams.set('page', String(page));

  const query = searchParams.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function visiblePages(pagination: PaginationMeta): number[] {
  const start = Math.max(1, pagination.page - 1);
  const end = Math.min(pagination.totalPages, pagination.page + 1);
  const pages: number[] = [];

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  return pages;
}
