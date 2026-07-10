import { NotebookTree, TreeEdge } from "@notesheep/api-client";

export const NOTEBOOK_ROOT_ID = "__notesheep_notebook_root__";

export type DropSide = "left" | "right";

export type TreeMoveResult = {
  error?: "cycle" | "missing-node" | "root-sibling" | "same-node";
  tree: NotebookTree;
};

export function normalizeNotebookTree(tree: NotebookTree): NotebookTree {
  const nodeIds = new Set(tree.nodes.map((node) => node.id));
  const validParentIds = new Set(nodeIds);
  if (tree.rootId) {
    validParentIds.add(tree.rootId);
  }
  const groupedEdges = new Map<string, TreeEdge[]>();
  for (const [index, edge] of tree.edges.entries()) {
    if (!validParentIds.has(edge.from) || !nodeIds.has(edge.to) || edge.to === tree.rootId) {
      continue;
    }
    const side = edge.side === "left" ? "left" : "right";
    const order = Number.isFinite(edge.order) && edge.order >= 0 ? edge.order : index;
    const key = edgeKey(edge.from, side);
    groupedEdges.set(key, [
      ...(groupedEdges.get(key) ?? []),
      { from: edge.from, to: edge.to, side, order },
    ]);
  }

  const normalizedEdges: TreeEdge[] = [];
  const parentIds = tree.rootId && !nodeIds.has(tree.rootId)
    ? [tree.rootId, ...tree.nodes.map((node) => node.id)]
    : tree.nodes.map((node) => node.id);
  for (const parentId of parentIds) {
    for (const side of ["left", "right"] as const) {
      const edges = groupedEdges.get(edgeKey(parentId, side)) ?? [];
      edges
        .sort((left, right) => left.order - right.order)
        .forEach((edge, order) => normalizedEdges.push({ ...edge, order }));
    }
  }

  return { ...tree, edges: normalizedEdges };
}

export function moveNodeAsChild(tree: NotebookTree, draggedId: string, targetId: string): TreeMoveResult {
  const normalizedTree = normalizeNotebookTree(tree);
  const validationError = validateMove(normalizedTree, draggedId, targetId);
  if (validationError) {
    return { tree: normalizedTree, error: validationError };
  }

  const targetSide = targetId === normalizedTree.rootId ? sideOfNode(normalizedTree, draggedId) : sideOfNode(normalizedTree, targetId);
  const edgesWithoutDragged = removeIncomingEdge(normalizedTree.edges, draggedId);
  const nextEdges = [
    ...edgesWithoutDragged,
    {
      from: targetId,
      to: draggedId,
      side: targetSide,
      order: nextOrder(edgesWithoutDragged, targetId, targetSide),
    },
  ];

  return {
    tree: normalizeNotebookTree({
      ...normalizedTree,
      edges: applySubtreeSide(nextEdges, draggedId, targetSide),
    }),
  };
}

export function moveNodeAsSibling(
  tree: NotebookTree,
  draggedId: string,
  targetId: string,
  side: DropSide,
): TreeMoveResult {
  const normalizedTree = normalizeNotebookTree(tree);
  if (targetId === normalizedTree.rootId) {
    return { tree: normalizedTree, error: "root-sibling" };
  }
  const validationError = validateMove(normalizedTree, draggedId, targetId);
  if (validationError) {
    return { tree: normalizedTree, error: validationError };
  }

  const targetEdge = normalizedTree.edges.find((edge) => edge.to === targetId);
  const parentId = targetId === normalizedTree.rootId ? normalizedTree.rootId : targetEdge?.from;
  if (!parentId) {
    return { tree: normalizedTree, error: "root-sibling" };
  }

  const edgesWithoutDragged = removeIncomingEdge(normalizedTree.edges, draggedId);
  const siblingEdges = edgesWithoutDragged
    .filter((edge) => edge.from === parentId && edge.side === side)
    .sort((left, right) => left.order - right.order);
  const targetIndex = siblingEdges.findIndex((edge) => edge.to === targetId);
  const insertIndex =
    targetIndex === -1 ? siblingEdges.length : side === "left" ? targetIndex : targetIndex + 1;

  const nextSiblingEdges = [
    ...siblingEdges.slice(0, insertIndex),
    { from: parentId, to: draggedId, side, order: insertIndex },
    ...siblingEdges.slice(insertIndex),
  ].map((edge, order) => ({ ...edge, order }));
  const nextSiblingIds = new Set(nextSiblingEdges.map((edge) => edge.to));
  const nextEdges = [
    ...edgesWithoutDragged.filter(
      (edge) => !(edge.from === parentId && edge.side === side && nextSiblingIds.has(edge.to)),
    ),
    ...nextSiblingEdges,
  ];

  return {
    tree: normalizeNotebookTree({
      ...normalizedTree,
      edges: applySubtreeSide(nextEdges, draggedId, side),
    }),
  };
}

export function descendantsOf(tree: NotebookTree, nodeId: string): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const edge of tree.edges) {
    childrenByParent.set(edge.from, [...(childrenByParent.get(edge.from) ?? []), edge.to]);
  }

  const descendants = new Set<string>();
  function visit(currentId: string) {
    for (const childId of childrenByParent.get(currentId) ?? []) {
      if (descendants.has(childId)) {
        continue;
      }
      descendants.add(childId);
      visit(childId);
    }
  }
  visit(nodeId);
  return descendants;
}

export function sideOfNode(tree: NotebookTree, nodeId: string): DropSide {
  const edge = tree.edges.find((item) => item.to === nodeId);
  return edge?.side === "left" ? "left" : "right";
}

function validateMove(
  tree: NotebookTree,
  draggedId: string,
  targetId: string,
): TreeMoveResult["error"] | null {
  if (draggedId === targetId) {
    return "same-node";
  }
  const hasDraggedNode = tree.nodes.some((node) => node.id === draggedId);
  const hasTargetNode = tree.nodes.some((node) => node.id === targetId) || targetId === tree.rootId;
  if (!hasDraggedNode || !hasTargetNode) {
    return "missing-node";
  }
  if (draggedId === tree.rootId) {
    return "root-sibling";
  }
  if (descendantsOf(tree, draggedId).has(targetId)) {
    return "cycle";
  }
  return null;
}

function removeIncomingEdge(edges: TreeEdge[], nodeId: string) {
  return edges.filter((edge) => edge.to !== nodeId);
}

function applySubtreeSide(edges: TreeEdge[], rootId: string, side: DropSide) {
  const descendantIds = descendantsOf({ rootId, nodes: [], edges } as NotebookTree, rootId);
  descendantIds.add(rootId);
  return edges.map((edge) => (descendantIds.has(edge.to) ? { ...edge, side } : edge));
}

function nextOrder(edges: TreeEdge[], parentId: string, side: DropSide) {
  return Math.max(-1, ...edges.filter((edge) => edge.from === parentId && edge.side === side).map((edge) => edge.order)) + 1;
}

function edgeKey(parentId: string, side: DropSide) {
  return `${parentId}:${side}`;
}
