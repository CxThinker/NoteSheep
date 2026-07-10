import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App, readScrollbarState } from "./App";
import type { AuthApi, NotebookTree } from "@notesheep/api-client";

const emptyTree: NotebookTree = {
  rootId: null,
  nodes: [],
  edges: []
};

const treeWithNode: NotebookTree = {
  rootId: "__notesheep_notebook_root__",
  nodes: [
    {
      id: "node-1",
      title: "节点一",
      textFile: "节点一.md",
      voiceDir: "../voice/节点一",
      imgDir: "../img/节点一"
    }
  ],
  edges: [{ from: "__notesheep_notebook_root__", to: "node-1", side: "right", order: 0 }]
};

function makeApi(overrides: Partial<AuthApi> = {}): AuthApi {
  return {
    register: vi.fn().mockResolvedValue({ user: { id: 1, username: "new-user" } }),
    login: vi.fn().mockResolvedValue({ user: { id: 2, username: "note-taker" } }),
    me: vi.fn().mockRejectedValue(new Error("Not authenticated.")),
    logout: vi.fn().mockResolvedValue(undefined),
    listFolders: vi.fn().mockResolvedValue({
      folders: [{ id: 1, name: "笔记本1", sortOrder: 0 }]
    }),
    listNotebooks: vi.fn().mockResolvedValue({
      notebooks: [{ name: "笔记本1" }]
    }),
    createNotebook: vi.fn().mockResolvedValue({ notebook: { name: "笔记本1" } }),
    renameNotebook: vi.fn().mockResolvedValue({ notebook: { name: "笔记本2" } }),
    getNotebookTree: vi.fn().mockResolvedValue({ tree: treeWithNode }),
    getNodeDetail: vi.fn().mockResolvedValue({
      detail: {
        node: treeWithNode.nodes[0],
        textPath: "notes/笔记本1/note/节点一.md",
        textContent: "节点正文",
        imagePath: "notes/笔记本1/img/节点一/",
        images: [],
        voicePath: "notes/笔记本1/voice/节点一/",
        voices: []
      }
    }),
    createNode: vi.fn().mockResolvedValue({
      node: treeWithNode.nodes[0],
      tree: treeWithNode
    }),
    updateNotebookTree: vi.fn().mockImplementation((_, tree) => Promise.resolve({ tree })),
    ...overrides
  };
}

