import { NotebookNode, NotebookNodeDetail } from "@notesheep/api-client";

import { MindMapBoard } from "./MindMapBoard";
import { DragState, DropTarget, MindMapPointerDown, NodeCreateTarget } from "./mindMapCanvasTypes";
import { MindMapLayout } from "./mindMapLayout";

type MindMapViewportProps = {
  activeDropTarget: DropTarget | null;
  disabled: boolean;
  draggedNode: NotebookNode | null;
  dragState: DragState | null;
  error: string;
  horizontalGutter: number;
  layout: MindMapLayout;
  nodeById: Map<string, NotebookNode>;
  nodeDetails: ReadonlyMap<string, NotebookNodeDetail>;
  onCreateNodeAt: (target: NodeCreateTarget) => void;
  onDeleteNode: (nodeId: string) => void;
  onDropTrayNode: (nodeId: string, target: DropTarget) => void;
  onPointerCancel: React.PointerEventHandler<HTMLElement>;
  onPointerDown: MindMapPointerDown;
  onPointerMove: React.PointerEventHandler<HTMLElement>;
  onPointerUp: React.PointerEventHandler<HTMLElement>;
  selectedTrayNodeId: string | null;
  zoom: number;
};

export function MindMapViewport({
  activeDropTarget,
  disabled,
  draggedNode,
  dragState,
  error,
  horizontalGutter,
  layout,
  nodeById,
  nodeDetails,
  onCreateNodeAt,
  onDeleteNode,
  onDropTrayNode,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  selectedTrayNodeId,
  zoom,
}: MindMapViewportProps) {
  const gutter = Math.ceil(horizontalGutter);
  return (
    <div
      className="mind-map-shell"
      style={{
        height: `${Math.ceil(layout.height * zoom)}px`,
        paddingLeft: `${gutter}px`,
        paddingRight: `${gutter}px`,
        width: `${Math.ceil(layout.width * zoom)}px`,
      }}
    >
      <MindMapBoard
        disabled={disabled}
        dragState={dragState}
        dropTarget={activeDropTarget}
        layout={layout}
        nodeById={nodeById}
        nodeDetails={nodeDetails}
        onCreateNodeAt={onCreateNodeAt}
        onDeleteNode={onDeleteNode}
        onDropTrayNode={onDropTrayNode}
        onPointerCancel={onPointerCancel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        selectedTrayNodeId={selectedTrayNodeId}
        zoom={zoom}
      />
      {dragState && draggedNode ? <div className="mind-map-drag-ghost" style={{ left: dragState.x, top: dragState.y }}>{draggedNode.title}</div> : null}
      {error ? <p className="form-error mind-map-error">{error}</p> : null}
    </div>
  );
}
