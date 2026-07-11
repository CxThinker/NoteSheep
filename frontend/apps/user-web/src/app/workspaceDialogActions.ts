import { AuthApi, NotebookNodeDetail } from "@notesheep/api-client";

import { NodeCreateTarget, NodeDetailTarget } from "../MindMapCanvas";
import { messages } from "../messages";
import { NOTEBOOK_ROOT_ID } from "../mindMapTree";
import { WorkspaceDialog } from "./types";

type DialogActionContext = {
  authApi: AuthApi;
  nodeDetailRequestRef: { current: number };
  selectedNotebookName: string;
  setNewNodeImages: (value: File[]) => void;
  setNewNodeTextContent: (value: string) => void;
  setNewNodeTitle: (value: string) => void;
  setNewNodeVoices: (value: File[]) => void;
  setNewNotebookName: (value: string) => void;
  setNodeCreateTarget: (value: NodeCreateTarget | null) => void;
  setNodeDetail: (value: NotebookNodeDetail | null) => void;
  setNodeDetailLoading: (value: boolean) => void;
  setNodeDetailTarget: (value: NodeDetailTarget | null) => void;
  setSelectedNotebookName: (value: string) => void;
  setWorkspaceDialog: (value: WorkspaceDialog) => void;
  setWorkspaceError: (value: string) => void;
};

export function createWorkspaceDialogActions(context: DialogActionContext) {
  return {
    onCloseDialog: () => closeDialog(context),
    onOpenNodeDetail: (target: NodeDetailTarget) => openNodeDetail(context, target),
    onOpenNodeDialog: (target: NodeCreateTarget = { kind: "child", parentId: NOTEBOOK_ROOT_ID }) =>
      openNodeDialog(context, target),
    onOpenNotebookDialog: () => openNotebookDialog(context),
    onSelectNotebook: (name: string) => selectNotebook(context, name),
  };
}

function closeDialog(context: DialogActionContext) {
  context.setWorkspaceDialog(null);
  context.setWorkspaceError("");
  context.setNodeDetailTarget(null);
  context.setNodeDetail(null);
  context.setNodeDetailLoading(false);
  context.setNewNodeTextContent("");
  context.setNewNodeImages([]);
  context.setNewNodeVoices([]);
  context.nodeDetailRequestRef.current += 1;
}

function openNodeDialog(context: DialogActionContext, target: NodeCreateTarget) {
  context.setNewNodeTitle("");
  context.setNewNodeTextContent("");
  context.setNewNodeImages([]);
  context.setNewNodeVoices([]);
  context.setNodeCreateTarget(target);
  context.setNodeDetailTarget(null);
  context.setNodeDetail(null);
  context.setNodeDetailLoading(false);
  context.nodeDetailRequestRef.current += 1;
  context.setWorkspaceDialog("node");
  context.setWorkspaceError("");
}

function openNotebookDialog(context: DialogActionContext) {
  context.setNewNotebookName("");
  context.setNodeDetailTarget(null);
  context.setNodeDetail(null);
  context.setNodeDetailLoading(false);
  context.nodeDetailRequestRef.current += 1;
  context.setWorkspaceDialog("notebook");
  context.setWorkspaceError("");
}

function selectNotebook(context: DialogActionContext, name: string) {
  context.setSelectedNotebookName(name);
  context.setNodeCreateTarget(null);
  context.setNodeDetailTarget(null);
  context.setNodeDetail(null);
  context.setNodeDetailLoading(false);
  context.nodeDetailRequestRef.current += 1;
  context.setWorkspaceError("");
}

function openNodeDetail(context: DialogActionContext, target: NodeDetailTarget) {
  context.setNodeDetailTarget(target);
  context.setWorkspaceDialog(target.kind === "notebook" ? "notebook-detail" : "node-detail");
  context.setWorkspaceError("");
  context.setNodeDetail(null);
  const requestId = context.nodeDetailRequestRef.current + 1;
  context.nodeDetailRequestRef.current = requestId;
  loadNodeDetail(context, target, requestId);
}

function loadNodeDetail(context: DialogActionContext, target: NodeDetailTarget, requestId: number) {
  if (target.kind !== "node") {
    context.setNodeDetailLoading(false);
    return;
  }
  if (!context.selectedNotebookName) {
    context.setNodeDetailLoading(false);
    context.setWorkspaceError(messages.shell.nodeDetailLoadFailed);
    return;
  }
  context.setNodeDetailLoading(true);
  context.authApi
    .getNodeDetail(context.selectedNotebookName, target.node.id)
    .then((response) => {
      if (context.nodeDetailRequestRef.current === requestId) {
        context.setNodeDetail(response.detail);
      }
    })
    .catch((caught) => {
      if (context.nodeDetailRequestRef.current === requestId) {
        context.setWorkspaceError(caught instanceof Error ? caught.message : messages.shell.nodeDetailLoadFailed);
      }
    })
    .finally(() => {
      if (context.nodeDetailRequestRef.current === requestId) {
        context.setNodeDetailLoading(false);
      }
    });
}
