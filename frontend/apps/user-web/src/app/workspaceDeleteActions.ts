import { AuthApi, NotebookTree } from "@notesheep/api-client";

import { messages } from "../messages";
import { NOTEBOOK_ROOT_ID } from "../mindMapTree";
import { deleteNodeOnly, deleteSubtree } from "../mindMapTreeStates";

type SoftDeleteContext = {
  mode: "node" | "subtree";
  nodeId: string;
  saveTree: (tree: NotebookTree) => Promise<boolean>;
  selectedNotebookName: string;
  setWorkspaceError: (value: string) => void;
  tree: NotebookTree;
};

type PermanentDeleteContext = {
  authApi: AuthApi;
  nodeId: string;
  selectedNotebookName: string;
  setTree: (tree: NotebookTree) => void;
  setWorkspaceError: (value: string) => void;
  setWorkspaceSubmitting: (value: boolean) => void;
};

export async function softDeleteNode({
  mode,
  nodeId,
  saveTree,
  selectedNotebookName,
  setWorkspaceError,
  tree,
}: SoftDeleteContext) {
  if (!selectedNotebookName || nodeId === NOTEBOOK_ROOT_ID) {
    return;
  }
  const result = mode === "subtree" ? deleteSubtree(tree, nodeId) : deleteNodeOnly(tree, nodeId);
  if (result.error) {
    setWorkspaceError(messages.shell.treeMoveRejected);
    return;
  }
  await saveTree(result.tree);
}

export async function permanentDeleteNode({
  authApi,
  nodeId,
  selectedNotebookName,
  setTree,
  setWorkspaceError,
  setWorkspaceSubmitting,
}: PermanentDeleteContext) {
  if (!selectedNotebookName || !window.confirm(messages.shell.confirmPermanentDelete)) {
    return;
  }
  setWorkspaceSubmitting(true);
  setWorkspaceError("");
  try {
    const response = await authApi.deleteNode(selectedNotebookName, nodeId);
    setTree(response.tree);
  } catch (caught) {
    setWorkspaceError(caught instanceof Error ? caught.message : messages.shell.nodeActionFailed);
  } finally {
    setWorkspaceSubmitting(false);
  }
}
