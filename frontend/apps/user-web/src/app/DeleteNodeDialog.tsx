import { messages } from "../messages";

type DeleteNodeDialogProps = {
  hasChildren: boolean;
  isSubmitting: boolean;
  nodeTitle: string;
  onCancel: () => void;
  onDeleteNodeOnly: () => void;
  onDeleteSubtree: () => void;
};

export function DeleteNodeDialog({
  hasChildren,
  isSubmitting,
  nodeTitle,
  onCancel,
  onDeleteNodeOnly,
  onDeleteSubtree,
}: DeleteNodeDialogProps) {
  return (
    <div className="modal-backdrop">
      <section aria-labelledby="delete-node-dialog-title" aria-modal="true" className="modal-panel" role="dialog">
        <div className="modal-header">
          <h2 id="delete-node-dialog-title">{messages.shell.deleteNode}</h2>
          <button aria-label={messages.shell.closeDialog} className="icon-button" onClick={onCancel} type="button">
            x
          </button>
        </div>
        <p className="delete-dialog-message">
          {hasChildren ? messages.shell.confirmDeleteSubtree : messages.shell.confirmDeleteLeaf}
        </p>
        <p className="delete-dialog-node">{nodeTitle}</p>
        <div className="delete-dialog-actions">
          <button className="text-action" disabled={isSubmitting} onClick={onCancel} type="button">
            {messages.shell.cancel}
          </button>
          {hasChildren ? (
            <button className="text-action" disabled={isSubmitting} onClick={onDeleteNodeOnly} type="button">
              {messages.shell.deleteNodeOnly}
            </button>
          ) : null}
          <button className="primary-action" disabled={isSubmitting} onClick={hasChildren ? onDeleteSubtree : onDeleteNodeOnly} type="button">
            {hasChildren ? messages.shell.deleteSubtree : messages.shell.moveToDeletedNodes}
          </button>
        </div>
      </section>
    </div>
  );
}
