import { PointerEvent } from "react";

import { NotebookNode } from "@notesheep/api-client";

import { messages } from "./messages";
import { MindMapDropZone } from "./MindMapDropZone";
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
  onDeleteNode: (nodeId: string) => void;
  onDropTrayNode: (nodeId: string, target: DropTarget) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  onPointerDown: MindMapPointerDown;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  selectedTrayNodeId: string | null;
};

export function MindMapNode({
  activeDrop,
  disabled,
  isDragging,
  layout,
  node,
  onCreateNodeAt,
  onDeleteNode,
  onDropTrayNode,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  selectedTrayNodeId,
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
      {layout.isRoot ? null : (
        <button
          aria-label={`${messages.shell.deleteNode} ${node.title}`}
          className="mind-map-delete-node"
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation();
            onDeleteNode(node.id);
          }}
          onPointerDown={(event) => event.stopPropagation()}
          type="button"
        >
          ×
        </button>
      )}
      <MindMapDropZone
        active={isActiveDrop(activeDrop, node.id, "child")}
        disabled={disabled}
        kind="child"
        nodeId={node.id}
        nodeTitle={node.title}
        onCreateNodeAt={onCreateNodeAt}
        onDropTrayNode={onDropTrayNode}
        selectedTrayNodeId={selectedTrayNodeId}
      />
      {layout.isRoot ? null : (
        <>
          <MindMapDropZone
            active={isActiveDrop(activeDrop, node.id, "sibling", "left")}
            disabled={disabled}
            kind="sibling"
            nodeId={node.id}
            nodeTitle={node.title}
            onCreateNodeAt={onCreateNodeAt}
            onDropTrayNode={onDropTrayNode}
            selectedTrayNodeId={selectedTrayNodeId}
            side="left"
          />
          <MindMapDropZone
            active={isActiveDrop(activeDrop, node.id, "sibling", "right")}
            disabled={disabled}
            kind="sibling"
            nodeId={node.id}
            nodeTitle={node.title}
            onCreateNodeAt={onCreateNodeAt}
            onDropTrayNode={onDropTrayNode}
            selectedTrayNodeId={selectedTrayNodeId}
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
