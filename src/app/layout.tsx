import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import HideFloatingButton from '@/components/HideFloatingButton';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '纸片人男友',
    template: '%s | 纸片人男友',
  },
  description:
    '选择一个专属男友，开启你的甜蜜陪伴。这里有成熟总裁、温柔学长、理性律师、阳光弟弟，总有一位是你的菜。',
  keywords: [
    '纸片人男友',
    '虚拟男友',
    '乙女',
    '聊天陪伴',
    'AI男友',
    '甜蜜恋爱',
  ],
  authors: [{ name: '纸片人男友' }],
  generator: '纸片人男友',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <Inspector />
        <HideFloatingButton />
        {children}
      </body>
    </html>
  );
}
