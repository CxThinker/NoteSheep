import { DragEvent, PointerEvent, RefObject, useRef } from "react";

import { NotebookNode } from "@notesheep/api-client";

import { NodeDetailTarget } from "../MindMapCanvas";
import { DropTarget } from "../mindMapCanvasTypes";
import { readDropTarget } from "../mindMapCanvasHelpers";
import { messages } from "../messages";

type NodeTrayItemProps = {
  disabled: boolean;
  node: NotebookNode;
  onOpenNodeDetail: (target: NodeDetailTarget) => void;
  onDropTargetPreview: (target: DropTarget | null) => void;
  onPermanentDelete: (nodeId: string) => void;
  onPlaceNode: (nodeId: string, target: DropTarget) => void;
  onSelectNode: (nodeId: string | null) => void;
  positionLabel: string;
  selected: boolean;
  showPermanentDelete: boolean;
};

type TrayPointerDrag = {
  didMove: boolean;
  pointerId: number;
  startX: number;
  startY: number;
};

let cleanupNativeDragPreview: (() => void) | null = null;

export function NodeTrayItem({
  disabled,
  node,
  onOpenNodeDetail,
  onDropTargetPreview,
  onPermanentDelete,
  onPlaceNode,
  onSelectNode,
  positionLabel,
  selected,
  showPermanentDelete,
}: NodeTrayItemProps) {
  const pointerDragRef = useRef<TrayPointerDrag | null>(null);
  const previewDropTargetRef = useRef<DropTarget | null>(null);
  const suppressClickRef = useRef(false);
  function handleDropTargetPreview(target: DropTarget | null) {
    previewDropTargetRef.current = target;
    onDropTargetPreview(target);
  }

  return (
    <article
      className="node-tray-item"
      data-selected={selected}
      draggable={!disabled}
      onDrag={(event) => previewTrayNativeDrag(event, node.id, handleDropTargetPreview)}
      onDragEnd={(event) => finishTrayNativeDrag(event, node.id, previewDropTargetRef.current, onPlaceNode, handleDropTargetPreview)}
      onDragStart={(event) => writeTrayDrag(event, node.id, handleDropTargetPreview)}
      onPointerCancel={(event) => cancelTrayPointerDrag(event, pointerDragRef, handleDropTargetPreview)}
      onPointerDown={(event) => startTrayPointerDrag(event, disabled, pointerDragRef, suppressClickRef)}
      onPointerMove={(event) => moveTrayPointerDrag(event, node.id, pointerDragRef, handleDropTargetPreview)}
      onPointerUp={(event) => finishTrayPointerDrag(event, node.id, previewDropTargetRef.current, pointerDragRef, suppressClickRef, onPlaceNode, handleDropTargetPreview)}
    >
      <div className="node-tray-main">
        <button
          className="node-tray-open"
          onClick={(event) => {
            if (suppressClickRef.current) {
              suppressClickRef.current = false;
              event.preventDefault();
              event.stopPropagation();
              return;
            }
            onOpenNodeDetail({ kind: "node", node, position: positionLabel });
          }}
          type="button"
        >
          {node.title}
        </button>
        <button
          aria-label={`${selected ? messages.shell.unselectTrayNode : messages.shell.selectTrayNode} ${node.title}`}
          aria-pressed={selected}
          className="node-tray-place"
          disabled={disabled}
          onClick={() => onSelectNode(selected ? null : node.id)}
          type="button"
        >
          &gt;
        </button>
      </div>
      {showPermanentDelete ? (
        <button aria-label={`${messages.shell.permanentDelete} ${node.title}`} className="node-tray-delete" onClick={() => onPermanentDelete(node.id)} type="button">
          {messages.shell.permanentDelete}
        </button>
      ) : null}
    </article>
  );
}

function writeTrayDrag(
  event: DragEvent<HTMLElement>,
  nodeId: string,
  onDropTargetPreview: (target: DropTarget | null) => void,
) {
  event.dataTransfer.setData("application/x-notesheep-node-id", nodeId);
  event.dataTransfer.setData("text/plain", nodeId);
  event.dataTransfer.effectAllowed = "move";
  onDropTargetPreview(null);
  startNativeDragPreview(nodeId, onDropTargetPreview);
}

