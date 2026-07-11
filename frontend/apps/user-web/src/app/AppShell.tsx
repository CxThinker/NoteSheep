import { useEffect, useState } from "react";

import { AuthUser } from "@notesheep/api-client";
import { LanguageCode, NeonTextColorName, ThemeName } from "@notesheep/ui";

import { DropTarget } from "../mindMapCanvasTypes";
import { messages } from "../messages";
import { NotebookSidebar } from "./NotebookSidebar";
import { NodeTrayTab } from "./NodeTray";
import { SettingsDialog } from "./SettingsDialog";
import { usePanelScrollbar } from "./usePanelScrollbar";
import { useWorkspaceController } from "./useWorkspaceController";
import { useWorkspaceZoom } from "./useWorkspaceZoom";
import { WorkspaceCanvas } from "./WorkspaceCanvas";
import { WorkspaceDialogs } from "./WorkspaceDialogs";

type AppShellProps = ReturnType<typeof useWorkspaceController> & {
  language: LanguageCode;
  neonTextColor: NeonTextColorName;
  onLanguageChange: (value: LanguageCode) => void;
  onLogout: () => void;
  onNeonTextColorChange: (value: NeonTextColorName) => void;
  onThemeChange: (value: ThemeName) => void;
  theme: ThemeName;
  user: AuthUser;
};

export function AppShell(props: AppShellProps) {
  const {
    deletedNotebooks,
    isWorkspaceSubmitting,
    language,
    neonTextColor,
    notebooks,
    onDeleteNotebook,
    onLanguageChange,
    onLogout,
    onNeonTextColorChange,
    onOpenNodeDetail,
    onOpenNodeDialog,
    onOpenNotebookDialog,
    onPermanentDeleteNode,
    onPermanentDeleteNotebook,
    onPlaceTrayNode,
    onRestoreNotebook,
    onSelectNotebook,
    onSoftDeleteNode,
    onThemeChange,
    onUpdateTree,
    selectedNotebookName,
    theme,
    tree,
    user,
    workspaceDialog,
    workspaceError,
  } = props;
  const [activeTrayTab, setActiveTrayTab] = useState<NodeTrayTab>("free");
  const [selectedTrayNodeId, setSelectedTrayNodeId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [trayDropTarget, setTrayDropTarget] = useState<DropTarget | null>(null);
  const notebookScroll = usePanelScrollbar(notebooks.length, ".notebook-sidebar-content");
  const trayScroll = usePanelScrollbar(
    `${activeTrayTab}:${(tree.freeNodeIds ?? []).length}:${(tree.deletedNodeIds ?? []).length}`,
    ".node-tray-content",
  );
  const zoom = useWorkspaceZoom();

  useEffect(() => {
    setSelectedTrayNodeId(null);
    setTrayDropTarget(null);
  }, [activeTrayTab, selectedNotebookName]);

  useEffect(() => {
    if (!selectedTrayNodeId) {
      return;
    }
    const trayNodeIds = [...(tree.freeNodeIds ?? []), ...(tree.deletedNodeIds ?? [])];
    if (!trayNodeIds.includes(selectedTrayNodeId)) {
      setSelectedTrayNodeId(null);
    }
  }, [selectedTrayNodeId, tree.deletedNodeIds, tree.freeNodeIds]);

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
        <button aria-label={messages.settings.open} className="settings-button" onClick={() => setSettingsOpen(true)} type="button">
          ⚙
        </button>
      </header>
      <section className="workspace-frame" aria-label={messages.shell.workspace}>
        <NotebookSidebar
          activeTrayTab={activeTrayTab}
          deletedNotebooks={deletedNotebooks}
          isSubmitting={isWorkspaceSubmitting}
          notebookScroll={notebookScroll}
          notebooks={notebooks}
          onCreateNotebook={onOpenNotebookDialog}
          onDeleteNotebook={onDeleteNotebook}
          onOpenNodeDetail={onOpenNodeDetail}
          onDropTargetPreview={handleDropTargetPreview}
          onPermanentDeleteNode={onPermanentDeleteNode}
          onPermanentDeleteNotebook={onPermanentDeleteNotebook}
          onPlaceTrayNode={handlePlaceTrayNode}
          onRestoreNotebook={onRestoreNotebook}
          onSelectNotebook={onSelectNotebook}
          onSelectTrayNode={setSelectedTrayNodeId}
          onTrayTabChange={setActiveTrayTab}
          selectedNotebookName={selectedNotebookName}
          selectedTrayNodeId={selectedTrayNodeId}
          trayScroll={trayScroll}
          tree={tree}
        />
        <WorkspaceCanvas
          isSubmitting={isWorkspaceSubmitting}
          onOpenNodeDetail={onOpenNodeDetail}
          onOpenNodeDialog={onOpenNodeDialog}
          onPlaceTrayNode={handlePlaceTrayNode}
          onSoftDeleteNode={onSoftDeleteNode}
          onUpdateTree={onUpdateTree}
          onZoom={zoom.updateWorkspaceZoom}
          onZoomReset={zoom.resetWorkspaceZoom}
          selectedNotebookName={selectedNotebookName}
          selectedTrayNodeId={selectedTrayNodeId}
          trayDropTarget={trayDropTarget}
          tree={tree}
          treeBoardRef={zoom.treeBoardRef}
          workspaceDialogOpen={Boolean(workspaceDialog)}
          workspaceError={workspaceError}
          workspaceZoom={zoom.workspaceZoom}
        />
      </section>
      <WorkspaceDialogs controller={props} />
      {settingsOpen ? (
        <SettingsDialog
          language={language}
          neonTextColor={neonTextColor}
          onClose={() => setSettingsOpen(false)}
          onLanguageChange={onLanguageChange}
          onNeonTextColorChange={onNeonTextColorChange}
          onThemeChange={onThemeChange}
          theme={theme}
        />
      ) : null}
    </main>
  );

  async function handlePlaceTrayNode(nodeId: string, target: Parameters<typeof onPlaceTrayNode>[1]) {
    setTrayDropTarget(null);
    await onPlaceTrayNode(nodeId, target);
    setSelectedTrayNodeId((current) => (current === nodeId ? null : current));
  }

  function handleDropTargetPreview(target: DropTarget | null) {
    setTrayDropTarget((current) => (sameDropTarget(current, target) ? current : target));
  }
}

function sameDropTarget(left: DropTarget | null, right: DropTarget | null) {
  if (left === right) {
    return true;
  }
  if (!left || !right || left.kind !== right.kind || left.nodeId !== right.nodeId) {
    return false;
  }
  return left.kind === "child" || (right.kind === "sibling" && left.side === right.side);
}
