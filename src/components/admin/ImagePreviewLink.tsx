'use client';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function ImagePreviewLink({ imageUrl }: { imageUrl: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="text-blue-600 hover:underline">
          查看图片
        </button>
      </DialogTrigger>
      <DialogContent
        className="w-auto border-none bg-transparent p-0 shadow-none sm:max-w-[90vw]"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">图片预览</DialogTitle>
        <div className="relative">
          <DialogClose className="absolute right-2 top-2 z-10 rounded-md bg-black/60 px-3 py-1 text-sm text-white hover:bg-black/80">
            关闭
          </DialogClose>
          <img
            src={imageUrl}
            alt="聊天图片预览"
            className="max-h-[80vh] max-w-[80vw] rounded-lg object-contain shadow-xl"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
