import { NotebookNode } from "@notesheep/api-client";

import { MindMapNode } from "./MindMapNode";
import { DragState, DropTarget, MindMapPointerDown, NodeCreateTarget } from "./mindMapCanvasTypes";
import { MindMapLayout } from "./mindMapLayout";

type MindMapBoardProps = {
  disabled: boolean;
  dragState: DragState | null;
  dropTarget: DropTarget | null;
  layout: MindMapLayout;
  nodeById: Map<string, NotebookNode>;
  onCreateNodeAt: (target: NodeCreateTarget) => void;
  onPointerCancel: React.PointerEventHandler<HTMLElement>;
  onPointerDown: MindMapPointerDown;
  onPointerMove: React.PointerEventHandler<HTMLElement>;
  onPointerUp: React.PointerEventHandler<HTMLElement>;
  zoom: number;
};

export function MindMapBoard({
  disabled,
  dragState,
  dropTarget,
  layout,
  nodeById,
  onCreateNodeAt,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  zoom,
}: MindMapBoardProps) {
  return (
    <div className="mind-map-board" style={{ height: `${layout.height}px`, transform: `scale(${zoom})`, width: `${layout.width}px` }}>
      <svg aria-hidden="true" className="mind-map-connectors" height={layout.height} width={layout.width}>
        {layout.connectors.map((connector) => (
          <path
            d={`M ${connector.startX} ${connector.startY} V ${connector.midY} H ${connector.endX} V ${connector.endY}`}
            key={`${connector.from}-${connector.to}`}
          />
        ))}
      </svg>
      {layout.nodes.map((nodeLayout) => {
        const node = nodeById.get(nodeLayout.id);
        if (!node) {
          return null;
        }
        return (
          <MindMapNode
            activeDrop={dropTarget}
            disabled={disabled}
            isDragging={dragState?.nodeId === node.id}
            key={node.id}
            layout={nodeLayout}
            node={node}
            onCreateNodeAt={onCreateNodeAt}
            onPointerCancel={onPointerCancel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
        );
      })}
    </div>
  );
}
