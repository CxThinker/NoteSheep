import { KeyboardEvent, PointerEvent, RefObject, useEffect, useRef, useState, WheelEvent } from "react";

import { clampNumber, EMPTY_SCROLLBAR, isSameScrollbarState, readScrollbarState, ScrollbarState } from "./scrollbar";

type ScrollbarDrag = {
  offsetY: number;
  pointerId: number;
};

export type PanelScrollbar = ReturnType<typeof usePanelScrollbar>;

export function usePanelScrollbar(contentVersion: unknown, contentSelector: string) {
  const panelRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<ScrollbarDrag | null>(null);
  const [scrollbar, setScrollbar] = useState<ScrollbarState>(EMPTY_SCROLLBAR);

  function syncScrollbar() {
    const element = panelRef.current;
    if (!element) {
      return;
    }
    setScrollbar((current) => {
      const next = readScrollbarState(element);
      return isSameScrollbarState(current, next) ? current : next;
    });
  }

  function scrollTo(nextScrollTop: number) {
    const element = panelRef.current;
    if (!element) {
      return;
    }
    element.scrollTop = clampNumber(nextScrollTop, 0, Math.max(element.scrollHeight - element.clientHeight, 0));
    syncScrollbar();
  }

  function scrollFromPointer(clientY: number, track: HTMLDivElement, offsetY: number) {
    const element = panelRef.current;
    if (!element) {
      return;
    }
    const maxScroll = Math.max(element.scrollHeight - element.clientHeight, 0);
    const maxThumbTop = Math.max(element.clientHeight - scrollbar.thumbHeight, 0);
    if (maxScroll === 0 || maxThumbTop === 0) {
      scrollTo(0);
      return;
    }
    const nextTop = clampNumber(clientY - track.getBoundingClientRect().top - offsetY, 0, maxThumbTop);
    scrollTo((nextTop / maxThumbTop) * maxScroll);
  }

  function onWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const element = panelRef.current;
    if (element) {
      scrollTo(element.scrollTop + event.deltaY);
    }
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    const element = panelRef.current;
    if (!element) {
      return;
    }
    event.preventDefault();
    const pointerTop = event.clientY - event.currentTarget.getBoundingClientRect().top;
    const thumbBottom = scrollbar.thumbTop + scrollbar.thumbHeight;
    const offsetY =
      pointerTop >= scrollbar.thumbTop && pointerTop <= thumbBottom
        ? pointerTop - scrollbar.thumbTop
        : scrollbar.thumbHeight / 2;
    dragRef.current = { offsetY, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
    scrollFromPointer(event.clientY, event.currentTarget, offsetY);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    scrollFromPointer(event.clientY, event.currentTarget, dragState.offsetY);
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const element = panelRef.current;
    if (!element) {
      return;
    }
    const amount = keyScrollAmount(event.key, element.clientHeight);
    if (amount !== null) {
      event.preventDefault();
      scrollTo(event.key === "End" ? element.scrollHeight : element.scrollTop + amount);
    }
  }

  useEffect(() => {
    const element = panelRef.current;
    if (!element) {
      return undefined;
    }
    syncScrollbar();
    window.addEventListener("resize", syncScrollbar);
    const resizeObserver = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(syncScrollbar);
    resizeObserver?.observe(element);
    const content = element.querySelector(contentSelector);
    if (content instanceof HTMLElement) {
      resizeObserver?.observe(content);
    }
    return () => {
      window.removeEventListener("resize", syncScrollbar);
      resizeObserver?.disconnect();
    };
  }, [contentVersion, contentSelector]);

  return {
    panelRef: panelRef as RefObject<HTMLElement | null>,
    scrollbar,
    handlers: { onKeyDown, onPointerCancel: onPointerUp, onPointerDown, onPointerMove, onPointerUp, onWheel },
    syncScrollbar,
  };
}

function keyScrollAmount(key: string, pageSize: number) {
  if (key === "Home") {
    return -Number.MAX_SAFE_INTEGER;
  }
  if (key === "End") {
    return Number.MAX_SAFE_INTEGER;
  }
  return ({ ArrowDown: 48, ArrowUp: -48, PageDown: pageSize, PageUp: -pageSize } as Record<string, number>)[key] ?? null;
}
