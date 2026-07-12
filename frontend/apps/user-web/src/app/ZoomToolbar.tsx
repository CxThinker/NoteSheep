import { messages } from "../messages";
import { formatZoom, WORKSPACE_ZOOM_STEP } from "./useWorkspaceZoom";

type ZoomToolbarProps = {
  onZoom: (delta: number) => void;
  onZoomReset: () => void;
  workspaceZoom: number;
};

export function ZoomToolbar({ onZoom, onZoomReset, workspaceZoom }: ZoomToolbarProps) {
  return (
    <div aria-label={messages.shell.zoomControls} className="zoom-toolbar">
      <button aria-label={messages.shell.zoomOut} className="zoom-button" disabled={workspaceZoom <= 0.5} onClick={() => onZoom(-WORKSPACE_ZOOM_STEP)} type="button">
        -
      </button>
      <span aria-label={messages.shell.currentZoom} className="zoom-value">{formatZoom(workspaceZoom)}</span>
      <button aria-label={messages.shell.zoomIn} className="zoom-button" disabled={workspaceZoom >= 2} onClick={() => onZoom(WORKSPACE_ZOOM_STEP)} type="button">
        +
      </button>
      <button aria-label={messages.shell.resetZoom} className="zoom-reset" disabled={workspaceZoom === 1} onClick={onZoomReset} type="button">
        100%
      </button>
    </div>
  );
}
