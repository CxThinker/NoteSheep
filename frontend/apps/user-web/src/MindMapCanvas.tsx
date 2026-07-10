import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";

import { NotebookNode, NotebookTree } from "@notesheep/api-client";

import { messages } from "./messages";
import { layoutMindMap, MindMapNodeLayout } from "./mindMapLayout";
import { DropSide, moveNodeAsChild, moveNodeAsSibling, NOTEBOOK_ROOT_ID, TreeMoveResult } from "./mindMapTree";

type DropTarget =
  | { kind: "child"; nodeId: string }
  | { kind: "sibling"; nodeId: string; side: DropSide };

export type NodeCreateTarget =
  | { kind: "child"; parentId: string }
  | { kind: "sibling"; side: DropSide; targetId: string };

export type NodeDetailTarget =
  | { kind: "notebook"; title: string }
  | { kind: "node"; node: NotebookNode; position: string };

type DragState = {
  nodeId: string;
  pointerId: number;
  x: number;
  y: number;
};

type PendingPress = {
  canDrag: boolean;
  detailTarget: NodeDetailTarget;
  hasLongPressed: boolean;
  nodeId: string;
  pointerId: number;
  timerId: number | null;
  x: number;
  y: number;
};

type MindMapCanvasProps = {
  disabled: boolean;
  error: string;
  onCreateNodeAt: (target: NodeCreateTarget) => void;
  onOpenNodeDetail: (target: NodeDetailTarget) => void;
  onTreeChange: (tree: NotebookTree) => Promise<boolean>;
  rootTitle: string;
  tree: NotebookTree;
  zoom: number;
};

const LONG_PRESS_DRAG_DELAY_MS = 450;

