import { AuthApi, DeletedNotebookEntry, NotebookEntry } from "@notesheep/api-client";

import {
  deleteNotebookFromSidebar,
  permanentDeleteNotebookFromTrash,
  restoreNotebookFromTrash,
} from "./workspaceNotebookLifecycleActions";

type NotebookLifecycleControllerContext = {
  applyNotebooks: (notebooks: NotebookEntry[], preferredName?: string) => void;
  authApi: AuthApi;
  selectedNotebookName: string;
  setDeletedNotebooks: (value: DeletedNotebookEntry[]) => void;
  setWorkspaceError: (value: string) => void;
  setWorkspaceSubmitting: (value: boolean) => void;
};

export function createNotebookLifecycleActions(context: NotebookLifecycleControllerContext) {
  return {
    onDeleteNotebook: (notebookName: string) => deleteNotebookFromSidebar(context, notebookName),
    onPermanentDeleteNotebook: (notebook: DeletedNotebookEntry) => permanentDeleteNotebookFromTrash(context, notebook),
    onRestoreNotebook: (notebook: DeletedNotebookEntry) => restoreNotebookFromTrash(context, notebook),
  };
}
