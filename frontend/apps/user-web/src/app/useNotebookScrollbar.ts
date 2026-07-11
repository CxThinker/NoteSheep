import {
  KeyboardEvent,
  PointerEvent,
  useEffect,
  useRef,
  useState,
  WheelEvent as ReactWheelEvent,
} from "react";

import { clampNumber, EMPTY_SCROLLBAR, isSameScrollbarState, readScrollbarState } from "./scrollbar";

type ScrollbarDrag = {
  offsetY: number;
  pointerId: number;
};

export function useNotebookScrollbar(contentVersion: number) {
  const notebookSidebarRef = useRef<HTMLElement | null>(null);
  const scrollbarDragRef = useRef<ScrollbarDrag | null>(null);
  const [notebookScrollbar, setNotebookScrollbar] = useState(EMPTY_SCROLLBAR);

  function syncNotebookScrollbar() {
    const element = notebookSidebarRef.current;
    if (!element) {
      return;
    }
    setNotebookScrollbar((current) => {
      const next = readScrollbarState(element);
      return isSameScrollbarState(current, next) ? current : next;
    });
  }

  function scrollNotebookTo(nextScrollTop: number) {
    const element = notebookSidebarRef.current;
    if (!element) {
      return;
    }
    const maxScroll = Math.max(element.scrollHeight - element.clientHeight, 0);
    element.scrollTop = clampNumber(nextScrollTop, 0, maxScroll);
    syncNotebookScrollbar();
  }

  function scrollNotebookFromPointer(clientY: number, track: HTMLDivElement, offsetY: number) {
    const element = notebookSidebarRef.current;
    if (!element) {
      return;
    }
    const maxScroll = Math.max(element.scrollHeight - element.clientHeight, 0);
    const maxThumbTop = Math.max(element.clientHeight - notebookScrollbar.thumbHeight, 0);
    if (maxScroll === 0 || maxThumbTop === 0) {
      scrollNotebookTo(0);
      return;
    }

    const trackTop = track.getBoundingClientRect().top;
    const nextThumbTop = clampNumber(clientY - trackTop - offsetY, 0, maxThumbTop);
    scrollNotebookTo((nextThumbTop / maxThumbTop) * maxScroll);
  }

  function handleNotebookScrollbarWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const element = notebookSidebarRef.current;
    if (element) {
      scrollNotebookTo(element.scrollTop + event.deltaY);
    }
  }

  function handleNotebookScrollbarPointerDown(event: PointerEvent<HTMLDivElement>) {
    const element = notebookSidebarRef.current;
    if (!element) {
      return;
    }
    event.preventDefault();

    const pointerTop = event.clientY - event.currentTarget.getBoundingClientRect().top;
    const thumbBottom = notebookScrollbar.thumbTop + notebookScrollbar.thumbHeight;
    const offsetY =
      pointerTop >= notebookScrollbar.thumbTop && pointerTop <= thumbBottom
        ? pointerTop - notebookScrollbar.thumbTop
        : notebookScrollbar.thumbHeight / 2;

    scrollbarDragRef.current = { offsetY, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
    scrollNotebookFromPointer(event.clientY, event.currentTarget, offsetY);
  }

  function handleNotebookScrollbarPointerMove(event: PointerEvent<HTMLDivElement>) {
    const dragState = scrollbarDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    scrollNotebookFromPointer(event.clientY, event.currentTarget, dragState.offsetY);
  }

  function handleNotebookScrollbarPointerUp(event: PointerEvent<HTMLDivElement>) {
    const dragState = scrollbarDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }
    scrollbarDragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleNotebookScrollbarKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const element = notebookSidebarRef.current;
    if (!element) {
      return;
    }

    const keyScrollAmount: Record<string, number> = {
      ArrowDown: 48,
      ArrowUp: -48,
      PageDown: element.clientHeight,
      PageUp: -element.clientHeight,
    };

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      scrollNotebookTo(event.key === "Home" ? 0 : element.scrollHeight);
      return;
    }
    if (event.key in keyScrollAmount) {
      event.preventDefault();
      scrollNotebookTo(element.scrollTop + keyScrollAmount[event.key]);
    }
  }

  useEffect(() => {
    const element = notebookSidebarRef.current;
    if (!element) {
      return undefined;
    }

    syncNotebookScrollbar();
    window.addEventListener("resize", syncNotebookScrollbar);

    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(syncNotebookScrollbar);
      resizeObserver.observe(element);
      const content = element.querySelector(".notebook-sidebar-content");
      if (content instanceof HTMLElement) {
        resizeObserver.observe(content);
      }
    }

    return () => {
      window.removeEventListener("resize", syncNotebookScrollbar);
      resizeObserver?.disconnect();
    };
  }, [contentVersion]);

  return {
    handleNotebookScrollbarKeyDown,
    handleNotebookScrollbarPointerDown,
    handleNotebookScrollbarPointerMove,
    handleNotebookScrollbarPointerUp,
    handleNotebookScrollbarWheel,
    notebookScrollbar,
    notebookSidebarRef,
    syncNotebookScrollbar,
  };
}
