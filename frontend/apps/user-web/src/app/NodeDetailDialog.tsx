import { NotebookNodeDetail } from "@notesheep/api-client";

import { NodeDetailTarget } from "../MindMapCanvas";
import { messages } from "../messages";
import { NodeDetailView } from "./NodeDetailView";
import { WorkspaceDetailPanel } from "./WorkspaceDetailPanel";

type NodeDetailDialogProps = {
  detail: NotebookNodeDetail | null;
  error: string;
  isLoading: boolean;
  isPathVisible: boolean;
  onClose: () => void;
  target: Extract<NodeDetailTarget, { kind: "node" }>;
};

export function NodeDetailDialog({
  detail,
  error,
  isLoading,
  isPathVisible,
  onClose,
  target,
}: NodeDetailDialogProps) {
  return (
    <WorkspaceDetailPanel className="node-detail-panel" onClose={onClose} title={messages.shell.nodeDetailTitle}>
      <NodeDetailView detail={detail} error={error} isLoading={isLoading} isPathVisible={isPathVisible} target={target} />
    </WorkspaceDetailPanel>
  );
}
