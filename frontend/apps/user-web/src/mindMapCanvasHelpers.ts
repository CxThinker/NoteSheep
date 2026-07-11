import { NotebookNode, NotebookTree } from "@notesheep/api-client";

import { messages } from "./messages";
import { DropTarget, PendingPress } from "./mindMapCanvasTypes";
import { MindMapNodeLayout } from "./mindMapLayout";
import { NOTEBOOK_ROOT_ID, TreeMoveResult } from "./mindMapTree";

export function createCanvasTree(tree: NotebookTree, rootTitle: string): NotebookTree {
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

export function readDropTarget(clientX: number, clientY: number, draggedId: string): DropTarget | null {
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

export function errorMessageFor(error: NonNullable<TreeMoveResult["error"]>) {
  if (error === "cycle") {
    return messages.shell.treeCycleRejected;
  }
  return messages.shell.treeMoveRejected;
}

export function pendingPressFromEvent(
  event: React.PointerEvent<HTMLElement>,
  node: NotebookNode,
  layout: MindMapNodeLayout,
  rootId: string | null,
): PendingPress {
  return {
    canDrag: !layout.isRoot && node.id !== NOTEBOOK_ROOT_ID && node.id !== rootId,
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
}
