import { useEffect, useRef, useState } from 'react';

/**
 * Windowed rendering for a long list of fixed-height rows. Only the rows
 * currently scrolled into view (plus a small overscan buffer) are mounted,
 * so a queue of thousands of files stays smooth instead of dumping every
 * row into the DOM at once.
 *
 * Usage: give the scroll container a ref from this hook, size an inner
 * spacer to `totalHeight`, and position only `items.slice(startIndex, endIndex)`
 * absolutely at `index * rowHeight`.
 */
export function useVirtualList({ itemCount, rowHeight, overscan = 8 }) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    setViewportHeight(el.clientHeight);

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrollTop(el.scrollTop);
        ticking = false;
      });
    };

    el.addEventListener('scroll', onScroll, { passive: true });

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportHeight(entry.contentRect.height);
      }
    });
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener('scroll', onScroll);
      resizeObserver.disconnect();
    };
  }, []);

  const totalHeight = itemCount * rowHeight;
  const rawStart = Math.floor(scrollTop / rowHeight) - overscan;
  const startIndex = Math.max(0, rawStart);
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
  const endIndex = Math.min(itemCount, startIndex + visibleCount);

  return { containerRef, startIndex, endIndex, totalHeight, offsetY: startIndex * rowHeight };
}
