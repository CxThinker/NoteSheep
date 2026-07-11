import { FormEvent, ReactNode } from "react";

import { messages } from "../messages";

type WorkspaceDialogPanelProps = {
  children: ReactNode;
  error: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitDisabled?: boolean;
  submitLabel: string;
  title: string;
};

export function WorkspaceDialogPanel({
  children,
  error,
  isSubmitting,
  onClose,
  onSubmit,
  submitDisabled = false,
  submitLabel,
  title,
}: WorkspaceDialogPanelProps) {
  return (
    <div className="modal-backdrop">
      <section aria-labelledby="workspace-dialog-title" aria-modal="true" className="modal-panel" role="dialog">
        <div className="modal-header">
          <h2 id="workspace-dialog-title">{title}</h2>
          <button aria-label={messages.shell.closeDialog} className="icon-button" onClick={onClose} type="button">
            ×
          </button>
        </div>
        <form className="dialog-form" onSubmit={onSubmit}>
          {children}
          {error ? <p className="form-error">{error}</p> : null}
          <div className="dialog-actions">
            <button className="text-action" onClick={onClose} type="button">
              {messages.shell.cancel}
            </button>
            <button className="primary-action" disabled={isSubmitting || submitDisabled} type="submit">
              {submitLabel}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
