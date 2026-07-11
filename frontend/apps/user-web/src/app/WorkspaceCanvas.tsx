import { RefObject } from "react";

import { NotebookTree } from "@notesheep/api-client";

import { MindMapCanvas, NodeCreateTarget, NodeDetailTarget } from "../MindMapCanvas";
import { messages } from "../messages";
import { NOTEBOOK_ROOT_ID } from "../mindMapTree";
import { formatZoom, WORKSPACE_ZOOM_STEP } from "./useWorkspaceZoom";

type WorkspaceCanvasProps = {
  isSubmitting: boolean;
  onOpenNodeDialog: (target?: NodeCreateTarget) => void;
  onOpenNodeDetail: (target: NodeDetailTarget) => void;
  onUpdateTree: (tree: NotebookTree) => Promise<boolean>;
  onZoom: (delta: number) => void;
  onZoomReset: () => void;
  selectedNotebookName: string;
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
  onUpdateTree,
  onZoom,
  onZoomReset,
  selectedNotebookName,
  tree,
  treeBoardRef,
  workspaceDialogOpen,
  workspaceError,
  workspaceZoom,
}: WorkspaceCanvasProps) {
  return (
    <section className="notebook-canvas" aria-label="笔记本树状图">
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
          <p className="empty-state">{messages.shell.chooseNotebook}</p>
        ) : (
          <MindMapCanvas
            disabled={isSubmitting}
            error={workspaceDialogOpen ? "" : workspaceError}
            onCreateNodeAt={onOpenNodeDialog}
            onOpenNodeDetail={onOpenNodeDetail}
            onTreeChange={onUpdateTree}
            rootTitle={selectedNotebookName}
            tree={tree}
            zoom={workspaceZoom}
          />
        )}
      </div>
      <button
        aria-label={messages.shell.createNode}
        className="node-fab"
        disabled={!selectedNotebookName}
        onClick={() => onOpenNodeDialog({ kind: "child", parentId: NOTEBOOK_ROOT_ID })}
        type="button"
      >
        ✎
      </button>
    </section>
  );
}
