import { RefObject } from "react";

import { NotebookTree } from "@notesheep/api-client";

import { MindMapCanvas, NodeCreateTarget, NodeDetailTarget } from "../MindMapCanvas";
import { DropTarget } from "../mindMapCanvasTypes";
import { messages } from "../messages";
import { useCanvasPan } from "./useCanvasPan";

type WorkspaceCanvasProps = {
  isSubmitting: boolean;
  onOpenNodeDialog: (target?: NodeCreateTarget) => void;
  onOpenNodeDetail: (target: NodeDetailTarget) => void;
  onPlaceTrayNode: (nodeId: string, target: DropTarget) => void;
  onSoftDeleteNode: (nodeId: string) => void;
  onUpdateTree: (tree: NotebookTree) => Promise<boolean>;
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
  selectedNotebookName,
  selectedTrayNodeId,
  trayDropTarget,
  tree,
  treeBoardRef,
  workspaceDialogOpen,
  workspaceError,
  workspaceZoom,
}: WorkspaceCanvasProps) {
  const canvasPan = useCanvasPan(treeBoardRef);
  return (
    <section className="notebook-canvas" aria-label={messages.shell.notebookTree}>
      <div
        aria-label={messages.shell.treeBoard}
        className="tree-board"
        data-panning={canvasPan.isPanning}
        ref={treeBoardRef}
        {...canvasPan.handlers}
      >
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
