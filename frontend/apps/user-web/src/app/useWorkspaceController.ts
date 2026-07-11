import { FormEvent, useRef, useState } from "react";

import { AuthApi, NotebookEntry, NotebookNodeDetail, NotebookTree } from "@notesheep/api-client";

import { NodeCreateTarget, NodeDetailTarget } from "../MindMapCanvas";
import { messages } from "../messages";
import { EMPTY_TREE } from "./constants";
import { WorkspaceDialog } from "./types";
import { useWorkspaceDeleteController } from "./useWorkspaceDeleteController";
import { createWorkspaceDialogActions } from "./workspaceDialogActions";
import { createNodeFromForm } from "./workspaceNodeCreateActions";
import { placeTrayNode } from "./workspaceTrayActions";
import { useWorkspaceLoaders } from "./useWorkspaceLoaders";
import { saveTreeUpdate } from "./workspaceTreeActions";

export function useWorkspaceController(authApi: AuthApi, hasUser: boolean) {
  const [notebooks, setNotebooks] = useState<NotebookEntry[]>([]);
  const [selectedNotebookName, setSelectedNotebookName] = useState("");
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

  useWorkspaceLoaders({
    authApi,
    hasUser,
    onApplyNotebooks: applyNotebooks,
    onClearWorkspace: clearWorkspace,
    onTreeChange: setTree,
    selectedNotebookName,
  });

  function clearWorkspace() {
    setNotebooks([]);
    setSelectedNotebookName("");
    setTree(EMPTY_TREE);
    setNodeCreateTarget(null);
    setNewNodeTextContent("");
    setNewNodeImages([]);
    setNewNodeVoices([]);
    setNodeDetailTarget(null);
    setNodeDetail(null);
    setNodeDetailLoading(false);
    setWorkspaceDialog(null);
    nodeDetailRequestRef.current += 1;
  }

  function applyNotebooks(nextNotebooks: NotebookEntry[], preferredName?: string) {
    setNotebooks(nextNotebooks);
    const nextSelected =
      nextNotebooks.find((notebook) => notebook.name === preferredName)?.name ?? nextNotebooks[0]?.name ?? "";
    setSelectedNotebookName(nextSelected);
    if (!nextSelected) {
      setTree(EMPTY_TREE);
    }
  }

  async function reloadNotebooks(preferredName?: string) {
    const response = await authApi.listNotebooks();
    applyNotebooks(response.notebooks, preferredName);
  }

  async function handleCreateNotebook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorkspaceError("");
    const notebookName = newNotebookName.trim();
    if (!notebookName) {
      setWorkspaceError(messages.shell.notebookNameRequired);
      return;
    }

    setWorkspaceSubmitting(true);
    try {
      const response = await authApi.createNotebook({ name: notebookName });
      setNewNotebookName("");
      setWorkspaceDialog(null);
      await reloadNotebooks(response.notebook.name);
    } catch (caught) {
      setWorkspaceError(caught instanceof Error ? caught.message : messages.shell.notebookActionFailed);
    } finally {
      setWorkspaceSubmitting(false);
    }
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

  return {
    handleCreateNode,
    handleCreateNotebook,
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
