import { useEffect } from "react";

import { AuthApi, DeletedNotebookEntry, NotebookEntry, NotebookTree } from "@notesheep/api-client";

import { messages } from "../messages";
import { EMPTY_TREE } from "./constants";

type WorkspaceLoaderOptions = {
  authApi: AuthApi;
  hasUser: boolean;
  onApplyNotebooks: (notebooks: NotebookEntry[]) => void;
  onClearWorkspace: () => void;
  onDeletedNotebooksChange: (notebooks: DeletedNotebookEntry[]) => void;
  onWorkspaceError: (message: string) => void;
  onTreeChange: (tree: NotebookTree) => void;
  selectedNotebookName: string;
};

export function useWorkspaceLoaders({
  authApi,
  hasUser,
  onApplyNotebooks,
  onClearWorkspace,
  onDeletedNotebooksChange,
  onWorkspaceError,
  onTreeChange,
  selectedNotebookName,
}: WorkspaceLoaderOptions) {
  useEffect(() => {
    let cancelled = false;
    if (!hasUser) {
      onClearWorkspace();
      return () => {
        cancelled = true;
      };
    }

    authApi
      .listNotebooks()
      .then((response) => {
        if (!cancelled) {
          onWorkspaceError("");
          onApplyNotebooks(response.notebooks);
        }
      })
      .catch(() => {
        if (!cancelled) {
          onClearWorkspace();
          onWorkspaceError(messages.shell.notebookLoadFailed);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authApi, hasUser]);

  useEffect(() => {
    let cancelled = false;
    if (!hasUser) {
      onDeletedNotebooksChange([]);
      return () => {
        cancelled = true;
      };
    }

    authApi
      .listDeletedNotebooks()
      .then((response) => {
        if (!cancelled) {
          onDeletedNotebooksChange(response.notebooks);
        }
      })
      .catch(() => {
        if (!cancelled) {
          onDeletedNotebooksChange([]);
          onWorkspaceError(messages.shell.deletedNotebookLoadFailed);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authApi, hasUser]);

  useEffect(() => {
    let cancelled = false;
    if (!hasUser || !selectedNotebookName) {
      onTreeChange(EMPTY_TREE);
      return () => {
        cancelled = true;
      };
    }

    authApi
      .getNotebookTree(selectedNotebookName)
      .then((response) => {
        if (!cancelled) {
          onWorkspaceError("");
          onTreeChange(response.tree);
        }
      })
      .catch(() => {
        if (!cancelled) {
          onTreeChange(EMPTY_TREE);
          onWorkspaceError(messages.shell.notebookTreeLoadFailed);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authApi, hasUser, selectedNotebookName]);
}
