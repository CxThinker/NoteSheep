import { ReactNode } from "react";

import { messages } from "../messages";

type WorkspaceDetailPanelProps = {
  children: ReactNode;
  className?: string;
  onClose: () => void;
  title: string;
};

export function WorkspaceDetailPanel({
  children,
  className = "",
  onClose,
  title,
}: WorkspaceDetailPanelProps) {
  return (
    <div className="modal-backdrop">
      <section
        aria-labelledby="workspace-dialog-title"
        aria-modal="true"
        className={`modal-panel ${className}`.trim()}
        role="dialog"
      >
        <div className="modal-header">
          <h2 id="workspace-dialog-title">{title}</h2>
          <button aria-label={messages.shell.closeDialog} className="icon-button" onClick={onClose} type="button">
            ×
          </button>
        </div>
        {children}
        <div className="detail-actions">
          <button className="primary-action" onClick={onClose} type="button">
            {messages.shell.closeDialog}
          </button>
        </div>
      </section>
    </div>
  );
}