export function MindMapCanvas({
  disabled,
  error,
  onCreateNodeAt,
  onOpenNodeDetail,
  onTreeChange,
  rootTitle,
  tree,
  zoom,
}: MindMapCanvasProps) {
  const canvasTree = useMemo(() => createCanvasTree(tree, rootTitle), [rootTitle, tree]);
  const layout = useMemo(() => layoutMindMap(canvasTree), [canvasTree]);
  const scaledHeight = Math.max(1, Math.ceil(layout.height * zoom));
  const scaledWidth = Math.max(1, Math.ceil(layout.width * zoom));
  const nodeById = useMemo(() => new Map(canvasTree.nodes.map((node) => [node.id, node])), [canvasTree.nodes]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [localError, setLocalError] = useState("");
  const pendingPressRef = useRef<PendingPress | null>(null);
  const draggedNode = dragState ? nodeById.get(dragState.nodeId) : null;

  function handlePointerDown(
    event: PointerEvent<HTMLElement>,
    node: NotebookNode,
    layout: MindMapNodeLayout,
  ) {
    if (disabled) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setLocalError("");
    setDropTarget(null);
    clearPendingPress();

    const pendingPress: PendingPress = {
      canDrag: !layout.isRoot && node.id !== NOTEBOOK_ROOT_ID && node.id !== tree.rootId,
      detailTarget: layout.isRoot
        ? { kind: "notebook", title: node.title }
        : { kind: "node", node, position: `${layout.depth}-${layout.layerIndex}` },
      hasLongPressed: false,
      nodeId: node.id,
      pointerId: event.pointerId,
      timerId: null,
      x: event.clientX,
      y: event.clientY,
    };

    if (pendingPress.canDrag) {
      pendingPress.timerId = window.setTimeout(() => {
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
      }, LONG_PRESS_DRAG_DELAY_MS);
    }

    pendingPressRef.current = pendingPress;
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
    if (pendingPress) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      if (!pendingPress.hasLongPressed) {
        event.preventDefault();
        onOpenNodeDetail(pendingPress.detailTarget);
        return;
      }
    }

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
    <div className="mind-map-shell" style={{ height: `${scaledHeight}px`, width: `${scaledWidth}px` }}>
      <div
        className="mind-map-board"
        style={{
          height: `${layout.height}px`,
          transform: `scale(${zoom})`,
          width: `${layout.width}px`,
        }}
      >
        <svg aria-hidden="true" className="mind-map-connectors" height={layout.height} width={layout.width}>
          {layout.connectors.map((connector) => (
            <path
              d={`M ${connector.startX} ${connector.startY} V ${connector.midY} H ${connector.endX} V ${connector.endY}`}
              key={`${connector.from}-${connector.to}`}
            />
          ))}
        </svg>

        {layout.nodes.map((nodeLayout) => {
          const node = nodeById.get(nodeLayout.id);
          if (!node) {
            return null;
          }
          return (
            <MindMapNode
              activeDrop={dropTarget}
              disabled={disabled}
              isDragging={dragState?.nodeId === node.id}
              key={node.id}
              layout={nodeLayout}
              node={node}
              onCreateNodeAt={onCreateNodeAt}
              onPointerCancel={handlePointerCancel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
          );
        })}
      </div>

      {dragState && draggedNode ? (
        <div className="mind-map-drag-ghost" style={{ left: dragState.x, top: dragState.y }}>
          {draggedNode.title}
        </div>
      ) : null}

      {localError || error ? <p className="form-error mind-map-error">{localError || error}</p> : null}
    </div>
  );
}

function MindMapNode({
  activeDrop,
  disabled,
  isDragging,
  layout,
  node,
  onCreateNodeAt,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  activeDrop: DropTarget | null;
  disabled: boolean;
  isDragging: boolean;
  layout: MindMapNodeLayout;
  node: NotebookNode;
  onCreateNodeAt: (target: NodeCreateTarget) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  onPointerDown: (event: PointerEvent<HTMLElement>, node: NotebookNode, layout: MindMapNodeLayout) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
}) {
  return (
    <article
      aria-label={layout.isRoot ? `根节点 ${node.title}` : `拖动节点 ${node.title}`}
      className="mind-map-node"
      data-dragging={isDragging}
      data-root={layout.isRoot}
      onPointerCancel={onPointerCancel}
      onPointerDown={(event) => onPointerDown(event, node, layout)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role={layout.isRoot ? "group" : "button"}
      style={{
        height: `${layout.height}px`,
        left: `${layout.x - layout.width / 2}px`,
        top: `${layout.y - layout.height / 2}px`,
        width: `${layout.width}px`,
      }}
      tabIndex={layout.isRoot || disabled ? -1 : 0}
    >
      {layout.isRoot ? <p className="mind-map-root-kicker">{messages.shell.currentNotebook}</p> : null}
      <div className="node-title-row">
        <h3>{node.title}</h3>
        {layout.isRoot ? null : (
          <span aria-label={`节点位置 ${layout.depth}-${layout.layerIndex}`} className="root-badge">
            <span>{messages.shell.node}</span>
            <strong>{layout.depth}-{layout.layerIndex}</strong>
          </span>
        )}
      </div>
      {layout.isRoot ? null : (
        <>
          <p className="node-meta">note/{node.textFile}</p>
          <p className="resource-row">
            {node.voiceDir} · {node.imgDir}
          </p>
        </>
      )}
      <DropZone
        active={isActiveDrop(activeDrop, node.id, "child")}
        disabled={disabled}
        kind="child"
        nodeId={node.id}
        nodeTitle={node.title}
        onCreateNodeAt={onCreateNodeAt}
      />
      {layout.isRoot ? null : (
        <>
          <DropZone
            active={isActiveDrop(activeDrop, node.id, "sibling", "left")}
            disabled={disabled}
            kind="sibling"
            nodeId={node.id}
            nodeTitle={node.title}
            onCreateNodeAt={onCreateNodeAt}
            side="left"
          />
          <DropZone
            active={isActiveDrop(activeDrop, node.id, "sibling", "right")}
            disabled={disabled}
            kind="sibling"
            nodeId={node.id}
            nodeTitle={node.title}
            onCreateNodeAt={onCreateNodeAt}
            side="right"
          />
        </>
      )}
    </article>
  );
}

function createCanvasTree(tree: NotebookTree, rootTitle: string): NotebookTree {
  const rootNode: NotebookNode = {
    id: NOTEBOOK_ROOT_ID,
    imgDir: "",
    textFile: "",
    title: rootTitle,
    voiceDir: "",
  };
  const rootEdge =
    tree.rootId && tree.rootId !== NOTEBOOK_ROOT_ID
      ? [{ from: NOTEBOOK_ROOT_ID, order: 0, side: "right" as const, to: tree.rootId }]
      : [];

  return {
    ...tree,
    edges: tree.rootId === NOTEBOOK_ROOT_ID ? tree.edges : [...rootEdge, ...tree.edges],
    nodes: [rootNode, ...tree.nodes],
    rootId: NOTEBOOK_ROOT_ID,
  };
}

function DropZone({
  active,
  disabled,
  kind,
  nodeId,
  nodeTitle,
  onCreateNodeAt,
  side,
}: {
  active: boolean;
  disabled: boolean;
  kind: "child" | "sibling";
  nodeId: string;
  nodeTitle: string;
  onCreateNodeAt: (target: NodeCreateTarget) => void;
  side?: DropSide;
}) {
  const label =
    kind === "child"
      ? `给 ${nodeTitle} 添加子节点`
      : `在 ${nodeTitle} ${side === "left" ? "左侧" : "右侧"}添加兄弟节点`;

  return (
    <button
      aria-label={label}
      className="mind-map-drop-zone"
      data-active={active}
      data-drop-kind={kind}
      data-drop-node={nodeId}
      data-drop-side={side}
      data-position={kind === "child" ? "bottom" : side}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        if (kind === "child") {
          onCreateNodeAt({ kind, parentId: nodeId });
          return;
        }
        if (side) {
          onCreateNodeAt({ kind, side, targetId: nodeId });
        }
      }}
      onPointerDown={(event) => event.stopPropagation()}
      type="button"
    />
  );
}

function readDropTarget(clientX: number, clientY: number, draggedId: string): DropTarget | null {
  const element = document.elementFromPoint(clientX, clientY);
  const zone = element instanceof HTMLElement ? element.closest<HTMLElement>("[data-drop-node]") : null;
  if (!zone) {
    return null;
  }
  const nodeId = zone.dataset.dropNode;
  const kind = zone.dataset.dropKind;
  const side = zone.dataset.dropSide;
  if (!nodeId || nodeId === draggedId) {
    return null;
  }
  if (kind === "child") {
    return { kind, nodeId };
  }
  if (kind === "sibling" && (side === "left" || side === "right")) {
    return { kind, nodeId, side };
  }
  return null;
}

function isActiveDrop(
  activeDrop: DropTarget | null,
  nodeId: string,
  kind: "child" | "sibling",
  side?: DropSide,
) {
  if (!activeDrop || activeDrop.nodeId !== nodeId || activeDrop.kind !== kind) {
    return false;
  }
  return kind === "child" || (activeDrop.kind === "sibling" && activeDrop.side === side);
}

function errorMessageFor(error: NonNullable<TreeMoveResult["error"]>) {
  if (error === "cycle") {
    return messages.shell.treeCycleRejected;
  }
  return messages.shell.treeMoveRejected;
}
