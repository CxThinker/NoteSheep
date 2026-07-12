import { useState } from "react";

import { DeletedNotebookEntry, NotebookEntry, NotebookTree } from "@notesheep/api-client";

import { NodeDetailTarget } from "../MindMapCanvas";
import { DropTarget } from "../mindMapCanvasTypes";
import { formatMessage, messages } from "../messages";
import { NodeTray, NodeTrayTab } from "./NodeTray";
import { SidebarScrollbar } from "./SidebarScrollbar";
import { PanelScrollbar } from "./usePanelScrollbar";

type NotebookSidebarProps = {
  activeTrayTab: NodeTrayTab;
  deletedNotebooks: DeletedNotebookEntry[];
  isSubmitting: boolean;
  notebookScroll: PanelScrollbar;
  notebooks: NotebookEntry[];
  onCollapseSidebar: () => void;
  onCreateNotebook: () => void;
  onDeleteNotebook: (name: string) => void;
  onOpenNodeDetail: (target: NodeDetailTarget) => void;
  onDropTargetPreview: (target: DropTarget | null) => void;
  onPermanentDeleteNode: (nodeId: string) => void;
  onPermanentDeleteNotebook: (notebook: DeletedNotebookEntry) => void;
  onPlaceTrayNode: (nodeId: string, target: DropTarget) => void;
  onRestoreNotebook: (notebook: DeletedNotebookEntry) => void;
  onSelectNotebook: (name: string) => void;
  onSelectTrayNode: (nodeId: string | null) => void;
  onTrayTabChange: (tab: NodeTrayTab) => void;
  selectedNotebookName: string;
  selectedTrayNodeId: string | null;
  trayScroll: PanelScrollbar;
  tree: NotebookTree;
};

type NotebookListTab = "active" | "deleted";

export function NotebookSidebar({
  activeTrayTab,
  deletedNotebooks,
  isSubmitting,
  notebookScroll,
  notebooks,
  onCollapseSidebar,
  onCreateNotebook,
  onDeleteNotebook,
  onOpenNodeDetail,
  onDropTargetPreview,
  onPermanentDeleteNode,
  onPermanentDeleteNotebook,
  onPlaceTrayNode,
  onRestoreNotebook,
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
          <NotebookList
            deletedNotebooks={deletedNotebooks}
            disabled={isSubmitting}
            notebooks={notebooks}
            onCollapseSidebar={onCollapseSidebar}
            onCreateNotebook={onCreateNotebook}
            onDeleteNotebook={onDeleteNotebook}
            onPermanentDeleteNotebook={onPermanentDeleteNotebook}
            onRestoreNotebook={onRestoreNotebook}
            onSelectNotebook={onSelectNotebook}
            selectedNotebookName={selectedNotebookName}
          />
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
  deletedNotebooks,
  disabled,
  notebooks,
  onCollapseSidebar,
  onCreateNotebook,
  onDeleteNotebook,
  onPermanentDeleteNotebook,
  onRestoreNotebook,
  onSelectNotebook,
  selectedNotebookName,
}: {
  deletedNotebooks: DeletedNotebookEntry[];
  disabled: boolean;
  notebooks: NotebookEntry[];
  onCollapseSidebar: () => void;
  onCreateNotebook: () => void;
  onDeleteNotebook: (name: string) => void;
  onPermanentDeleteNotebook: (notebook: DeletedNotebookEntry) => void;
  onRestoreNotebook: (notebook: DeletedNotebookEntry) => void;
  onSelectNotebook: (name: string) => void;
  selectedNotebookName: string;
}) {
  const [activeNotebookTab, setActiveNotebookTab] = useState<NotebookListTab>("active");
  const isActiveTab = activeNotebookTab === "active";
  return (
    <div className="notebook-sidebar-content">
      <div className="notebook-action-row">
        <button className="create-notebook-button" onClick={onCreateNotebook} type="button">
          {messages.shell.openCreateNotebook}
        </button>
        <button aria-label={messages.shell.collapseSidebar} className="sidebar-collapse-button" onClick={onCollapseSidebar} type="button">
          &lt;
        </button>
      </div>
      <div aria-label={messages.shell.notebookTabs} className="notebook-tabs" role="tablist">
        <NotebookTabButton active={isActiveTab} label={messages.shell.notebooks} onClick={() => setActiveNotebookTab("active")} />
        <NotebookTabButton active={!isActiveTab} label={messages.shell.deletedNotebooks} onClick={() => setActiveNotebookTab("deleted")} />
      </div>
      {isActiveTab ? (
        <>
          <div aria-label={messages.shell.notebookList} className="notebook-list" role="tabpanel">
            {notebooks.length === 0 ? <p className="empty-state">{messages.shell.emptyNotebooks}</p> : null}
            {notebooks.map((notebook) => (
              <div className="notebook-row" key={notebook.name}>
                <button
                  aria-label={formatMessage(messages.shell.openNotebook, { notebookName: notebook.name })}
                  className="notebook-item"
                  data-active={selectedNotebookName === notebook.name}
                  onClick={() => onSelectNotebook(notebook.name)}
                  type="button"
                >
                  {notebook.name}
                </button>
                <button
                  aria-label={formatMessage(messages.shell.deleteNotebook, { notebookName: notebook.name })}
                  className="notebook-delete"
                  disabled={disabled}
                  onClick={() => onDeleteNotebook(notebook.name)}
                  title={formatMessage(messages.shell.deleteNotebook, { notebookName: notebook.name })}
                  type="button"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <section aria-label={messages.shell.deletedNotebooks} className="deleted-notebook-section" role="tabpanel">
          {deletedNotebooks.length === 0 ? <p className="empty-state">{messages.shell.emptyDeletedNotebooks}</p> : null}
          {deletedNotebooks.map((notebook) => (
            <div className="deleted-notebook-row" key={notebook.id}>
              <span>{notebook.name}</span>
              <button
                aria-label={formatMessage(messages.shell.restoreNotebook, { notebookName: notebook.name })}
                disabled={disabled}
                onClick={() => onRestoreNotebook(notebook)}
                type="button"
              >
                ↺
              </button>
              <button
                aria-label={formatMessage(messages.shell.permanentDeleteNotebook, { notebookName: notebook.name })}
                className="notebook-delete"
                disabled={disabled}
                onClick={() => onPermanentDeleteNotebook(notebook)}
                title={formatMessage(messages.shell.permanentDeleteNotebook, { notebookName: notebook.name })}
                type="button"
              >
                ×
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function NotebookTabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button aria-selected={active} className="notebook-tab" data-active={active} onClick={onClick} role="tab" type="button">
      {label}
    </button>
  );
}