function previewTrayNativeDrag(
  event: DragEvent<HTMLElement>,
  nodeId: string,
  onDropTargetPreview: (target: DropTarget | null) => void,
) {
  if (event.clientX === 0 && event.clientY === 0) {
    return;
  }
  onDropTargetPreview(readDropTarget(event.clientX, event.clientY, nodeId));
}

function finishTrayNativeDrag(
  event: DragEvent<HTMLElement>,
  nodeId: string,
  previewTarget: DropTarget | null,
  onPlaceNode: (nodeId: string, target: DropTarget) => void,
  onDropTargetPreview: (target: DropTarget | null) => void,
) {
  const target = readDropTarget(event.clientX, event.clientY, nodeId) ?? previewTarget;
  stopNativeDragPreview();
  onDropTargetPreview(null);
  if (target) {
    event.preventDefault();
    onPlaceNode(nodeId, target);
  }
}

function startTrayPointerDrag(
  event: PointerEvent<HTMLElement>,
  disabled: boolean,
  pointerDragRef: RefObject<TrayPointerDrag | null>,
  suppressClickRef: RefObject<boolean>,
) {
  if (disabled) {
    return;
  }
  pointerDragRef.current = {
    didMove: false,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
  };
  suppressClickRef.current = false;
  event.currentTarget.setPointerCapture(event.pointerId);
}

function moveTrayPointerDrag(
  event: PointerEvent<HTMLElement>,
  nodeId: string,
  pointerDragRef: RefObject<TrayPointerDrag | null>,
  onDropTargetPreview: (target: DropTarget | null) => void,
) {
  const drag = pointerDragRef.current;
  if (!drag || drag.pointerId !== event.pointerId) {
    return;
  }
  const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
  if (distance > 4) {
    drag.didMove = true;
  }
  if (drag.didMove) {
    onDropTargetPreview(readDropTarget(event.clientX, event.clientY, nodeId));
  }
}

function finishTrayPointerDrag(
  event: PointerEvent<HTMLElement>,
  nodeId: string,
  previewTarget: DropTarget | null,
  pointerDragRef: RefObject<TrayPointerDrag | null>,
  suppressClickRef: RefObject<boolean>,
  onPlaceNode: (nodeId: string, target: DropTarget) => void,
  onDropTargetPreview: (target: DropTarget | null) => void,
) {
  const drag = pointerDragRef.current;
  if (!drag || drag.pointerId !== event.pointerId) {
    return;
  }
  pointerDragRef.current = null;
  event.currentTarget.releasePointerCapture(event.pointerId);
  const target = readDropTarget(event.clientX, event.clientY, nodeId) ?? previewTarget;
  onDropTargetPreview(null);
  if (target) {
    suppressNextClick(suppressClickRef);
    event.preventDefault();
    onPlaceNode(nodeId, target);
    return;
  }
  if (drag.didMove) {
    suppressNextClick(suppressClickRef);
  }
}

function cancelTrayPointerDrag(
  event: PointerEvent<HTMLElement>,
  pointerDragRef: RefObject<TrayPointerDrag | null>,
  onDropTargetPreview: (target: DropTarget | null) => void,
) {
  const drag = pointerDragRef.current;
  if (drag?.pointerId === event.pointerId) {
    pointerDragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    onDropTargetPreview(null);
  }
}

function startNativeDragPreview(nodeId: string, onDropTargetPreview: (target: DropTarget | null) => void) {
  stopNativeDragPreview();

  const handleDragOver = (event: globalThis.DragEvent) => {
    if (event.clientX === 0 && event.clientY === 0) {
      return;
    }
    onDropTargetPreview(readDropTarget(event.clientX, event.clientY, nodeId));
  };
  const handleDragStop = () => {
    onDropTargetPreview(null);
    stopNativeDragPreview();
  };

  window.addEventListener("dragover", handleDragOver);
  window.addEventListener("drop", handleDragStop);
  window.addEventListener("dragend", handleDragStop);
  cleanupNativeDragPreview = () => {
    window.removeEventListener("dragover", handleDragOver);
    window.removeEventListener("drop", handleDragStop);
    window.removeEventListener("dragend", handleDragStop);
    cleanupNativeDragPreview = null;
  };
}

function stopNativeDragPreview() {
  cleanupNativeDragPreview?.();
}

function suppressNextClick(suppressClickRef: RefObject<boolean>) {
  suppressClickRef.current = true;
  window.setTimeout(() => {
    suppressClickRef.current = false;
  }, 0);
}
