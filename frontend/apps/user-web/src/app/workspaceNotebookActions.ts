import { FormEvent } from "react";

import { AuthApi, NotebookEntry } from "@notesheep/api-client";

import { messages } from "../messages";

type CreateNotebookContext = {
  applyNotebooks: (notebooks: NotebookEntry[], preferredName?: string) => void;
  authApi: AuthApi;
  event: FormEvent<HTMLFormElement>;
  newNotebookName: string;
  setNewNotebookName: (value: string) => void;
  setWorkspaceDialog: (value: null) => void;
  setWorkspaceError: (value: string) => void;
  setWorkspaceSubmitting: (value: boolean) => void;
};

export async function createNotebookFromForm(context: CreateNotebookContext) {
  context.event.preventDefault();
  context.setWorkspaceError("");
  const notebookName = context.newNotebookName.trim();
  if (!notebookName) {
    context.setWorkspaceError(messages.shell.notebookNameRequired);
    return;
  }

  context.setWorkspaceSubmitting(true);
  try {
    const created = await context.authApi.createNotebook({ name: notebookName });
    const response = await context.authApi.listNotebooks();
    context.setNewNotebookName("");
    context.setWorkspaceDialog(null);
    context.applyNotebooks(response.notebooks, created.notebook.name);
  } catch {
    context.setWorkspaceError(messages.shell.notebookActionFailed);
  } finally {
    context.setWorkspaceSubmitting(false);
  }
}
