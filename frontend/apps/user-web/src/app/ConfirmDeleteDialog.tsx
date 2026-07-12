import { messages } from "../messages";

type ConfirmDeleteDialogProps = {
  confirmLabel: string;
  error: string;
  isSubmitting: boolean;
  itemName: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
};

export function ConfirmDeleteDialog({
  confirmLabel,
  error,
  isSubmitting,
  itemName,
  message,
  onCancel,
  onConfirm,
  title,
}: ConfirmDeleteDialogProps) {
  return (
    <div className="modal-backdrop">
      <section aria-labelledby="confirm-delete-dialog-title" aria-modal="true" className="modal-panel" role="dialog">
        <div className="modal-header">
          <h2 id="confirm-delete-dialog-title">{title}</h2>
          <button aria-label={messages.shell.closeDialog} className="icon-button" onClick={onCancel} type="button">
            x
          </button>
        </div>
        <p className="delete-dialog-message">{message}</p>
        <p className="delete-dialog-node">{itemName}</p>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="delete-dialog-actions">
          <button className="text-action" disabled={isSubmitting} onClick={onCancel} type="button">
            {messages.shell.cancel}
          </button>
          <button className="primary-action" disabled={isSubmitting} onClick={onConfirm} type="button">
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
