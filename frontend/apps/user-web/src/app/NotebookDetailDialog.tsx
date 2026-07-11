import { NodeDetailTarget } from "../MindMapCanvas";
import { messages } from "../messages";
import { WorkspaceDetailPanel } from "./WorkspaceDetailPanel";

type NotebookDetailDialogProps = {
  onClose: () => void;
  target: Extract<NodeDetailTarget, { kind: "notebook" }>;
};

export function NotebookDetailDialog({ onClose, target }: NotebookDetailDialogProps) {
  return (
    <WorkspaceDetailPanel onClose={onClose} title={messages.shell.notebookDetailTitle}>
      <dl className="detail-list">
        <div className="detail-row">
          <dt>{messages.shell.currentNotebook}</dt>
          <dd>{target.title}</dd>
        </div>
      </dl>
    </WorkspaceDetailPanel>
  );
}
