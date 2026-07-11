import { describe, expect, it } from "vitest";

import { NotebookTree } from "@notesheep/api-client";

import { NOTEBOOK_ROOT_ID } from "./mindMapTree";
import { deleteNodeOnly, deleteSubtree, moveTrayNodeAsChild } from "./mindMapTreeStates";

const tree: NotebookTree = {
  rootId: NOTEBOOK_ROOT_ID,
  nodes: [node("a"), node("b"), node("c"), node("d")],
  edges: [
    { from: NOTEBOOK_ROOT_ID, to: "a", side: "right", order: 0 },
    { from: "a", to: "b", side: "right", order: 0 },
    { from: "a", to: "c", side: "right", order: 1 },
  ],
  freeNodeIds: ["d"],
  deletedNodeIds: [],
};

describe("mind map node states", () => {
  it("moves a free tray node into the tree", () => {
    const result = moveTrayNodeAsChild(tree, "d", "a");

    expect(result.error).toBeUndefined();
    expect(result.tree.freeNodeIds).toEqual([]);
    expect(result.tree.edges).toContainEqual({ from: "a", to: "d", side: "right", order: 2 });
  });

  it("moves a deleted tray node into the tree", () => {
    const deletedTree = { ...tree, freeNodeIds: [], deletedNodeIds: ["d"] };
    const result = moveTrayNodeAsChild(deletedTree, "d", NOTEBOOK_ROOT_ID);

    expect(result.error).toBeUndefined();
    expect(result.tree.deletedNodeIds).toEqual([]);
    expect(result.tree.edges).toContainEqual({ from: NOTEBOOK_ROOT_ID, to: "d", side: "right", order: 1 });
  });

  it("moves an entire subtree into deleted nodes", () => {
    const result = deleteSubtree(tree, "a");

    expect(result.deletedIds).toEqual(["a", "b", "c"]);
    expect(result.tree.edges).toEqual([]);
    expect(result.tree.deletedNodeIds).toEqual(["a", "b", "c"]);
  });

  it("deletes one node and promotes its children", () => {
    const result = deleteNodeOnly(tree, "a");

    expect(result.tree.deletedNodeIds).toEqual(["a"]);
    expect(result.tree.edges).toEqual([
      { from: NOTEBOOK_ROOT_ID, to: "b", side: "right", order: 0 },
      { from: NOTEBOOK_ROOT_ID, to: "c", side: "right", order: 1 },
    ]);
  });
});

function node(id: string) {
  return {
    id,
    title: `节点 ${id}`,
    textFile: `${id}.md`,
    voiceDir: `../voice/${id}`,
    imgDir: `../img/${id}`,
  };
}
