import { NotebookNode } from "@notesheep/api-client";

import { MindMapNodeLayout } from "./mindMapLayout";
import { DropSide } from "./mindMapTree";

export type DropTarget =
  | { kind: "child"; nodeId: string }
  | { kind: "sibling"; nodeId: string; side: DropSide };

export type NodeCreateTarget =
  | { kind: "child"; parentId: string }
  | { kind: "sibling"; side: DropSide; targetId: string };

export type NodeDetailTarget =
  | { kind: "notebook"; title: string }
  | { kind: "node"; node: NotebookNode; position: string };

export type DragState = {
  nodeId: string;
  pointerId: number;
  x: number;
  y: number;
};

export type PendingPress = {
  canDrag: boolean;
  detailTarget: NodeDetailTarget;
  hasLongPressed: boolean;
  nodeId: string;
  pointerId: number;
  timerId: number | null;
  x: number;
  y: number;
};

export type MindMapPointerDown = (
  event: React.PointerEvent<HTMLElement>,
  node: NotebookNode,
  layout: MindMapNodeLayout,
) => void;
