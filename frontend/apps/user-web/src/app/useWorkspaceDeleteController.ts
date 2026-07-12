import { useState } from "react";

import { AuthApi, NotebookTree } from "@notesheep/api-client";

import { WorkspaceDialog } from "./types";
import { permanentDeleteNode, softDeleteNode } from "./workspaceDeleteActions";

type DeleteControllerContext = {
  authApi: AuthApi;
  saveTree: (tree: NotebookTree) => Promise<boolean>;
  selectedNotebookName: string;
  setTree: (tree: NotebookTree) => void;
  setWorkspaceDialog: (value: WorkspaceDialog) => void;
  setWorkspaceError: (value: string) => void;
  setWorkspaceSubmitting: (value: boolean) => void;
  tree: NotebookTree;
};

export function useWorkspaceDeleteController({
  authApi,
  saveTree,
  selectedNotebookName,
  setTree,
  setWorkspaceDialog,
  setWorkspaceError,
  setWorkspaceSubmitting,
  tree,
}: DeleteControllerContext) {
  const [pendingDeleteNodeId, setPendingDeleteNodeId] = useState<string | null>(null);
  const [pendingPermanentDeleteNodeId, setPendingPermanentDeleteNodeId] = useState<string | null>(null);
  const pendingDeleteTarget = pendingDeleteNodeId
    ? {
      hasChildren: tree.edges.some((edge) => edge.from === pendingDeleteNodeId),
      node: tree.nodes.find((node) => node.id === pendingDeleteNodeId) ?? null,
    }
    : null;
  const pendingPermanentDeleteTarget = pendingPermanentDeleteNodeId
    ? { node: tree.nodes.find((node) => node.id === pendingPermanentDeleteNodeId) ?? null }
    : null;

  return {
    clearPendingDelete,
    onConfirmDeleteNodeOnly: () => confirmSoftDelete("node"),
    onConfirmPermanentDeleteNode: confirmPermanentDeleteNode,
    onConfirmDeleteSubtree: () => confirmSoftDelete("subtree"),
    onPermanentDeleteNode: handlePermanentDeleteNode,
    onSoftDeleteNode: openSoftDeleteDialog,
    pendingDeleteTarget,
    pendingPermanentDeleteTarget,
  };

  function clearPendingDelete() {
    setPendingDeleteNodeId(null);
    setPendingPermanentDeleteNodeId(null);
  }

  function openSoftDeleteDialog(nodeId: string) {
    if (!selectedNotebookName) {
      return;
    }
    setPendingDeleteNodeId(nodeId);
    setWorkspaceDialog("delete-node");
    setWorkspaceError("");
  }

  async function confirmSoftDelete(mode: "node" | "subtree") {
    if (!pendingDeleteNodeId) {
      return;
    }
    await softDeleteNode({
      mode,
      nodeId: pendingDeleteNodeId,
      saveTree,
      selectedNotebookName,
      setWorkspaceError,
      tree,
    });
    setPendingDeleteNodeId(null);
    setWorkspaceDialog(null);
  }

  function handlePermanentDeleteNode(nodeId: string) {
    if (!selectedNotebookName) {
      return;
    }
    setPendingPermanentDeleteNodeId(nodeId);
    setWorkspaceDialog("confirm-delete");
    setWorkspaceError("");
  }

  async function confirmPermanentDeleteNode() {
    if (!pendingPermanentDeleteNodeId) {
      return;
    }
    const deleted = await permanentDeleteNode({
      authApi,
      nodeId: pendingPermanentDeleteNodeId,
      selectedNotebookName,
      setTree,
      setWorkspaceError,
      setWorkspaceSubmitting,
    });
    if (deleted) {
      setPendingPermanentDeleteNodeId(null);
      setWorkspaceDialog(null);
    }
  }
}
