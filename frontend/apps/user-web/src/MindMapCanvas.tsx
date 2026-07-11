import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";

import { NotebookNode, NotebookTree } from "@notesheep/api-client";

import { messages } from "./messages";
import { MindMapBoard } from "./MindMapBoard";
import { createCanvasTree, errorMessageFor, pendingPressFromEvent, readDropTarget } from "./mindMapCanvasHelpers";
import {
  DragState,
  DropTarget,
  NodeCreateTarget,
  NodeDetailTarget,
  PendingPress,
} from "./mindMapCanvasTypes";
import { layoutMindMap, MindMapNodeLayout } from "./mindMapLayout";
import { moveNodeAsChild, moveNodeAsSibling, NOTEBOOK_ROOT_ID } from "./mindMapTree";

export type { NodeCreateTarget, NodeDetailTarget } from "./mindMapCanvasTypes";

type MindMapCanvasProps = {
  disabled: boolean;
  error: string;
  onCreateNodeAt: (target: NodeCreateTarget) => void;
  onDeleteNode: (nodeId: string) => void;
  onOpenNodeDetail: (target: NodeDetailTarget) => void;
  onPlaceTrayNode: (nodeId: string, target: DropTarget) => void;
  onTreeChange: (tree: NotebookTree) => Promise<boolean>;
  rootTitle: string;
  selectedTrayNodeId: string | null;
  trayDropTarget: DropTarget | null;
  tree: NotebookTree;
  zoom: number;
};

const LONG_PRESS_DRAG_DELAY_MS = 450;

export function MindMapCanvas({
  disabled,
  error,
  onCreateNodeAt,
  onDeleteNode,
  onOpenNodeDetail,
  onPlaceTrayNode,
  onTreeChange,
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
  const draggedNode = dragState ? nodeById.get(dragState.nodeId) : null;
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
    <div className="mind-map-shell" style={{ height: `${Math.ceil(layout.height * zoom)}px`, width: `${Math.ceil(layout.width * zoom)}px` }}>
      <MindMapBoard
        disabled={disabled}
        dragState={dragState}
        dropTarget={activeDropTarget}
        layout={layout}
        nodeById={nodeById}
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
      {dragState && draggedNode ? <div className="mind-map-drag-ghost" style={{ left: dragState.x, top: dragState.y }}>{draggedNode.title}</div> : null}
      {localError || error ? <p className="form-error mind-map-error">{localError || error}</p> : null}
    </div>
  );
}
