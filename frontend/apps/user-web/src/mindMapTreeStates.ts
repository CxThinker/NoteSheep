import { NotebookTree, TreeEdge } from "@notesheep/api-client";

import { DropSide, descendantsOf, moveNodeAsChild, moveNodeAsSibling, normalizeNotebookTree } from "./mindMapTree";

type StateResult = {
  deletedIds?: string[];
  error?: "missing-node" | "root-sibling" | "same-node" | "cycle";
  tree: NotebookTree;
};

export function moveTrayNodeAsChild(tree: NotebookTree, nodeId: string, targetId: string): StateResult {
  return moveNodeAsChild(removeFromTrays(tree, nodeId), nodeId, targetId);
}

export function moveTrayNodeAsSibling(
  tree: NotebookTree,
  nodeId: string,
  targetId: string,
  side: DropSide,
): StateResult {
  return moveNodeAsSibling(removeFromTrays(tree, nodeId), nodeId, targetId, side);
}

export function deleteSubtree(tree: NotebookTree, nodeId: string): StateResult {
  if (!tree.nodes.some((node) => node.id === nodeId)) {
    return { tree, error: "missing-node" };
  }
  const deletedIds = [nodeId, ...descendantsOf(tree, nodeId)];
  return {
    deletedIds,
    tree: normalizeNotebookTree({
      ...tree,
      edges: tree.edges.filter((edge) => !deletedIds.includes(edge.from) && !deletedIds.includes(edge.to)),
      freeNodeIds: (tree.freeNodeIds ?? []).filter((id) => !deletedIds.includes(id)),
      deletedNodeIds: appendUnique(tree.deletedNodeIds ?? [], deletedIds),
    }),
  };
}

export function deleteNodeOnly(tree: NotebookTree, nodeId: string): StateResult {
  const incoming = tree.edges.find((edge) => edge.to === nodeId);
  if (!incoming || !tree.nodes.some((node) => node.id === nodeId)) {
    return { tree, error: "missing-node" };
  }
  const childEdges = tree.edges
    .filter((edge) => edge.from === nodeId)
    .sort((left, right) => left.order - right.order);
  const siblings = tree.edges
    .filter((edge) => edge.from === incoming.from && edge.side === incoming.side && edge.to !== nodeId)
    .sort((left, right) => left.order - right.order);
  const promoted = childEdges.map<TreeEdge>((edge, index) => ({
    from: incoming.from,
    to: edge.to,
    side: incoming.side,
    order: incoming.order + index,
  }));
  const nextSiblings = [...siblings.slice(0, incoming.order), ...promoted, ...siblings.slice(incoming.order)];
  const nextSiblingIds = new Set(nextSiblings.map((edge) => edge.to));
  return {
    deletedIds: [nodeId],
    tree: normalizeNotebookTree({
      ...tree,
      edges: [
        ...tree.edges.filter(
          (edge) => edge.from !== nodeId && edge.to !== nodeId && !(edge.from === incoming.from && nextSiblingIds.has(edge.to)),
        ),
        ...nextSiblings.map((edge, order) => ({ ...edge, order })),
      ],
      freeNodeIds: (tree.freeNodeIds ?? []).filter((id) => id !== nodeId),
      deletedNodeIds: appendUnique(tree.deletedNodeIds ?? [], [nodeId]),
    }),
  };
}

function removeFromTrays(tree: NotebookTree, nodeId: string): NotebookTree {
  return {
    ...tree,
    freeNodeIds: (tree.freeNodeIds ?? []).filter((id) => id !== nodeId),
    deletedNodeIds: (tree.deletedNodeIds ?? []).filter((id) => id !== nodeId),
  };
}

function appendUnique(current: string[], next: string[]) {
  return [...current, ...next.filter((id) => !current.includes(id))];
}
