import { RefObject } from "react";

import { NotebookNode, NotebookTree } from "@notesheep/api-client";

import { NodeDetailTarget } from "../MindMapCanvas";
import { DropTarget } from "../mindMapCanvasTypes";
import { messages } from "../messages";
import { NodeTrayItem } from "./NodeTrayItem";

export type NodeTrayTab = "free" | "deleted";

type NodeTrayProps = {
  activeTab: NodeTrayTab;
  disabled: boolean;
  onOpenNodeDetail: (target: NodeDetailTarget) => void;
  onDropTargetPreview: (target: DropTarget | null) => void;
  onPermanentDelete: (nodeId: string) => void;
  onPlaceNode: (nodeId: string, target: DropTarget) => void;
  onScroll: () => void;
  onSelectNode: (nodeId: string | null) => void;
  onTabChange: (tab: NodeTrayTab) => void;
  selectedNodeId: string | null;
  trayRef: RefObject<HTMLElement | null>;
  tree: NotebookTree;
};

export function NodeTray({
  activeTab,
  disabled,
  onOpenNodeDetail,
  onDropTargetPreview,
  onPermanentDelete,
  onPlaceNode,
  onScroll,
  onSelectNode,
  onTabChange,
  selectedNodeId,
  trayRef,
  tree,
}: NodeTrayProps) {
  const nodes = nodesForTab(tree, activeTab);
  const label = activeTab === "free" ? messages.shell.freeNodes : messages.shell.deletedNodes;
  return (
    <section aria-label={messages.shell.nodeTray} className="node-tray">
      <div aria-label={messages.shell.nodeTrayTabs} className="node-tray-tabs" role="tablist">
        <TrayTab active={activeTab === "free"} label={messages.shell.freeNodes} onClick={() => onTabChange("free")} />
        <TrayTab active={activeTab === "deleted"} label={messages.shell.deletedNodes} onClick={() => onTabChange("deleted")} />
      </div>
      <div
        aria-label={label}
        className="node-tray-scroll"
        id="node-tray-scroll"
        onScroll={onScroll}
        ref={trayRef as RefObject<HTMLDivElement | null>}
        role="tabpanel"
      >
        <div className="node-tray-content">
          {nodes.length === 0 ? <p className="empty-state">{activeTab === "free" ? messages.shell.emptyFreeNodes : messages.shell.emptyDeletedNodes}</p> : null}
          {nodes.map((node) => (
            <NodeTrayItem
              disabled={disabled}
              key={node.id}
              node={node}
              onOpenNodeDetail={onOpenNodeDetail}
              onDropTargetPreview={onDropTargetPreview}
              onPermanentDelete={onPermanentDelete}
              onPlaceNode={onPlaceNode}
              onSelectNode={onSelectNode}
              positionLabel={label}
              selected={selectedNodeId === node.id}
              showPermanentDelete={activeTab === "deleted"}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function TrayTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button aria-selected={active} className="node-tray-tab" data-active={active} onClick={onClick} role="tab" type="button">
      {label}
    </button>
  );
}

function nodesForTab(tree: NotebookTree, tab: NodeTrayTab) {
  const ids = tab === "free" ? tree.freeNodeIds ?? [] : tree.deletedNodeIds ?? [];
  const nodeById = new Map(tree.nodes.map((node) => [node.id, node]));
  return ids.map((id) => nodeById.get(id)).filter((node): node is NotebookNode => Boolean(node));
}
