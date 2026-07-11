import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { makeApi, resetAppTestEnvironment, treeWithNode } from "./testUtils";

const freeNode = {
  id: "free-1",
  title: "自由节点",
  textFile: "自由节点.md",
  voiceDir: "../voice/自由节点",
  imgDir: "../img/自由节点",
};

describe("Node tray", () => {
  beforeEach(resetAppTestEnvironment);

  it("creates nodes from the floating button into the free node tray", async () => {
    const tree = { ...treeWithNode, nodes: [...treeWithNode.nodes, freeNode], freeNodeIds: [freeNode.id] };
    const api = makeApi({ createNode: vi.fn().mockResolvedValue({ node: freeNode, tree }) });
    render(<App api={api} />);
    await login();

    fireEvent.click(screen.getByRole("button", { name: "创建节点" }));
    fireEvent.change(screen.getByLabelText("节点名称"), { target: { value: "自由节点" } });
    fireEvent.click(screen.getByRole("button", { name: "保存节点" }));

    await waitFor(() => expect(api.createNode).toHaveBeenCalledWith("笔记本1", { title: "自由节点" }));
    expect(await screen.findByRole("button", { name: "自由节点" })).toBeInTheDocument();
  });

  it("shows deleted nodes and asks before permanent deletion", async () => {
    const deletedTree = { ...treeWithNode, deletedNodeIds: ["node-1"], edges: [] };
    const api = makeApi({
      getNotebookTree: vi.fn().mockResolvedValue({ tree: deletedTree }),
      deleteNode: vi.fn().mockResolvedValue({ tree: { ...deletedTree, nodes: [], deletedNodeIds: [] } }),
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<App api={api} />);
    await login();

    fireEvent.click(screen.getByRole("tab", { name: "被删除节点" }));
    const tray = screen.getByRole("tabpanel", { name: "被删除节点" });
    fireEvent.click(await within(tray).findByRole("button", { name: "彻底删除 节点一" }));

    await waitFor(() => expect(api.deleteNode).toHaveBeenCalledWith("笔记本1", "node-1"));
  });

  it("places free nodes into the tree by pointer dragging them onto a drop zone", async () => {
    const tree = {
      ...treeWithNode,
      nodes: [...treeWithNode.nodes, freeNode],
      freeNodeIds: [freeNode.id],
    };
    const api = makeApi({ getNotebookTree: vi.fn().mockResolvedValue({ tree }) });
    const originalElementFromPoint = document.elementFromPoint;
    render(<App api={api} />);
    await login();

    const tray = screen.getByRole("tabpanel", { name: "自由节点" });
    const trayButton = await within(tray).findByRole("button", { name: "自由节点" });
    const trayItem = trayButton.closest(".node-tray-item");
    const rootDropZone = screen.getByRole("button", { name: "给 笔记本1 添加子节点" });
    const rectSpy = mockDropZoneRect(rootDropZone);
    document.elementFromPoint = vi.fn().mockReturnValue(document.body);

    try {
      fireEvent.pointerDown(trayItem as Element, { clientX: 24, clientY: 24, pointerId: 9 });
      fireEvent.pointerMove(trayItem as Element, { clientX: 64, clientY: 64, pointerId: 9 });

      expect(rootDropZone).toHaveAttribute("data-active", "true");

      fireEvent.pointerUp(trayItem as Element, { clientX: 64, clientY: 64, pointerId: 9 });

      await waitFor(() =>
        expect(api.updateNotebookTree).toHaveBeenCalledWith(
          "笔记本1",
          expect.objectContaining({
            freeNodeIds: [],
          }),
        ),
      );
      expect(await screen.findByRole("button", { name: "拖动节点 自由节点" })).toBeInTheDocument();
      expect(within(tray).queryByRole("button", { name: "自由节点" })).not.toBeInTheDocument();
    } finally {
      rectSpy.mockRestore();
      document.elementFromPoint = originalElementFromPoint;
    }
  });

  it("highlights nearby drop zones during native dragging from the tray", async () => {
    const tree = {
      ...treeWithNode,
      nodes: [...treeWithNode.nodes, freeNode],
      freeNodeIds: [freeNode.id],
    };
    const api = makeApi({ getNotebookTree: vi.fn().mockResolvedValue({ tree }) });
    const originalElementFromPoint = document.elementFromPoint;
    render(<App api={api} />);
    await login();

    const tray = screen.getByRole("tabpanel", { name: "自由节点" });
    const trayButton = await within(tray).findByRole("button", { name: "自由节点" });
    const trayItem = trayButton.closest(".node-tray-item");
    const rootDropZone = screen.getByRole("button", { name: "给 笔记本1 添加子节点" });
    const rectSpy = mockDropZoneRect(rootDropZone);
    document.elementFromPoint = vi.fn().mockReturnValue(document.body);

    try {
      fireEvent.dragStart(trayItem as Element, { dataTransfer: createDataTransfer() });
      dispatchWindowDragEvent("dragover", 64, 64);

      await waitFor(() => expect(rootDropZone).toHaveAttribute("data-active", "true"));

      fireEvent.dragEnd(trayItem as Element, { clientX: 0, clientY: 0 });

      await waitFor(() => expect(rootDropZone).toHaveAttribute("data-active", "false"));
      await waitFor(() =>
        expect(api.updateNotebookTree).toHaveBeenCalledWith(
          "笔记本1",
          expect.objectContaining({
            freeNodeIds: [],
          }),
        ),
      );
    } finally {
      rectSpy.mockRestore();
      document.elementFromPoint = originalElementFromPoint;
    }
  });

  it("highlights drop zones while pointer dragging deleted nodes", async () => {
    const deletedTree = { ...treeWithNode, deletedNodeIds: ["node-1"], edges: [] };
    const api = makeApi({ getNotebookTree: vi.fn().mockResolvedValue({ tree: deletedTree }) });
    const originalElementFromPoint = document.elementFromPoint;
    render(<App api={api} />);
    await login();

    fireEvent.click(screen.getByRole("tab", { name: "被删除节点" }));
    const tray = screen.getByRole("tabpanel", { name: "被删除节点" });
    const trayButton = await within(tray).findByRole("button", { name: "节点一" });
    const trayItem = trayButton.closest(".node-tray-item");
    const rootDropZone = screen.getByRole("button", { name: "给 笔记本1 添加子节点" });
    const rectSpy = mockDropZoneRect(rootDropZone);
    document.elementFromPoint = vi.fn().mockReturnValue(document.body);

    try {
      fireEvent.pointerDown(trayItem as Element, { clientX: 24, clientY: 24, pointerId: 10 });
      fireEvent.pointerMove(trayItem as Element, { clientX: 64, clientY: 64, pointerId: 10 });

      expect(rootDropZone).toHaveAttribute("data-active", "true");

      fireEvent.pointerCancel(trayItem as Element, { pointerId: 10 });

      expect(rootDropZone).toHaveAttribute("data-active", "false");
    } finally {
      rectSpy.mockRestore();
      document.elementFromPoint = originalElementFromPoint;
    }
  });

  it("places selected tray nodes into the tree by clicking a drop zone", async () => {
    const tree = {
      ...treeWithNode,
      nodes: [...treeWithNode.nodes, freeNode],
      freeNodeIds: [freeNode.id],
    };
    const api = makeApi({ getNotebookTree: vi.fn().mockResolvedValue({ tree }) });
    render(<App api={api} />);
    await login();

    fireEvent.click(await screen.findByRole("button", { name: "选择放入树中 自由节点" }));
    fireEvent.click(screen.getByRole("button", { name: "给 笔记本1 添加子节点" }));

    await waitFor(() =>
      expect(api.updateNotebookTree).toHaveBeenCalledWith(
        "笔记本1",
        expect.objectContaining({
          freeNodeIds: [],
        }),
      ),
    );
    expect(await screen.findByRole("button", { name: "拖动节点 自由节点" })).toBeInTheDocument();
  });

  it("moves leaf nodes into the deleted tray through the delete dialog", async () => {
    const api = makeApi();
    render(<App api={api} />);
    await login();

    fireEvent.click(await screen.findByRole("button", { name: "删除节点 节点一" }));
    expect(screen.getByRole("dialog", { name: "删除节点" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "移入被删除节点" }));

    await waitFor(() =>
      expect(api.updateNotebookTree).toHaveBeenCalledWith(
        "笔记本1",
        expect.objectContaining({
          deletedNodeIds: ["node-1"],
        }),
      ),
    );
    fireEvent.click(screen.getByRole("tab", { name: "被删除节点" }));
    expect(await screen.findByRole("button", { name: "彻底删除 节点一" })).toBeInTheDocument();
  });

  it("promotes children when deleting only the selected parent node", async () => {
    const childNode = {
      id: "node-2",
      title: "子节点",
      textFile: "子节点.md",
      voiceDir: "../voice/子节点",
      imgDir: "../img/子节点",
    };
    const tree = {
      ...treeWithNode,
      nodes: [...treeWithNode.nodes, childNode],
      edges: [...treeWithNode.edges, { from: "node-1", to: "node-2", side: "right" as const, order: 0 }],
    };
    const api = makeApi({ getNotebookTree: vi.fn().mockResolvedValue({ tree }) });
    render(<App api={api} />);
    await login();

    fireEvent.click(await screen.findByRole("button", { name: "删除节点 节点一" }));
    expect(screen.getByRole("button", { name: "连带删除子树" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "仅删除此节点" }));

    await waitFor(() =>
      expect(api.updateNotebookTree).toHaveBeenCalledWith(
        "笔记本1",
        expect.objectContaining({
          deletedNodeIds: ["node-1"],
          edges: [{ from: "__notesheep_notebook_root__", to: "node-2", side: "right", order: 0 }],
        }),
      ),
    );
    expect(await screen.findByRole("button", { name: "拖动节点 子节点" })).toBeInTheDocument();
  });
});

async function login() {
  fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
  fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
  fireEvent.click(screen.getByRole("button", { name: "登录" }));
  await screen.findByRole("button", { name: "打开笔记本 笔记本1" });
}

function mockDropZoneRect(element: HTMLElement) {
  return vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    bottom: 78,
    height: 28,
    left: 50,
    right: 78,
    top: 50,
    width: 28,
    x: 50,
    y: 50,
    toJSON: () => ({}),
  } as DOMRect);
}

function createDataTransfer() {
  const data = new Map<string, string>();
  return {
    effectAllowed: "move",
    getData: vi.fn((type: string) => data.get(type) ?? ""),
    setData: vi.fn((type: string, value: string) => data.set(type, value)),
  } as unknown as DataTransfer;
}

function dispatchWindowDragEvent(type: "dragover" | "drop", clientX = 0, clientY = 0) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clientX", { value: clientX });
  Object.defineProperty(event, "clientY", { value: clientY });
  window.dispatchEvent(event);
}
