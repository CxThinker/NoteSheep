import { AuthApi, NotebookTree } from "@notesheep/api-client";

import { NodeCreateTarget } from "../MindMapCanvas";
import { messages } from "../messages";
import { moveNodeAsSibling } from "../mindMapTree";

export async function treeAfterNodeCreate({
  authApi,
  nodeId,
  selectedNotebookName,
  target,
  tree,
}: {
  authApi: AuthApi;
  nodeId: string;
  selectedNotebookName: string;
  target: NodeCreateTarget;
  tree: NotebookTree;
}) {
  if (target.kind !== "sibling") {
    return tree;
  }
  const result = moveNodeAsSibling(tree, nodeId, target.targetId, target.side);
  if (result.error) {
    throw new Error(messages.shell.nodeActionFailed);
  }
  return (await authApi.updateNotebookTree(selectedNotebookName, result.tree)).tree;
}

export async function saveTreeUpdate({
  authApi,
  nextTree,
  previousTree,
  selectedNotebookName,
  setTree,
  setWorkspaceError,
  setWorkspaceSubmitting,
}: {
  authApi: AuthApi;
  nextTree: NotebookTree;
  previousTree: NotebookTree;
  selectedNotebookName: string;
  setTree: (tree: NotebookTree) => void;
  setWorkspaceError: (value: string) => void;
  setWorkspaceSubmitting: (value: boolean) => void;
}) {
  if (!selectedNotebookName) {
    return false;
  }

  const notebookName = selectedNotebookName;
  setTree(nextTree);
  setWorkspaceError("");
  setWorkspaceSubmitting(true);
  try {
    const response = await authApi.updateNotebookTree(notebookName, nextTree);
    setTree(response.tree);
    return true;
  } catch (caught) {
    setTree(previousTree);
    setWorkspaceError(caught instanceof Error ? caught.message : messages.shell.treeUpdateFailed);
    return false;
  } finally {
    setWorkspaceSubmitting(false);
  }
}

export function findParentId(tree: NotebookTree, nodeId: string) {
  return tree.edges.find((edge) => edge.to === nodeId)?.from ?? null;
}
