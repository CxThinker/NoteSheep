import { NotebookTree } from "@notesheep/api-client";

import { normalizeNotebookTree } from "./mindMapTree";

export type MindMapNodeLayout = {
  depth: number;
  height: number;
  id: string;
  isRoot: boolean;
  layerIndex: number;
  width: number;
  x: number;
  y: number;
};

export type MindMapConnector = {
  endX: number;
  endY: number;
  from: string;
  midY: number;
  startX: number;
  startY: number;
  to: string;
};

export type MindMapLayout = {
  connectors: MindMapConnector[];
  height: number;
  nodes: MindMapNodeLayout[];
  width: number;
};

const NODE_WIDTH = 180;
const NODE_HEIGHT = 110;
const ROOT_WIDTH = 220;
const ROOT_HEIGHT = 90;
const GAP_X = 64;
const GAP_Y = 72;
const PADDING = 40;

export function layoutMindMap(tree: NotebookTree): MindMapLayout {
  const normalizedTree = normalizeNotebookTree(tree);
  const rootId = normalizedTree.rootId;
  if (!rootId) {
    return { connectors: [], height: 240, nodes: [], width: 520 };
  }

  const nodeLayouts = new Map<string, MindMapNodeLayout>();
  const rootLayout: MindMapNodeLayout = {
    depth: 0,
    height: ROOT_HEIGHT,
    id: rootId,
    isRoot: true,
    layerIndex: 0,
    width: ROOT_WIDTH,
    x: 0,
    y: 0,
  };

  layoutSubtree(normalizedTree, rootId, rootLayout.x, rootLayout.y, 0, nodeLayouts);

  const rawNodes = [...nodeLayouts.values()];
  const minX = Math.min(...rawNodes.map((node) => node.x - node.width / 2));
  const minY = Math.min(...rawNodes.map((node) => node.y - node.height / 2));
  const maxX = Math.max(...rawNodes.map((node) => node.x + node.width / 2));
  const maxY = Math.max(...rawNodes.map((node) => node.y + node.height / 2));
  const offsetX = PADDING - minX;
  const offsetY = PADDING - minY;
  const offsetNodes = rawNodes.map((node) => ({ ...node, x: node.x + offsetX, y: node.y + offsetY }));
  const layerIndexById = readLayerIndexes(offsetNodes);
  const nodes = offsetNodes.map((node) => ({
    ...node,
    layerIndex: layerIndexById.get(node.id) ?? node.layerIndex,
  }));
  const layoutById = new Map(nodes.map((node) => [node.id, node]));
  const connectors = normalizedTree.edges.flatMap((edge) => {
    const from = layoutById.get(edge.from);
    const to = layoutById.get(edge.to);
    if (!from || !to) {
      return [];
    }
    const startY = from.y + from.height / 2;
    const endY = to.y - to.height / 2;
    return [
      {
        endX: to.x,
        endY,
        from: edge.from,
        midY: startY + (endY - startY) / 2,
        startX: from.x,
        startY,
        to: edge.to,
      },
    ];
  });

  return {
    connectors,
    height: Math.ceil(maxY - minY + PADDING * 2),
    nodes,
    width: Math.ceil(maxX - minX + PADDING * 2),
  };
}

function layoutSubtree(
  tree: NotebookTree,
  nodeId: string,
  x: number,
  y: number,
  depth: number,
  nodeLayouts: Map<string, MindMapNodeLayout>,
) {
  const isRoot = nodeId === tree.rootId;
  const height = isRoot ? ROOT_HEIGHT : NODE_HEIGHT;
  const width = isRoot ? ROOT_WIDTH : NODE_WIDTH;
  nodeLayouts.set(nodeId, {
    depth,
    height,
    id: nodeId,
    isRoot,
    layerIndex: 0,
    width,
    x,
    y,
  });

  const children = childrenOf(tree, nodeId);
  if (children.length === 0) {
    return;
  }

  const childWidths = children.map((childId) => subtreeWidth(tree, childId));
  const totalWidth = childWidths.reduce((sum, childWidth) => sum + childWidth, 0) + GAP_X * (children.length - 1);
  let nextX = x - totalWidth / 2;
  children.forEach((childId, index) => {
    const branchWidth = childWidths[index];
    const childX = nextX + branchWidth / 2;
    const childY = y + height / 2 + GAP_Y + NODE_HEIGHT / 2;
    layoutSubtree(tree, childId, childX, childY, depth + 1, nodeLayouts);
    nextX += branchWidth + GAP_X;
  });
}

function readLayerIndexes(nodes: MindMapNodeLayout[]) {
  const indexes = new Map<string, number>();
  const nodesByDepth = new Map<number, MindMapNodeLayout[]>();
  for (const node of nodes) {
    if (node.depth === 0) {
      indexes.set(node.id, 0);
      continue;
    }
    nodesByDepth.set(node.depth, [...(nodesByDepth.get(node.depth) ?? []), node]);
  }

  for (const layerNodes of nodesByDepth.values()) {
    layerNodes
      .sort((left, right) => left.x - right.x)
      .forEach((node, index) => indexes.set(node.id, index + 1));
  }
  return indexes;
}

function subtreeWidth(tree: NotebookTree, nodeId: string): number {
  const children = childrenOf(tree, nodeId);
  if (children.length === 0) {
    return nodeId === tree.rootId ? ROOT_WIDTH : NODE_WIDTH;
  }
  return Math.max(
    nodeId === tree.rootId ? ROOT_WIDTH : NODE_WIDTH,
    children.reduce((sum, childId) => sum + subtreeWidth(tree, childId), 0) +
      GAP_X * (children.length - 1),
  );
}

function childrenOf(tree: NotebookTree, parentId: string) {
  return tree.edges
    .filter((edge) => edge.from === parentId)
    .sort((left, right) => {
      if (left.side !== right.side) {
        return left.side === "left" ? -1 : 1;
      }
      return left.order - right.order;
    })
    .map((edge) => edge.to);
}
