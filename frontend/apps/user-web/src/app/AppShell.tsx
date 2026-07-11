import { useEffect, useState } from "react";

import { AuthUser } from "@notesheep/api-client";

import { messages } from "../messages";
import { NotebookDetailDialog } from "./NotebookDetailDialog";
import { NotebookDialog } from "./NotebookDialog";
import { NotebookSidebar } from "./NotebookSidebar";
import { NodeDetailDialog } from "./NodeDetailDialog";
import { NodeDialog } from "./NodeDialog";
import { useNotebookScrollbar } from "./useNotebookScrollbar";
import { useWorkspaceController } from "./useWorkspaceController";
import { useWorkspaceZoom } from "./useWorkspaceZoom";
import { WorkspaceCanvas } from "./WorkspaceCanvas";

type AppShellProps = ReturnType<typeof useWorkspaceController> & {
  onLogout: () => void;
  user: AuthUser;
};

export function AppShell({
  handleCreateNode,
  handleCreateNotebook,
  isNodeDetailLoading,
  isWorkspaceSubmitting,
  newNodeImages,
  newNodeTextContent,
  newNodeTitle,
  newNodeVoices,
  newNotebookName,
  nodeCreateTarget,
  nodeDetail,
  nodeDetailTarget,
  notebooks,
  onCloseDialog,
  onLogout,
  onOpenNodeDetail,
  onOpenNodeDialog,
  onOpenNotebookDialog,
  onSelectNotebook,
  onUpdateTree,
  selectedNotebookName,
  setNewNodeImages,
  setNewNodeTextContent,
  setNewNodeTitle,
  setNewNodeVoices,
  setNewNotebookName,
  tree,
  user,
  workspaceDialog,
  workspaceError,
}: AppShellProps) {
  const scrollbar = useNotebookScrollbar(notebooks.length);
  const zoom = useWorkspaceZoom();
  const [isNodeVoiceBusy, setNodeVoiceBusy] = useNodeVoiceBusy(workspaceDialog);

  return (
    <main className="shell-page">
      <header className="shell-header">
        <div className="shell-brand">
          <h1>{messages.appName}</h1>
          <span>{user.username}</span>
        </div>
        <button className="text-action" onClick={onLogout} type="button">
          {messages.shell.logout}
        </button>
      </header>
      <section className="workspace-frame" aria-label="工作区">
        <NotebookSidebar
          notebooks={notebooks}
          onCreateNotebook={onOpenNotebookDialog}
          onScroll={scrollbar.syncNotebookScrollbar}
          onSelectNotebook={onSelectNotebook}
          scrollbar={scrollbar.notebookScrollbar}
          scrollbarHandlers={{
            onKeyDown: scrollbar.handleNotebookScrollbarKeyDown,
            onPointerCancel: scrollbar.handleNotebookScrollbarPointerUp,
            onPointerDown: scrollbar.handleNotebookScrollbarPointerDown,
            onPointerMove: scrollbar.handleNotebookScrollbarPointerMove,
            onPointerUp: scrollbar.handleNotebookScrollbarPointerUp,
            onWheel: scrollbar.handleNotebookScrollbarWheel,
          }}
          selectedNotebookName={selectedNotebookName}
          sidebarRef={scrollbar.notebookSidebarRef}
        />
        <WorkspaceCanvas
          isSubmitting={isWorkspaceSubmitting}
          onOpenNodeDetail={onOpenNodeDetail}
          onOpenNodeDialog={onOpenNodeDialog}
          onUpdateTree={onUpdateTree}
          onZoom={zoom.updateWorkspaceZoom}
          onZoomReset={zoom.resetWorkspaceZoom}
          selectedNotebookName={selectedNotebookName}
          tree={tree}
          treeBoardRef={zoom.treeBoardRef}
          workspaceDialogOpen={Boolean(workspaceDialog)}
          workspaceError={workspaceError}
          workspaceZoom={zoom.workspaceZoom}
        />
      </section>
      {workspaceDialog === "notebook" ? (
        <NotebookDialog
          error={workspaceError}
          isSubmitting={isWorkspaceSubmitting}
          name={newNotebookName}
          onClose={onCloseDialog}
          onNameChange={setNewNotebookName}
          onSubmit={handleCreateNotebook}
        />
      ) : null}
      {workspaceDialog === "node" ? (
        <NodeDialog
          error={workspaceError}
          images={newNodeImages}
          isSubmitting={isWorkspaceSubmitting}
          isVoiceBusy={isNodeVoiceBusy}
          nodeCreateTarget={nodeCreateTarget}
          onBusyChange={setNodeVoiceBusy}
          onClose={onCloseDialog}
          onImagesChange={setNewNodeImages}
          onSubmit={handleCreateNode}
          onTextContentChange={setNewNodeTextContent}
          onTitleChange={setNewNodeTitle}
          onVoicesChange={setNewNodeVoices}
          textContent={newNodeTextContent}
          title={newNodeTitle}
          voices={newNodeVoices}
        />
      ) : null}
      {workspaceDialog === "notebook-detail" && nodeDetailTarget?.kind === "notebook" ? (
        <NotebookDetailDialog onClose={onCloseDialog} target={nodeDetailTarget} />
      ) : null}
      {workspaceDialog === "node-detail" && nodeDetailTarget?.kind === "node" ? (
        <NodeDetailDialog detail={nodeDetail} error={workspaceError} isLoading={isNodeDetailLoading} onClose={onCloseDialog} target={nodeDetailTarget} />
      ) : null}
    </main>
  );
}

function useNodeVoiceBusy(workspaceDialog: string | null) {
  const [isNodeVoiceBusy, setNodeVoiceBusy] = useState(false);
  useEffect(() => {
    if (workspaceDialog !== "node") {
      setNodeVoiceBusy(false);
    }
  }, [workspaceDialog]);
  return [isNodeVoiceBusy, setNodeVoiceBusy] as const;
}
