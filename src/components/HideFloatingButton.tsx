"use client";

import { useEffect } from "react";

export default function HideFloatingButton() {
  useEffect(() => {
    // 隐藏Coze平台悬浮按钮
    const hideFloatingButtons = () => {
      // 查找所有可能的悬浮按钮
      const selectors = [
        '[class*="coze"]',
        '[class*="floating"]',
        '[class*="fab"]',
        '[class*="toolbar"]',
        '[id*="coze"]',
        '[data-testid*="coze"]',
      ];

      selectors.forEach((selector) => {
        try {
          document.querySelectorAll(selector).forEach((el) => {
            const text = el.textContent || "";
            const style = window.getComputedStyle(el);
            
            // 如果是固定定位在右下角区域，隐藏它
            if (
              style.position === "fixed" ||
              style.position === "absolute"
            ) {
              const rect = el.getBoundingClientRect();
              // 右下角区域（屏幕右侧和下方）
              if (rect.right > window.innerWidth * 0.7 && rect.bottom > window.innerHeight * 0.7) {
                (el as HTMLElement).style.display = "none";
                (el as HTMLElement).style.visibility = "hidden";
              }
            }

            // 如果包含"扣子"或"coze"文字，隐藏它
            if (
              text.includes("扣子") ||
              text.includes("编程") ||
              el.getAttribute("aria-label")?.includes("扣子")
            ) {
              (el as HTMLElement).style.display = "none";
              (el as HTMLElement).style.visibility = "hidden";
            }
          });
        } catch (e) {
          // 忽略选择器错误
        }
      });
    };

    // 立即执行
    hideFloatingButtons();

    // 监听 DOM 变化，持续隐藏新出现的按钮
    const observer = new MutationObserver(hideFloatingButtons);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
}
