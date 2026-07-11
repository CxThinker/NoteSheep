import { useState } from "react";

import { DeletedNotebookEntry, NotebookEntry } from "@notesheep/api-client";

type NotebookCollectionOptions = {
  onEmptySelection: () => void;
};

export function useNotebookCollection({ onEmptySelection }: NotebookCollectionOptions) {
  const [notebooks, setNotebooks] = useState<NotebookEntry[]>([]);
  const [deletedNotebooks, setDeletedNotebooks] = useState<DeletedNotebookEntry[]>([]);
  const [selectedNotebookName, setSelectedNotebookName] = useState("");

  function clearNotebooks() {
    setNotebooks([]);
    setDeletedNotebooks([]);
    setSelectedNotebookName("");
    onEmptySelection();
  }

  function applyNotebooks(nextNotebooks: NotebookEntry[], preferredName?: string) {
    setNotebooks(nextNotebooks);
    const nextSelected =
      nextNotebooks.find((notebook) => notebook.name === preferredName)?.name ?? nextNotebooks[0]?.name ?? "";
    setSelectedNotebookName(nextSelected);
    if (!nextSelected) {
      onEmptySelection();
    }
  }

  return {
    applyNotebooks,
    clearNotebooks,
    deletedNotebooks,
    notebooks,
    selectedNotebookName,
    setDeletedNotebooks,
    setSelectedNotebookName,
  };
}