describe("Auth screen", () => {
  beforeEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    document.documentElement.dataset.theme = "";
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
  });

  it("switches between login and register modes", async () => {
    render(<App api={makeApi()} />);

    expect(screen.getByRole("heading", { name: "欢迎回到 NoteSheep" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "创建账号" }));

    expect(screen.getByRole("heading", { name: "创建 NoteSheep 账号" })).toBeInTheDocument();
  });

  it("blocks submit when password is shorter than 6 characters", async () => {
    const api = makeApi();
    render(<App api={api} />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "shorty" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "12345" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(screen.getByText("密码至少需要 6 个字符。")).toBeInTheDocument();
    expect(api.login).not.toHaveBeenCalled();
  });

  it("persists the selected neon theme", async () => {
    render(<App api={makeApi()} />);

    fireEvent.click(screen.getByRole("button", { name: "Neon 霓虹" }));

    expect(localStorage.getItem("notesheep-theme")).toBe("neon");
    expect(document.documentElement).toHaveAttribute("data-theme", "neon");
  });

  it("logs in and shows the v1 shell", async () => {
    const api = makeApi();
    render(<App api={api} />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "NoteSheep" })).toBeInTheDocument();
    });
    expect(api.login).toHaveBeenCalledWith({ username: "note-taker", password: "secret1" });
  });

  it("shows the notebook scrollbar, notebooks, and selected notebook tree", async () => {
    const api = makeApi();
    render(<App api={api} />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByRole("button", { name: "笔记本1" })).toBeInTheDocument();
    expect(await screen.findByText("节点一")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "根节点 笔记本1" })).toBeInTheDocument();
    expect(api.listNotebooks).toHaveBeenCalled();
    expect(api.getNotebookTree).toHaveBeenCalledWith("笔记本1");
    expect(screen.queryByLabelText("活动条")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "笔记本页" })).not.toBeInTheDocument();
    expect(document.querySelector(".notebook-scroll-shell")).toBeInTheDocument();
    expect(screen.getByRole("scrollbar", { name: "笔记本滚动条" })).toHaveAttribute(
      "aria-controls",
      "notebook-sidebar-scroll"
    );
    expect(screen.getByLabelText("笔记本列表")).toBeInTheDocument();
    expect(screen.getByLabelText("笔记本树状图")).toBeInTheDocument();
    expect(screen.getByLabelText("工作区")).toHaveClass("workspace-frame");
  });

  it("zooms the notebook tree workspace with controls and mouse wheel", async () => {
    const api = makeApi();
    render(<App api={api} />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    const currentZoom = await screen.findByLabelText("当前缩放");
    const treeBoard = await screen.findByLabelText("树状图画布");
    expect(currentZoom).toHaveTextContent("100%");

    fireEvent.click(screen.getByRole("button", { name: "放大" }));
    expect(currentZoom).toHaveTextContent("110%");

    fireEvent.wheel(treeBoard, { deltaY: 100 });
    expect(currentZoom).toHaveTextContent("100%");

    fireEvent.wheel(treeBoard, { deltaY: -100 });
    expect(currentZoom).toHaveTextContent("110%");

    fireEvent.click(screen.getByRole("button", { name: "缩小" }));
    expect(currentZoom).toHaveTextContent("100%");

    fireEvent.click(screen.getByRole("button", { name: "放大" }));
    expect(currentZoom).toHaveTextContent("110%");

    fireEvent.click(screen.getByRole("button", { name: "重置缩放" }));
    expect(currentZoom).toHaveTextContent("100%");
  });

  it("calculates a full-height notebook scrollbar until the notebook column overflows", () => {
    const element = document.createElement("div");
    Object.defineProperties(element, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 100 },
      scrollTop: { configurable: true, value: 0, writable: true }
    });

    expect(readScrollbarState(element)).toEqual({
      thumbHeight: 100,
      thumbTop: 0,
      valueMax: 0,
      valueNow: 0
    });

    Object.defineProperties(element, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 400 },
      scrollTop: { configurable: true, value: 150, writable: true }
    });

    expect(readScrollbarState(element)).toEqual({
      thumbHeight: 48,
      thumbTop: 26,
      valueMax: 300,
      valueNow: 150
    });
  });

  it("opens a modal to create a notebook from the shell", async () => {
    const api = makeApi({
      listNotebooks: vi
        .fn()
        .mockResolvedValueOnce({ notebooks: [] })
        .mockResolvedValueOnce({ notebooks: [{ name: "笔记本1" }] }),
      getNotebookTree: vi.fn().mockResolvedValue({ tree: emptyTree })
    });
    render(<App api={api} />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => {
      expect(screen.getByText("暂无笔记本")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "+ 创建新笔记本" }));
    expect(screen.getByRole("dialog", { name: "创建新笔记本" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("笔记本名称"), { target: { value: "笔记本1" } });
    fireEvent.click(screen.getByRole("button", { name: "创建笔记本" }));

    await waitFor(() => {
      expect(api.createNotebook).toHaveBeenCalledWith({ name: "笔记本1" });
    });
    expect(await screen.findByRole("button", { name: "笔记本1" })).toBeInTheDocument();
  });

  it("uses the floating pen button to create a node inside the selected notebook", async () => {
    const api = makeApi({
      getNotebookTree: vi.fn().mockResolvedValue({ tree: emptyTree })
    });
    render(<App api={api} />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    await screen.findByRole("button", { name: "笔记本1" });
    fireEvent.click(screen.getByRole("button", { name: "创建节点" }));
    expect(screen.getByRole("dialog", { name: "添加子节点" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("节点名称"), { target: { value: "节点一" } });
    fireEvent.click(screen.getByRole("button", { name: "保存节点" }));

    await waitFor(() => {
      expect(api.createNode).toHaveBeenCalledWith("笔记本1", {
        title: "节点一",
        parentId: "__notesheep_notebook_root__"
      });
    });
    expect(await screen.findByText("节点一")).toBeInTheDocument();
  });

  it("creates child and sibling nodes from node drop zones", async () => {
    const api = makeApi({
      createNode: vi
        .fn()
        .mockResolvedValueOnce({
          node: {
            id: "node-2",
            title: "子节点",
            textFile: "子节点.md",
            voiceDir: "../voice/子节点",
            imgDir: "../img/子节点"
          },
          tree: {
            ...treeWithNode,
            nodes: [
              ...treeWithNode.nodes,
              {
                id: "node-2",
                title: "子节点",
                textFile: "子节点.md",
                voiceDir: "../voice/子节点",
                imgDir: "../img/子节点"
              }
            ],
            edges: [...treeWithNode.edges, { from: "node-1", to: "node-2", side: "right", order: 0 }]
          }
        })
        .mockResolvedValueOnce({
          node: {
            id: "node-3",
            title: "兄弟节点",
            textFile: "兄弟节点.md",
            voiceDir: "../voice/兄弟节点",
            imgDir: "../img/兄弟节点"
          },
          tree: {
            ...treeWithNode,
            nodes: [
              ...treeWithNode.nodes,
              {
                id: "node-3",
                title: "兄弟节点",
                textFile: "兄弟节点.md",
                voiceDir: "../voice/兄弟节点",
                imgDir: "../img/兄弟节点"
              }
            ],
            edges: [
              ...treeWithNode.edges,
              { from: "__notesheep_notebook_root__", to: "node-3", side: "right", order: 1 }
            ]
          }
        }),
      updateNotebookTree: vi.fn().mockImplementation((_, tree) => Promise.resolve({ tree }))
    });
    render(<App api={api} />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByRole("button", { name: "给 节点一 添加子节点" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "给 节点一 添加子节点" }));
    expect(screen.getByRole("dialog", { name: "添加子节点" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("节点名称"), { target: { value: "子节点" } });
    fireEvent.click(screen.getByRole("button", { name: "保存节点" }));

    await waitFor(() => {
      expect(api.createNode).toHaveBeenCalledWith("笔记本1", { title: "子节点", parentId: "node-1" });
    });

    expect(await screen.findByRole("button", { name: "在 节点一 右侧添加兄弟节点" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "在 节点一 右侧添加兄弟节点" }));
    expect(screen.getByRole("dialog", { name: "添加兄弟节点" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("节点名称"), { target: { value: "兄弟节点" } });
    fireEvent.click(screen.getByRole("button", { name: "保存节点" }));

    await waitFor(() => {
      expect(api.createNode).toHaveBeenCalledWith("笔记本1", {
        title: "兄弟节点",
        parentId: "__notesheep_notebook_root__"
      });
    });
    expect(api.updateNotebookTree).toHaveBeenCalled();
  });

  it("submits optional node detail content when creating a node", async () => {
    const api = makeApi();
    const image = new File(["fake-image"], "图一.png", { type: "image/png" });
    const voice = new File(["fake-audio"], "录音.mp3", { type: "audio/mpeg" });
    render(<App api={api} />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByRole("button", { name: "给 节点一 添加子节点" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "给 节点一 添加子节点" }));
    fireEvent.change(screen.getByLabelText("节点名称"), { target: { value: "带内容节点" } });
    fireEvent.change(screen.getByLabelText("文本内容"), { target: { value: "创建时写入正文" } });
    fireEvent.change(screen.getByLabelText("图片文件"), { target: { files: [image] } });
    fireEvent.change(screen.getByLabelText("音频文件"), { target: { files: [voice] } });
    fireEvent.click(screen.getByRole("button", { name: "保存节点" }));

    await waitFor(() => {
      expect(api.createNode).toHaveBeenCalledWith("笔记本1", {
        title: "带内容节点",
        parentId: "node-1",
        textContent: "创建时写入正文",
        images: [image],
        voices: [voice]
      });
    });
  });

  it("opens read-only node details when clicking a regular node", async () => {
    const api = makeApi();
    render(<App api={api} />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    const node = await screen.findByRole("button", { name: "拖动节点 节点一" });
    fireEvent.pointerDown(node, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(node, { clientX: 100, clientY: 100, pointerId: 1 });

    const dialog = screen.getByRole("dialog", { name: "节点详情" });
    expect(dialog).toBeInTheDocument();
    expect(api.getNodeDetail).toHaveBeenCalledWith("笔记本1", "node-1");
    expect(within(dialog).getByText("节点")).toBeInTheDocument();
    expect(within(dialog).getByText("1-1")).toBeInTheDocument();
    expect(await within(dialog).findByText("notes/笔记本1/note/节点一.md")).toBeInTheDocument();
    expect(within(dialog).getByText("节点正文")).toBeInTheDocument();
    expect(within(dialog).getByText("图片路径").closest("[data-panel-open]")).toHaveAttribute(
      "data-panel-open",
      "false"
    );
    expect(within(dialog).getByLabelText("图片内容")).toHaveAttribute("data-panel-open", "false");
    vi.useFakeTimers();
    fireEvent.click(within(dialog).getByRole("button", { name: "展开图片" }));
    expect(within(dialog).getByText("图片路径").closest("[data-panel-open]")).toHaveAttribute(
      "data-panel-open",
      "true"
    );
    expect(within(dialog).getByLabelText("图片内容")).toBeInTheDocument();
    expect(within(dialog).getByText("暂无图片内容")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "收起文本" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "收起图片" })).toBeDisabled();
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(within(dialog).getByRole("button", { name: "收起文本" })).toBeEnabled();
    expect(within(dialog).getByRole("button", { name: "收起图片" })).toBeEnabled();
    vi.useRealTimers();
  });

  it("opens image detail sections by default when a node has images", async () => {
    const api = makeApi({
      getNodeDetail: vi.fn().mockResolvedValue({
        detail: {
          node: treeWithNode.nodes[0],
          textPath: "notes/笔记本1/note/节点一.md",
          textContent: "节点正文",
          imagePath: "notes/笔记本1/img/节点一/",
          images: [
            {
              name: "图一.png",
              path: "notes/笔记本1/img/节点一/图一.png",
              mediaType: "image/png",
              url: "/api/notebooks/笔记本1/nodes/node-1/assets/images/图一.png"
            }
          ],
          voicePath: "notes/笔记本1/voice/节点一/",
          voices: []
        }
      })
    });
    render(<App api={api} />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    const node = await screen.findByRole("button", { name: "拖动节点 节点一" });
    fireEvent.pointerDown(node, { clientX: 100, clientY: 100, pointerId: 6 });
    fireEvent.pointerUp(node, { clientX: 100, clientY: 100, pointerId: 6 });

    const dialog = screen.getByRole("dialog", { name: "节点详情" });
    expect(await within(dialog).findByRole("button", { name: "收起图片" })).toBeInTheDocument();
    expect(within(dialog).getByText("图片路径").closest("[data-panel-open]")).toHaveAttribute(
      "data-panel-open",
      "true"
    );
    expect(within(dialog).getByLabelText("图片内容")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "收起文本" })).toBeEnabled();

    vi.useFakeTimers();
    fireEvent.click(within(dialog).getByRole("button", { name: "收起文本" }));
    expect(within(dialog).getByText("文本路径").closest("[data-panel-open]")).toHaveAttribute(
      "data-panel-open",
      "false"
    );
    expect(within(dialog).getByLabelText("文本内容")).toHaveAttribute("data-panel-open", "false");
    expect(within(dialog).getByRole("button", { name: "展开文本" })).toBeDisabled();
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(within(dialog).getByRole("button", { name: "展开文本" })).toBeEnabled();

    fireEvent.click(within(dialog).getByRole("button", { name: "展开文本" }));
    expect(within(dialog).getByText("文本路径").closest("[data-panel-open]")).toHaveAttribute(
      "data-panel-open",
      "true"
    );
    expect(within(dialog).getByLabelText("文本内容")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "收起文本" })).toBeDisabled();
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(within(dialog).getByRole("button", { name: "收起文本" })).toBeEnabled();
    vi.useRealTimers();
  });

  it("opens notebook details when clicking the root node", async () => {
    const api = makeApi();
    render(<App api={api} />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    const rootNode = await screen.findByRole("group", { name: "根节点 笔记本1" });
    fireEvent.pointerDown(rootNode, { clientX: 120, clientY: 120, pointerId: 2 });
    fireEvent.pointerUp(rootNode, { clientX: 120, clientY: 120, pointerId: 2 });

    const dialog = screen.getByRole("dialog", { name: "笔记本详情" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("当前笔记本")).toBeInTheDocument();
  });

  it("starts node dragging only after a long press", async () => {
    const api = makeApi();
    const originalElementFromPoint = document.elementFromPoint;
    render(<App api={api} />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    const node = await screen.findByRole("button", { name: "拖动节点 节点一" });
    const rootDropZone = await screen.findByRole("button", { name: "给 笔记本1 添加子节点" });
    document.elementFromPoint = vi.fn().mockReturnValue(rootDropZone);
    vi.useFakeTimers();

    try {
      fireEvent.pointerDown(node, { clientX: 100, clientY: 100, pointerId: 3 });
      act(() => {
        vi.advanceTimersByTime(449);
      });

      expect(document.querySelector(".mind-map-drag-ghost")).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(document.querySelector(".mind-map-drag-ghost")).toBeInTheDocument();
      fireEvent.pointerMove(node, { clientX: 130, clientY: 130, pointerId: 3 });
      fireEvent.pointerUp(node, { clientX: 130, clientY: 130, pointerId: 3 });

      await act(async () => {
        await Promise.resolve();
      });
      expect(api.updateNotebookTree).toHaveBeenCalled();
      expect(screen.queryByRole("dialog", { name: "节点详情" })).not.toBeInTheDocument();
    } finally {
      document.elementFromPoint = originalElementFromPoint;
      vi.useRealTimers();
    }
  });

  it("registers a new account from register mode", async () => {
    const api = makeApi({
      login: vi.fn().mockResolvedValue({ user: { id: 1, username: "new-user" } })
    });
    render(<App api={api} />);

    fireEvent.click(screen.getByRole("button", { name: "创建账号" }));
    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "new-user" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "注册" }));

    await waitFor(() => {
      expect(api.register).toHaveBeenCalledWith({ username: "new-user", password: "secret1" });
    });
    expect(api.login).toHaveBeenCalledWith({ username: "new-user", password: "secret1" });
  });
});
