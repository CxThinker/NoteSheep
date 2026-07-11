import { AuthApi, DeletedNotebookEntry, NotebookEntry } from "@notesheep/api-client";

import { formatMessage, messages } from "../messages";

type NotebookLifecycleContext = {
  applyNotebooks: (notebooks: NotebookEntry[], preferredName?: string) => void;
  authApi: AuthApi;
  selectedNotebookName: string;
  setDeletedNotebooks: (value: DeletedNotebookEntry[]) => void;
  setWorkspaceError: (value: string) => void;
  setWorkspaceSubmitting: (value: boolean) => void;
};

export async function deleteNotebookFromSidebar(context: NotebookLifecycleContext, notebookName: string) {
  const prompt = formatMessage(messages.shell.confirmDeleteNotebook, { notebookName });
  if (!window.confirm(prompt)) {
    return;
  }
  await runNotebookLifecycleAction(context, messages.shell.notebookDeleteFailed, async () => {
    await context.authApi.deleteNotebook(notebookName);
    await reloadNotebookCollections(context, context.selectedNotebookName === notebookName ? undefined : context.selectedNotebookName);
  });
}

export async function restoreNotebookFromTrash(context: NotebookLifecycleContext, notebook: DeletedNotebookEntry) {
  await runNotebookLifecycleAction(context, messages.shell.notebookRestoreFailed, async () => {
    const response = await context.authApi.restoreDeletedNotebook(notebook.id);
    await reloadNotebookCollections(context, response.notebook.name);
  });
}

export async function permanentDeleteNotebookFromTrash(context: NotebookLifecycleContext, notebook: DeletedNotebookEntry) {
  const prompt = formatMessage(messages.shell.confirmPermanentDeleteNotebook, { notebookName: notebook.name });
  if (!window.confirm(prompt)) {
    return;
  }
  await runNotebookLifecycleAction(context, messages.shell.notebookPermanentDeleteFailed, async () => {
    await context.authApi.permanentDeleteNotebook(notebook.id);
    await reloadNotebookCollections(context, context.selectedNotebookName);
  });
}

async function runNotebookLifecycleAction(
  context: NotebookLifecycleContext,
  failureMessage: string,
  action: () => Promise<void>,
) {
  context.setWorkspaceError("");
  context.setWorkspaceSubmitting(true);
  try {
    await action();
  } catch {
    context.setWorkspaceError(failureMessage);
  } finally {
    context.setWorkspaceSubmitting(false);
  }
}

async function reloadNotebookCollections(context: NotebookLifecycleContext, preferredName?: string) {
  const [activeResponse, deletedResponse] = await Promise.all([
    context.authApi.listNotebooks(),
    context.authApi.listDeletedNotebooks(),
  ]);
  context.applyNotebooks(activeResponse.notebooks, preferredName);
  context.setDeletedNotebooks(deletedResponse.notebooks);
}
