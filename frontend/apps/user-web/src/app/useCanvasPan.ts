import { PointerEvent, RefObject, useEffect, useRef, useState } from "react";

type CanvasPanState = {
  pointerId: number;
  scrollLeft: number;
  scrollTop: number;
  x: number;
  y: number;
};

const PAN_BLOCK_SELECTOR = [
  "button",
  "input",
  "select",
  "textarea",
  "a",
  '[role="button"]',
  ".mind-map-node",
  ".mind-map-drop-zone",
  ".zoom-toolbar",
  ".node-fab",
].join(",");

export function useCanvasPan(boardRef: RefObject<HTMLDivElement | null>) {
  const panRef = useRef<CanvasPanState | null>(null);
  const [isPanning, setPanning] = useState(false);

  useEffect(() => () => {
    panRef.current = null;
  }, []);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    const board = boardRef.current;
    if (!board || !canStartCanvasPan(event)) {
      return;
    }
    event.preventDefault();
    board.setPointerCapture(event.pointerId);
    panRef.current = {
      pointerId: event.pointerId,
      scrollLeft: board.scrollLeft,
      scrollTop: board.scrollTop,
      x: event.clientX,
      y: event.clientY,
    };
    setPanning(true);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const board = boardRef.current;
    const pan = panRef.current;
    if (!board || !pan || pan.pointerId !== event.pointerId) {
      return;
    }
    if (event.buttons !== 1) {
      stopCanvasPan(event);
      return;
    }
    event.preventDefault();
    board.scrollLeft = pan.scrollLeft - (event.clientX - pan.x);
    board.scrollTop = pan.scrollTop - (event.clientY - pan.y);
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    stopCanvasPan(event);
  }

  function stopCanvasPan(event: PointerEvent<HTMLDivElement>) {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) {
      return;
    }
    panRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setPanning(false);
  }

  return {
    handlers: { onPointerCancel: stopCanvasPan, onPointerDown, onPointerMove, onPointerUp },
    isPanning,
  };
}

function canStartCanvasPan(event: PointerEvent<HTMLDivElement>) {
  if (event.button !== 0) {
    return false;
  }
  return !(event.target instanceof Element && event.target.closest(PAN_BLOCK_SELECTOR));
}
