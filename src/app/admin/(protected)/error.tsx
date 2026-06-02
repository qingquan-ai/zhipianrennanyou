'use client';

import { AlertCircle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>后台页面加载失败</AlertTitle>
        <AlertDescription>{error.message || '请稍后重试。'}</AlertDescription>
      </Alert>
      <Button type="button" onClick={reset} variant="outline">
        重新加载
      </Button>
    </div>
  );
}
