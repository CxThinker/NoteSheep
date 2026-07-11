import { NotebookTree } from "@notesheep/api-client";

export const EMPTY_TREE: NotebookTree = {
  rootId: null,
  nodes: [],
  edges: [],
  freeNodeIds: [],
  deletedNodeIds: [],
};
