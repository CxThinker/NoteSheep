import { NotebookTree } from "@notesheep/api-client";

import { DropTarget } from "../mindMapCanvasTypes";
import { messages } from "../messages";
import { moveTrayNodeAsChild, moveTrayNodeAsSibling } from "../mindMapTreeStates";

type PlaceTrayNodeContext = {
  nodeId: string;
  saveTree: (tree: NotebookTree) => Promise<boolean>;
  setWorkspaceError: (value: string) => void;
  target: DropTarget;
  tree: NotebookTree;
};

export async function placeTrayNode({
  nodeId,
  saveTree,
  setWorkspaceError,
  target,
  tree,
}: PlaceTrayNodeContext) {
  const result =
    target.kind === "child"
      ? moveTrayNodeAsChild(tree, nodeId, target.nodeId)
      : moveTrayNodeAsSibling(tree, nodeId, target.nodeId, target.side);
  if (result.error) {
    setWorkspaceError(messages.shell.treeMoveRejected);
    return;
  }
  const saved = await saveTree(result.tree);
  if (!saved) {
    setWorkspaceError(messages.shell.treeUpdateFailed);
  }
}
