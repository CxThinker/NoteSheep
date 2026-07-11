import { FormEvent } from "react";

import { messages } from "../messages";
import { WorkspaceDialogPanel } from "./WorkspaceDialogPanel";

type NotebookDialogProps = {
  error: string;
  isSubmitting: boolean;
  name: string;
  onClose: () => void;
  onNameChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function NotebookDialog({
  error,
  isSubmitting,
  name,
  onClose,
  onNameChange,
  onSubmit,
}: NotebookDialogProps) {
  return (
    <WorkspaceDialogPanel
      error={error}
      isSubmitting={isSubmitting}
      onClose={onClose}
      onSubmit={onSubmit}
      submitLabel={messages.shell.createNotebook}
      title={messages.shell.createNotebookTitle}
    >
      <label>
        <span>{messages.shell.notebookName}</span>
        <input autoFocus name="notebook-name" onChange={(event) => onNameChange(event.target.value)} value={name} />
      </label>
    </WorkspaceDialogPanel>
  );
}
