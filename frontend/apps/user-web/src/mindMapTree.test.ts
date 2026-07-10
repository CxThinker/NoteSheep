import { describe, expect, it } from "vitest";

import { NotebookTree } from "@notesheep/api-client";

import { layoutMindMap } from "./mindMapLayout";
import { NOTEBOOK_ROOT_ID, moveNodeAsChild, moveNodeAsSibling, normalizeNotebookTree } from "./mindMapTree";

const tree: NotebookTree = {
  rootId: NOTEBOOK_ROOT_ID,
  nodes: [
    node("root", "中心"),
    node("a", "节点 A"),
    node("b", "节点 B"),
    node("c", "节点 C"),
  ],
  edges: [
    { from: NOTEBOOK_ROOT_ID, to: "root", side: "right", order: 0 },
    { from: NOTEBOOK_ROOT_ID, to: "b", side: "right", order: 1 },
    { from: "root", to: "a", side: "right", order: 0 },
    { from: "a", to: "c", side: "right", order: 0 },
  ],
};

describe("mind map tree operations", () => {
  it("normalizes legacy edges to the right side with contiguous order", () => {
    const legacyTree = {
      ...tree,
      edges: [
        { from: NOTEBOOK_ROOT_ID, to: "b" },
        { from: NOTEBOOK_ROOT_ID, to: "a" },
      ],
    } as NotebookTree;

    expect(normalizeNotebookTree(legacyTree).edges).toEqual([
      { from: NOTEBOOK_ROOT_ID, to: "b", side: "right", order: 0 },
      { from: NOTEBOOK_ROOT_ID, to: "a", side: "right", order: 1 },
    ]);
  });

  it("moves a dragged subtree as a target child", () => {
    const result = moveNodeAsChild(tree, "b", "a");

    expect(result.error).toBeUndefined();
    expect(result.tree.edges).toEqual([
      { from: NOTEBOOK_ROOT_ID, to: "root", side: "right", order: 0 },
      { from: "root", to: "a", side: "right", order: 0 },
      { from: "a", to: "c", side: "right", order: 0 },
      { from: "a", to: "b", side: "right", order: 1 },
    ]);
  });

  it("moves a dragged subtree as a left sibling", () => {
    const result = moveNodeAsSibling(tree, "b", "root", "left");

    expect(result.error).toBeUndefined();
    expect(result.tree.edges).toContainEqual({ from: NOTEBOOK_ROOT_ID, to: "b", side: "left", order: 0 });
    expect(result.tree.edges).toContainEqual({ from: NOTEBOOK_ROOT_ID, to: "root", side: "right", order: 0 });
  });

  it("moves a dragged subtree under the notebook root", () => {
    const result = moveNodeAsChild(tree, "a", NOTEBOOK_ROOT_ID);

    expect(result.error).toBeUndefined();
    expect(result.tree.edges).toContainEqual({ from: NOTEBOOK_ROOT_ID, to: "a", side: "right", order: 2 });
    expect(result.tree.edges).toContainEqual({ from: "a", to: "c", side: "right", order: 0 });
  });

  it("rejects creating siblings for the notebook root", () => {
    const result = moveNodeAsSibling(tree, "a", NOTEBOOK_ROOT_ID, "left");

    expect(result.error).toBe("root-sibling");
  });

  it("rejects moving a node under its own descendant", () => {
    const result = moveNodeAsChild(tree, "a", "c");

    expect(result.error).toBe("cycle");
    expect(result.tree).toEqual(tree);
  });
});

describe("mind map layout", () => {
  it("places left and right branches around the root", () => {
    const layout = layoutMindMap({
      ...tree,
      edges: [
        { from: NOTEBOOK_ROOT_ID, to: "a", side: "left", order: 0 },
        { from: NOTEBOOK_ROOT_ID, to: "b", side: "right", order: 0 },
      ],
    });
    const root = layout.nodes.find((item) => item.id === NOTEBOOK_ROOT_ID);
    const left = layout.nodes.find((item) => item.id === "a");
    const right = layout.nodes.find((item) => item.id === "b");

    expect(root?.isRoot).toBe(true);
    expect(root?.depth).toBe(0);
    expect(root?.layerIndex).toBe(0);
    expect(left?.depth).toBe(1);
    expect(left?.layerIndex).toBe(1);
    expect(right?.depth).toBe(1);
    expect(right?.layerIndex).toBe(2);
    expect(left?.x).toBeLessThan(root?.x ?? 0);
    expect(right?.x).toBeGreaterThan(root?.x ?? 0);
    expect(left?.y).toBeGreaterThan(root?.y ?? 0);
    expect(right?.y).toBeGreaterThan(root?.y ?? 0);
    expect(layout.connectors).toHaveLength(2);
    expect(layout.connectors[0].midY).toBeGreaterThan(layout.connectors[0].startY);
    expect(layout.connectors[0].midY).toBeLessThan(layout.connectors[0].endY);
  });
});

function node(id: string, title: string) {
  return {
    id,
    title,
    textFile: `${title}.md`,
    voiceDir: `../voice/${title}`,
    imgDir: `../img/${title}`,
  };
}
