import { FormEvent, useRef, useState } from "react";

import { AuthApi, NotebookNodeDetail, NotebookTree } from "@notesheep/api-client";
import { NodeCreateTarget, NodeDetailTarget } from "../MindMapCanvas";
import { EMPTY_TREE } from "./constants";
import { WorkspaceDialog } from "./types";
import { useNotebookCollection } from "./useNotebookCollection";
import { useWorkspaceDeleteController } from "./useWorkspaceDeleteController";
import { createWorkspaceDialogActions } from "./workspaceDialogActions";
import { createNotebookFromForm } from "./workspaceNotebookActions";
import { createNotebookLifecycleActions } from "./workspaceNotebookLifecycleController";
import { createNodeFromForm } from "./workspaceNodeCreateActions";
import { placeTrayNode } from "./workspaceTrayActions";
import { useWorkspaceLoaders } from "./useWorkspaceLoaders";
import { saveTreeUpdate } from "./workspaceTreeActions";
export function useWorkspaceController(authApi: AuthApi, hasUser: boolean) {
  const [newNotebookName, setNewNotebookName] = useState("");
  const [tree, setTree] = useState<NotebookTree>(EMPTY_TREE);
  const [newNodeTitle, setNewNodeTitle] = useState("");
  const [newNodeTextContent, setNewNodeTextContent] = useState("");
  const [newNodeImages, setNewNodeImages] = useState<File[]>([]);
  const [newNodeVoices, setNewNodeVoices] = useState<File[]>([]);
  const [nodeCreateTarget, setNodeCreateTarget] = useState<NodeCreateTarget | null>(null);
  const [nodeDetailTarget, setNodeDetailTarget] = useState<NodeDetailTarget | null>(null);
  const [nodeDetail, setNodeDetail] = useState<NotebookNodeDetail | null>(null);
  const [isNodeDetailLoading, setNodeDetailLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");
  const [isWorkspaceSubmitting, setWorkspaceSubmitting] = useState(false);
  const [workspaceDialog, setWorkspaceDialog] = useState<WorkspaceDialog>(null);
  const nodeDetailRequestRef = useRef(0);
  const {
    applyNotebooks,
    clearNotebooks,
    deletedNotebooks,
    notebooks,
    selectedNotebookName,
    setDeletedNotebooks,
    setSelectedNotebookName,
  } = useNotebookCollection({ onEmptySelection: () => setTree(EMPTY_TREE) });

  useWorkspaceLoaders({
    authApi,
    hasUser,
    onApplyNotebooks: applyNotebooks,
    onClearWorkspace: clearWorkspace,
    onDeletedNotebooksChange: setDeletedNotebooks,
    onWorkspaceError: setWorkspaceError,
    onTreeChange: setTree,
    selectedNotebookName,
  });
  function clearWorkspace() {
    clearNotebooks();
    setNodeCreateTarget(null);
    setNewNodeTextContent("");
    setNewNodeImages([]);
    setNewNodeVoices([]);
    setNodeDetailTarget(null);
    setNodeDetail(null);
    setNodeDetailLoading(false);
    setWorkspaceDialog(null);
    setWorkspaceError("");
    nodeDetailRequestRef.current += 1;
  }
  async function handleCreateNotebook(event: FormEvent<HTMLFormElement>) {
    await createNotebookFromForm({
      applyNotebooks,
      authApi,
      event,
      newNotebookName,
      setNewNotebookName,
      setWorkspaceDialog,
      setWorkspaceError,
      setWorkspaceSubmitting,
    });
  }
  async function handleCreateNode(event: FormEvent<HTMLFormElement>) {
    await createNodeFromForm({
      authApi,
      event,
      newNodeImages,
      newNodeTextContent,
      newNodeTitle,
      newNodeVoices,
      nodeCreateTarget,
      resetNodeForm,
      selectedNotebookName,
      setTree,
      setWorkspaceDialog,
      setWorkspaceError,
      setWorkspaceSubmitting,
      tree,
    });
  }

  function resetNodeForm() {
    setNewNodeTitle("");
    setNewNodeTextContent("");
    setNewNodeImages([]);
    setNewNodeVoices([]);
    setNodeCreateTarget(null);
  }

  const deleteActions = useWorkspaceDeleteController({
    authApi,
    saveTree: handleUpdateTree,
    selectedNotebookName,
    setTree,
    setWorkspaceDialog,
    setWorkspaceError,
    setWorkspaceSubmitting,
    tree,
  });

  const dialogActions = createWorkspaceDialogActions({
    authApi,
    clearPendingDelete: deleteActions.clearPendingDelete,
    nodeDetailRequestRef,
    selectedNotebookName,
    setNewNodeImages,
    setNewNodeTextContent,
    setNewNodeTitle,
    setNewNodeVoices,
    setNewNotebookName,
    setNodeCreateTarget,
    setNodeDetail,
    setNodeDetailLoading,
    setNodeDetailTarget,
    setSelectedNotebookName,
    setWorkspaceDialog,
    setWorkspaceError,
  });
  const notebookLifecycleActions = createNotebookLifecycleActions({
    applyNotebooks,
    authApi,
    selectedNotebookName,
    setDeletedNotebooks,
    setWorkspaceError,
    setWorkspaceSubmitting,
  });

  return {
    handleCreateNode,
    handleCreateNotebook,
    deletedNotebooks,
    isNodeDetailLoading,
    isWorkspaceSubmitting,
    newNodeImages,
    newNodeTextContent,
    newNodeTitle,
    newNodeVoices,
    newNotebookName,
    nodeCreateTarget,
    nodeDetail,
    nodeDetailTarget,
    notebooks,
    ...dialogActions,
    onConfirmDeleteNodeOnly: deleteActions.onConfirmDeleteNodeOnly,
    onConfirmDeleteSubtree: deleteActions.onConfirmDeleteSubtree,
    ...notebookLifecycleActions,
    onPermanentDeleteNode: deleteActions.onPermanentDeleteNode,
    onPlaceTrayNode: handlePlaceTrayNode,
    onSoftDeleteNode: deleteActions.onSoftDeleteNode,
    onUpdateTree: handleUpdateTree,
    pendingDeleteTarget: deleteActions.pendingDeleteTarget,
    selectedNotebookName,
    setNewNodeImages,
    setNewNodeTextContent,
    setNewNodeTitle,
    setNewNodeVoices,
    setNewNotebookName,
    tree,
    workspaceDialog,
    workspaceError,
  };

  async function handleUpdateTree(nextTree: NotebookTree) {
    return saveTreeUpdate({
      authApi,
      nextTree,
      previousTree: tree,
      selectedNotebookName,
      setTree,
      setWorkspaceError,
      setWorkspaceSubmitting,
    });
  }

  async function handlePlaceTrayNode(nodeId: string, target: Parameters<typeof placeTrayNode>[0]["target"]) {
    await placeTrayNode({
      nodeId,
      saveTree: handleUpdateTree,
      setWorkspaceError,
      target,
      tree,
    });
  }

}
