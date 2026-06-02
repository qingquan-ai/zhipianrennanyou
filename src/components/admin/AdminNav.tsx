'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquareText, ReceiptText, Users } from 'lucide-react';

import { cn } from '@/lib/utils';

const navItems = [
  {
    href: '/admin',
    label: '概览',
    icon: LayoutDashboard,
  },
  {
    href: '/admin/users',
    label: '用户管理',
    icon: Users,
  },
  {
    href: '/admin/chats',
    label: '聊天记录',
    icon: MessageSquareText,
  },
  {
    href: '/admin/orders',
    label: '订单管理',
    icon: ReceiptText,
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
              isActive && 'bg-accent text-foreground',
            )}
          >
            <Icon className="size-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
