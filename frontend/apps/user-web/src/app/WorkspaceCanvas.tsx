import { RefObject } from "react";

import { NotebookTree } from "@notesheep/api-client";

import { MindMapCanvas, NodeCreateTarget, NodeDetailTarget } from "../MindMapCanvas";
import { DropTarget } from "../mindMapCanvasTypes";
import { messages } from "../messages";
import { formatZoom, WORKSPACE_ZOOM_STEP } from "./useWorkspaceZoom";

type WorkspaceCanvasProps = {
  isSubmitting: boolean;
  onOpenNodeDialog: (target?: NodeCreateTarget) => void;
  onOpenNodeDetail: (target: NodeDetailTarget) => void;
  onPlaceTrayNode: (nodeId: string, target: DropTarget) => void;
  onSoftDeleteNode: (nodeId: string) => void;
  onUpdateTree: (tree: NotebookTree) => Promise<boolean>;
  onZoom: (delta: number) => void;
  onZoomReset: () => void;
  selectedNotebookName: string;
  selectedTrayNodeId: string | null;
  trayDropTarget: DropTarget | null;
  tree: NotebookTree;
  treeBoardRef: RefObject<HTMLDivElement | null>;
  workspaceDialogOpen: boolean;
  workspaceError: string;
  workspaceZoom: number;
};

export function WorkspaceCanvas({
  isSubmitting,
  onOpenNodeDialog,
  onOpenNodeDetail,
  onPlaceTrayNode,
  onSoftDeleteNode,
  onUpdateTree,
  onZoom,
  onZoomReset,
  selectedNotebookName,
  selectedTrayNodeId,
  trayDropTarget,
  tree,
  treeBoardRef,
  workspaceDialogOpen,
  workspaceError,
  workspaceZoom,
}: WorkspaceCanvasProps) {
  return (
    <section className="notebook-canvas" aria-label={messages.shell.notebookTree}>
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
      <div aria-label={messages.shell.treeBoard} className="tree-board" ref={treeBoardRef}>
        {!selectedNotebookName ? (
          <>
            {!workspaceDialogOpen && workspaceError ? <p className="form-error workspace-error">{workspaceError}</p> : null}
            <p className="empty-state">{messages.shell.chooseNotebook}</p>
          </>
        ) : (
          <MindMapCanvas
            disabled={isSubmitting}
            error={workspaceDialogOpen ? "" : workspaceError}
            onCreateNodeAt={onOpenNodeDialog}
            onDeleteNode={onSoftDeleteNode}
            onOpenNodeDetail={onOpenNodeDetail}
            onPlaceTrayNode={onPlaceTrayNode}
            onTreeChange={onUpdateTree}
            rootTitle={selectedNotebookName}
            selectedTrayNodeId={selectedTrayNodeId}
            trayDropTarget={trayDropTarget}
            tree={tree}
            zoom={workspaceZoom}
          />
        )}
      </div>
      <button
        aria-label={messages.shell.createNode}
        className="node-fab"
        disabled={!selectedNotebookName}
        onClick={() => onOpenNodeDialog()}
        type="button"
      >
        ✎
      </button>
    </section>
  );
}
