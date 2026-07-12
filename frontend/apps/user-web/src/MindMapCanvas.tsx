import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";

import { NotebookNode } from "@notesheep/api-client";

import { messages } from "./messages";
import { createCanvasTree, errorMessageFor, pendingPressFromEvent, readDropTarget } from "./mindMapCanvasHelpers";
import {
  DragState,
  DropTarget,
  MindMapCanvasProps,
  PendingPress,
} from "./mindMapCanvasTypes";
import { layoutMindMap, MindMapNodeLayout } from "./mindMapLayout";
import { moveNodeAsChild, moveNodeAsSibling, NOTEBOOK_ROOT_ID } from "./mindMapTree";
import { MindMapViewport } from "./MindMapViewport";

export type { NodeCreateTarget, NodeDetailTarget } from "./mindMapCanvasTypes";

const LONG_PRESS_DRAG_DELAY_MS = 450;

export function MindMapCanvas({
  disabled,
  error,
  horizontalGutter,
  onCreateNodeAt,
  onDeleteNode,
  onOpenNodeDetail,
  onPlaceTrayNode,
  onTreeChange,
  nodeDetails,
  rootTitle,
  selectedTrayNodeId,
  trayDropTarget,
  tree,
  zoom,
}: MindMapCanvasProps) {
  const canvasTree = useMemo(() => createCanvasTree(tree, rootTitle), [rootTitle, tree]);
  const layout = useMemo(() => layoutMindMap(canvasTree), [canvasTree]);
  const nodeById = useMemo(() => new Map(canvasTree.nodes.map((node) => [node.id, node])), [canvasTree.nodes]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [localError, setLocalError] = useState("");
  const pendingPressRef = useRef<PendingPress | null>(null);
  const draggedNode = dragState ? (nodeById.get(dragState.nodeId) ?? null) : null;
  const activeDropTarget = dragState ? dropTarget : trayDropTarget;

  function handlePointerDown(event: PointerEvent<HTMLElement>, node: NotebookNode, nodeLayout: MindMapNodeLayout) {
    if (disabled) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setLocalError("");
    setDropTarget(null);
    clearPendingPress();

    const pendingPress = pendingPressFromEvent(event, node, nodeLayout, tree.rootId);
    if (pendingPress.canDrag) {
      pendingPress.timerId = window.setTimeout(() => startDrag(pendingPress), LONG_PRESS_DRAG_DELAY_MS);
    }
    pendingPressRef.current = pendingPress;
  }

  function startDrag(pendingPress: PendingPress) {
    if (pendingPressRef.current !== pendingPress) {
      return;
    }
    pendingPress.hasLongPressed = true;
    pendingPress.timerId = null;
    setDragState({
      nodeId: pendingPress.nodeId,
      pointerId: pendingPress.pointerId,
      x: pendingPress.x,
      y: pendingPress.y,
    });
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    const pendingPress = pendingPressRef.current;
    if (pendingPress && event.pointerId === pendingPress.pointerId) {
      pendingPress.x = event.clientX;
      pendingPress.y = event.clientY;
    }

    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }
    event.preventDefault();
    setDragState({ ...dragState, x: event.clientX, y: event.clientY });
    setDropTarget(readDropTarget(event.clientX, event.clientY, dragState.nodeId));
  }

  async function handlePointerUp(event: PointerEvent<HTMLElement>) {
    const pendingPress = finishPendingPress(event.pointerId);
    if (pendingPress && !pendingPress.hasLongPressed) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      event.preventDefault();
      onOpenNodeDetail(pendingPress.detailTarget);
      return;
    }
    if (pendingPress) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    await finishDrag(event);
  }

  async function finishDrag(event: PointerEvent<HTMLElement>) {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }
    event.preventDefault();
    const target = dropTarget;
    setDragState(null);
    setDropTarget(null);
    if (!target) {
      return;
    }

    const result =
      target.kind === "child"
        ? moveNodeAsChild(tree, dragState.nodeId, target.nodeId)
        : moveNodeAsSibling(tree, dragState.nodeId, target.nodeId, target.side);
    if (result.error) {
      setLocalError(errorMessageFor(result.error));
      return;
    }
    const saved = await onTreeChange(result.tree);
    if (!saved) {
      setLocalError(messages.shell.treeUpdateFailed);
    }
  }

  async function handleDropTrayNode(nodeId: string, target: DropTarget) {
    await onPlaceTrayNode(nodeId, target);
  }

  function handlePointerCancel(event: PointerEvent<HTMLElement>) {
    finishPendingPress(event.pointerId);
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (dragState?.pointerId === event.pointerId) {
      setDragState(null);
      setDropTarget(null);
    }
  }

  function clearPendingPress() {
    const pendingPress = pendingPressRef.current;
    if (pendingPress && pendingPress.timerId !== null) {
      window.clearTimeout(pendingPress.timerId);
    }
    pendingPressRef.current = null;
  }

  function finishPendingPress(pointerId: number) {
    const pendingPress = pendingPressRef.current;
    if (!pendingPress || pendingPress.pointerId !== pointerId) {
      return null;
    }
    if (pendingPress.timerId !== null) {
      window.clearTimeout(pendingPress.timerId);
      pendingPress.timerId = null;
    }
    pendingPressRef.current = null;
    return pendingPress;
  }

  useEffect(() => clearPendingPress, []);

  if (!rootTitle || layout.nodes.length === 0) {
    return <p className="empty-state">{messages.shell.emptyNodes}</p>;
  }

  return (
    <MindMapViewport
      activeDropTarget={activeDropTarget}
      disabled={disabled}
      draggedNode={draggedNode}
      dragState={dragState}
      error={localError || error}
      horizontalGutter={horizontalGutter}
      layout={layout}
      nodeById={nodeById}
      nodeDetails={nodeDetails}
      onCreateNodeAt={onCreateNodeAt}
      onDeleteNode={onDeleteNode}
      onDropTrayNode={handleDropTrayNode}
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      selectedTrayNodeId={selectedTrayNodeId}
      zoom={zoom}
    />
  );
}
