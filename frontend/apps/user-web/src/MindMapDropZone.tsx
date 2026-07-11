import { DragEvent } from "react";

import { formatMessage, messages } from "./messages";
import { DropTarget, NodeCreateTarget } from "./mindMapCanvasTypes";
import { DropSide } from "./mindMapTree";

type MindMapDropZoneProps = {
  active: boolean;
  disabled: boolean;
  kind: "child" | "sibling";
  nodeId: string;
  nodeTitle: string;
  onCreateNodeAt: (target: NodeCreateTarget) => void;
  onDropTrayNode: (nodeId: string, target: DropTarget) => void;
  selectedTrayNodeId: string | null;
  side?: DropSide;
};

export function MindMapDropZone({
  active,
  disabled,
  kind,
  nodeId,
  nodeTitle,
  onCreateNodeAt,
  onDropTrayNode,
  selectedTrayNodeId,
  side,
}: MindMapDropZoneProps) {
  const sideLabel = side === "left" ? messages.shell.leftSide : messages.shell.rightSide;
  const label =
    kind === "child"
      ? formatMessage(messages.shell.addChildNodeLabel, { nodeTitle })
      : formatMessage(messages.shell.addSiblingNodeLabel, { nodeTitle, side: sideLabel });

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
        if (selectedTrayNodeId) {
          if (kind === "child") {
            onDropTrayNode(selectedTrayNodeId, { kind, nodeId });
          } else if (side) {
            onDropTrayNode(selectedTrayNodeId, { kind, nodeId, side });
          }
          return;
        }
        if (kind === "child") {
          onCreateNodeAt({ kind, parentId: nodeId });
        } else if (side) {
          onCreateNodeAt({ kind, side, targetId: nodeId });
        }
      }}
      onDragOver={(event) => {
        if (readTrayDrag(event)) {
          event.preventDefault();
        }
      }}
      onDrop={(event) => handleDrop(event, kind, nodeId, onDropTrayNode, side)}
      onPointerDown={(event) => event.stopPropagation()}
      type="button"
    />
  );
}

function handleDrop(
  event: DragEvent<HTMLElement>,
  kind: "child" | "sibling",
  nodeId: string,
  onDropTrayNode: (nodeId: string, target: DropTarget) => void,
  side?: DropSide,
) {
  const draggedId = readTrayDrag(event);
  if (!draggedId) {
    return;
  }
  event.preventDefault();
  if (kind === "child") {
    onDropTrayNode(draggedId, { kind, nodeId });
  } else if (side) {
    onDropTrayNode(draggedId, { kind, nodeId, side });
  }
}

function readTrayDrag(event: DragEvent<HTMLElement>) {
  return event.dataTransfer.getData("application/x-notesheep-node-id") || event.dataTransfer.getData("text/plain");
}
