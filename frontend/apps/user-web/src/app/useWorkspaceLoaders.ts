import { useEffect } from "react";

import { AuthApi, NotebookEntry, NotebookTree } from "@notesheep/api-client";

import { EMPTY_TREE } from "./constants";

type WorkspaceLoaderOptions = {
  authApi: AuthApi;
  hasUser: boolean;
  onApplyNotebooks: (notebooks: NotebookEntry[]) => void;
  onClearWorkspace: () => void;
  onTreeChange: (tree: NotebookTree) => void;
  selectedNotebookName: string;
};

export function useWorkspaceLoaders({
  authApi,
  hasUser,
  onApplyNotebooks,
  onClearWorkspace,
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
          onApplyNotebooks(response.notebooks);
        }
      })
      .catch(() => {
        if (!cancelled) {
          onClearWorkspace();
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
          onTreeChange(response.tree);
        }
      })
      .catch(() => {
        if (!cancelled) {
          onTreeChange(EMPTY_TREE);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authApi, hasUser, selectedNotebookName]);
}
