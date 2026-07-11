import { NotebookEntry } from "@notesheep/api-client";

import { messages } from "../messages";
import { ScrollbarState } from "./scrollbar";

type NotebookSidebarProps = {
  notebooks: NotebookEntry[];
  onCreateNotebook: () => void;
  onSelectNotebook: (name: string) => void;
  onScroll: () => void;
  scrollbar: ScrollbarState;
  scrollbarHandlers: {
    onKeyDown: React.KeyboardEventHandler<HTMLDivElement>;
    onPointerCancel: React.PointerEventHandler<HTMLDivElement>;
    onPointerDown: React.PointerEventHandler<HTMLDivElement>;
    onPointerMove: React.PointerEventHandler<HTMLDivElement>;
    onPointerUp: React.PointerEventHandler<HTMLDivElement>;
    onWheel: React.WheelEventHandler<HTMLDivElement>;
  };
  selectedNotebookName: string;
  sidebarRef: React.RefObject<HTMLElement | null>;
};

export function NotebookSidebar({
  notebooks,
  onCreateNotebook,
  onSelectNotebook,
  onScroll,
  scrollbar,
  scrollbarHandlers,
  selectedNotebookName,
  sidebarRef,
}: NotebookSidebarProps) {
  return (
    <div className="notebook-scroll-shell">
      <div
        aria-controls="notebook-sidebar-scroll"
        aria-label="笔记本滚动条"
        aria-orientation="vertical"
        aria-valuemax={scrollbar.valueMax}
        aria-valuemin={0}
        aria-valuenow={scrollbar.valueNow}
        className="workspace-scrollbar"
        role="scrollbar"
        tabIndex={0}
        {...scrollbarHandlers}
      >
        <span
          className="workspace-scrollbar-thumb"
          style={{
            height: scrollbar.thumbHeight ? `${scrollbar.thumbHeight}px` : "100%",
            transform: `translateY(${scrollbar.thumbTop}px)`,
          }}
        />
      </div>
      <aside
        aria-label="笔记本侧栏"
        className="notebook-sidebar"
        id="notebook-sidebar-scroll"
        onScroll={onScroll}
        ref={sidebarRef}
      >
        <div className="notebook-sidebar-content">
          <button className="create-notebook-button" onClick={onCreateNotebook} type="button">
            {messages.shell.openCreateNotebook}
          </button>
          <div aria-label="笔记本列表" className="notebook-list">
            {notebooks.length === 0 ? <p className="empty-state">{messages.shell.emptyNotebooks}</p> : null}
            {notebooks.map((notebook) => (
              <button
                className="notebook-item"
                data-active={selectedNotebookName === notebook.name}
                key={notebook.name}
                onClick={() => onSelectNotebook(notebook.name)}
                type="button"
              >
                {notebook.name}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
