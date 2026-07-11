import { PointerEvent } from "react";

import { NotebookNode } from "@notesheep/api-client";

import { messages } from "./messages";
import { DropTarget, MindMapPointerDown, NodeCreateTarget } from "./mindMapCanvasTypes";
import { MindMapNodeLayout } from "./mindMapLayout";
import { DropSide } from "./mindMapTree";

type MindMapNodeProps = {
  activeDrop: DropTarget | null;
  disabled: boolean;
  isDragging: boolean;
  layout: MindMapNodeLayout;
  node: NotebookNode;
  onCreateNodeAt: (target: NodeCreateTarget) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  onPointerDown: MindMapPointerDown;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
};

export function MindMapNode({
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
}: MindMapNodeProps) {
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
      style={nodeStyle(layout)}
      tabIndex={layout.isRoot || disabled ? -1 : 0}
    >
      {layout.isRoot ? <p className="mind-map-root-kicker">{messages.shell.currentNotebook}</p> : null}
      <NodeTitle layout={layout} node={node} />
      {layout.isRoot ? null : <NodeResources node={node} />}
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

function NodeTitle({ layout, node }: { layout: MindMapNodeLayout; node: NotebookNode }) {
  return (
    <div className="node-title-row">
      <h3>{node.title}</h3>
      {layout.isRoot ? null : (
        <span aria-label={`节点位置 ${layout.depth}-${layout.layerIndex}`} className="root-badge">
          <span>{messages.shell.node}</span>
          <strong>{layout.depth}-{layout.layerIndex}</strong>
        </span>
      )}
    </div>
  );
}

function NodeResources({ node }: { node: NotebookNode }) {
  return (
    <>
      <p className="node-meta">note/{node.textFile}</p>
      <p className="resource-row">
        {node.voiceDir} · {node.imgDir}
      </p>
    </>
  );
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
        } else if (side) {
          onCreateNodeAt({ kind, side, targetId: nodeId });
        }
      }}
      onPointerDown={(event) => event.stopPropagation()}
      type="button"
    />
  );
}

function isActiveDrop(activeDrop: DropTarget | null, nodeId: string, kind: "child" | "sibling", side?: DropSide) {
  if (!activeDrop || activeDrop.nodeId !== nodeId || activeDrop.kind !== kind) {
    return false;
  }
  return kind === "child" || (activeDrop.kind === "sibling" && activeDrop.side === side);
}

function nodeStyle(layout: MindMapNodeLayout) {
  return {
    height: `${layout.height}px`,
    left: `${layout.x - layout.width / 2}px`,
    top: `${layout.y - layout.height / 2}px`,
    width: `${layout.width}px`,
  };
}
