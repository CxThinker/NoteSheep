import { NotebookEntry, NotebookTree } from "@notesheep/api-client";

import { NodeDetailTarget } from "../MindMapCanvas";
import { DropTarget } from "../mindMapCanvasTypes";
import { messages } from "../messages";
import { NodeTray, NodeTrayTab } from "./NodeTray";
import { SidebarScrollbar } from "./SidebarScrollbar";
import { PanelScrollbar } from "./usePanelScrollbar";

type NotebookSidebarProps = {
  activeTrayTab: NodeTrayTab;
  isSubmitting: boolean;
  notebookScroll: PanelScrollbar;
  notebooks: NotebookEntry[];
  onCreateNotebook: () => void;
  onOpenNodeDetail: (target: NodeDetailTarget) => void;
  onDropTargetPreview: (target: DropTarget | null) => void;
  onPermanentDeleteNode: (nodeId: string) => void;
  onPlaceTrayNode: (nodeId: string, target: DropTarget) => void;
  onSelectNotebook: (name: string) => void;
  onSelectTrayNode: (nodeId: string | null) => void;
  onTrayTabChange: (tab: NodeTrayTab) => void;
  selectedNotebookName: string;
  selectedTrayNodeId: string | null;
  trayScroll: PanelScrollbar;
  tree: NotebookTree;
};

export function NotebookSidebar({
  activeTrayTab,
  isSubmitting,
  notebookScroll,
  notebooks,
  onCreateNotebook,
  onOpenNodeDetail,
  onDropTargetPreview,
  onPermanentDeleteNode,
  onPlaceTrayNode,
  onSelectNotebook,
  onSelectTrayNode,
  onTrayTabChange,
  selectedNotebookName,
  selectedTrayNodeId,
  trayScroll,
  tree,
}: NotebookSidebarProps) {
  return (
    <div className="notebook-sidebar-shell">
      <div className="sidebar-scroll-shell">
        <SidebarScrollbar controls={notebookScroll} label={messages.shell.notebookScrollbar} targetId="notebook-sidebar-scroll" />
        <aside aria-label={messages.shell.notebookSidebar} className="notebook-sidebar" id="notebook-sidebar-scroll" onScroll={notebookScroll.syncScrollbar} ref={notebookScroll.panelRef}>
          <NotebookList notebooks={notebooks} onCreateNotebook={onCreateNotebook} onSelectNotebook={onSelectNotebook} selectedNotebookName={selectedNotebookName} />
        </aside>
      </div>
      <div className="sidebar-scroll-shell">
        <SidebarScrollbar controls={trayScroll} label={messages.shell.nodeTrayScrollbar} targetId="node-tray-scroll" />
        <NodeTray
          activeTab={activeTrayTab}
          disabled={isSubmitting || !selectedNotebookName}
          onOpenNodeDetail={onOpenNodeDetail}
          onDropTargetPreview={onDropTargetPreview}
          onPermanentDelete={onPermanentDeleteNode}
          onPlaceNode={onPlaceTrayNode}
          onScroll={trayScroll.syncScrollbar}
          onSelectNode={onSelectTrayNode}
          onTabChange={onTrayTabChange}
          selectedNodeId={selectedTrayNodeId}
          trayRef={trayScroll.panelRef}
          tree={tree}
        />
      </div>
    </div>
  );
}

function NotebookList({
  notebooks,
  onCreateNotebook,
  onSelectNotebook,
  selectedNotebookName,
}: {
  notebooks: NotebookEntry[];
  onCreateNotebook: () => void;
  onSelectNotebook: (name: string) => void;
  selectedNotebookName: string;
}) {
  return (
    <div className="notebook-sidebar-content">
      <button className="create-notebook-button" onClick={onCreateNotebook} type="button">
        {messages.shell.openCreateNotebook}
      </button>
      <div aria-label={messages.shell.notebookList} className="notebook-list">
        {notebooks.length === 0 ? <p className="empty-state">{messages.shell.emptyNotebooks}</p> : null}
        {notebooks.map((notebook) => (
          <button className="notebook-item" data-active={selectedNotebookName === notebook.name} key={notebook.name} onClick={() => onSelectNotebook(notebook.name)} type="button">
            {notebook.name}
          </button>
        ))}
      </div>
    </div>
  );
}
