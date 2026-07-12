import { useState } from "react";

import { AuthApi, DeletedNotebookEntry, NotebookEntry } from "@notesheep/api-client";

import {
  deleteNotebookFromSidebar,
  permanentDeleteNotebookFromTrash,
  restoreNotebookFromTrash,
} from "./workspaceNotebookLifecycleActions";
import { WorkspaceDialog } from "./types";

export type PendingNotebookDelete =
  | { kind: "delete"; notebookName: string }
  | { kind: "permanent"; notebook: DeletedNotebookEntry };

type NotebookLifecycleControllerContext = {
  applyNotebooks: (notebooks: NotebookEntry[], preferredName?: string) => void;
  authApi: AuthApi;
  selectedNotebookName: string;
  setDeletedNotebooks: (value: DeletedNotebookEntry[]) => void;
  setWorkspaceDialog: (value: WorkspaceDialog) => void;
  setWorkspaceError: (value: string) => void;
  setWorkspaceSubmitting: (value: boolean) => void;
};

export function useNotebookLifecycleController(context: NotebookLifecycleControllerContext) {
  const [pendingNotebookDelete, setPendingNotebookDelete] = useState<PendingNotebookDelete | null>(null);
  return {
    clearPendingNotebookDelete: () => setPendingNotebookDelete(null),
    onConfirmNotebookDelete: () => confirmNotebookDelete(context, pendingNotebookDelete, () => setPendingNotebookDelete(null)),
    onDeleteNotebook: (notebookName: string) => openNotebookDelete(context, { kind: "delete", notebookName }, setPendingNotebookDelete),
    onPermanentDeleteNotebook: (notebook: DeletedNotebookEntry) => openNotebookDelete(context, { kind: "permanent", notebook }, setPendingNotebookDelete),
    onRestoreNotebook: (notebook: DeletedNotebookEntry) => restoreNotebookFromTrash(context, notebook),
    pendingNotebookDelete,
  };
}

function openNotebookDelete(
  context: NotebookLifecycleControllerContext,
  pendingDelete: PendingNotebookDelete,
  setPendingNotebookDelete: (value: PendingNotebookDelete | null) => void,
) {
  setPendingNotebookDelete(pendingDelete);
  context.setWorkspaceDialog("confirm-delete");
  context.setWorkspaceError("");
}

async function confirmNotebookDelete(
  context: NotebookLifecycleControllerContext,
  pendingDelete: PendingNotebookDelete | null,
  clearPendingNotebookDelete: () => void,
) {
  if (!pendingDelete) {
    return;
  }
  const deleted =
    pendingDelete.kind === "delete"
      ? await deleteNotebookFromSidebar(context, pendingDelete.notebookName)
      : await permanentDeleteNotebookFromTrash(context, pendingDelete.notebook);
  if (deleted) {
    clearPendingNotebookDelete();
    context.setWorkspaceDialog(null);
  }
}
