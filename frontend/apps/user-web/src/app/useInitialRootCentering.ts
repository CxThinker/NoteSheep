import { RefObject, useLayoutEffect, useMemo, useRef, useState } from "react";

import { NotebookTree } from "@notesheep/api-client";

import { createCanvasTree } from "../mindMapCanvasHelpers";
import { layoutMindMap } from "../mindMapLayout";

type UseInitialRootCenteringOptions = {
  boardRef: RefObject<HTMLDivElement | null>;
  selectedNotebookName: string;
  tree: NotebookTree;
  zoom: number;
};

export function useInitialRootCentering({
  boardRef,
  selectedNotebookName,
  tree,
  zoom,
}: UseInitialRootCenteringOptions) {
  const [horizontalGutter, setHorizontalGutter] = useState(0);
  const previousNotebookRef = useRef("");
  const pendingNotebookRef = useRef<string | null>(null);
  const treeAtSelectionRef = useRef<NotebookTree | null>(null);
  const rootCenterX = useMemo(() => {
    if (!selectedNotebookName) {
      return null;
    }
    const canvasTree = createCanvasTree(tree, selectedNotebookName);
    const rootLayout = layoutMindMap(canvasTree).nodes.find((node) => node.isRoot);
    return rootLayout?.x ?? null;
  }, [selectedNotebookName, tree]);

  useLayoutEffect(() => {
    if (previousNotebookRef.current === selectedNotebookName) {
      return;
    }
    previousNotebookRef.current = selectedNotebookName;
    pendingNotebookRef.current = selectedNotebookName || null;
    treeAtSelectionRef.current = tree;
    setHorizontalGutter(0);
  }, [selectedNotebookName, tree]);

  useLayoutEffect(() => {
    const pendingNotebook = pendingNotebookRef.current;
    const board = boardRef.current;
    if (!board || !pendingNotebook || pendingNotebook !== selectedNotebookName || rootCenterX === null) {
      return undefined;
    }
    if (treeAtSelectionRef.current === tree) {
      return undefined;
    }

    setHorizontalGutter(Math.max(0, board.clientWidth / 2));
    const cancelCentering = scheduleRootCentering(() => {
      board.scrollLeft = Math.max(0, Math.round(rootCenterX * zoom));
      pendingNotebookRef.current = null;
      treeAtSelectionRef.current = null;
    });
    return cancelCentering;
  }, [boardRef, rootCenterX, selectedNotebookName, tree, zoom]);

  return { horizontalGutter };
}

function scheduleRootCentering(callback: () => void) {
  if (typeof window.requestAnimationFrame === "function") {
    const frameId = window.requestAnimationFrame(callback);
    return () => window.cancelAnimationFrame(frameId);
  }
  const timeoutId = window.setTimeout(callback, 0);
  return () => window.clearTimeout(timeoutId);
}
