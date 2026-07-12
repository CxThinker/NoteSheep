import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App, readScrollbarState } from "./App";
import { emptyTree, installMediaRecorderMock, makeApi, MockMediaRecorder, resetAppTestEnvironment, treeWithNode } from "./testUtils";

describe("Workspace shell", () => {
  beforeEach(resetAppTestEnvironment);

  it("shows the notebook scrollbar, notebooks, and selected notebook tree", async () => {
    const api = makeApi();
    render(<App api={api} />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByRole("button", { name: "打开笔记本 笔记本1" })).toBeInTheDocument();
    expect(await screen.findByText("节点一")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "根节点 笔记本1" })).toBeInTheDocument();
    expect(api.listNotebooks).toHaveBeenCalled();
    expect(api.getNotebookTree).toHaveBeenCalledWith("笔记本1");
    expect(screen.queryByLabelText("活动条")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "笔记本页" })).not.toBeInTheDocument();
    expect(document.querySelector(".notebook-sidebar-shell")).toBeInTheDocument();
    expect(screen.getByRole("scrollbar", { name: "笔记本滚动条" })).toHaveAttribute(
      "aria-controls",
      "notebook-sidebar-scroll"
    );
    expect(screen.getByRole("tab", { name: "笔记本" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "已删除笔记本" })).toBeInTheDocument();
    expect(screen.getByLabelText("笔记本列表")).toBeInTheDocument();
    expect(screen.getByRole("scrollbar", { name: "节点托盘滚动条" })).toHaveAttribute("aria-controls", "node-tray-scroll");
    expect(screen.getByRole("tab", { name: "自由节点" })).toBeInTheDocument();
    expect(screen.getByLabelText("笔记本树状图")).toBeInTheDocument();
    expect(screen.getByLabelText("工作区")).toHaveClass("workspace-frame");
  });

  it("collapses and expands the sidebar while clearing tray selection", async () => {
    const freeNode = {
      id: "free-1",
      title: "自由节点",
      textFile: "自由节点.md",
      voiceDir: "../voice/自由节点",
      imgDir: "../img/自由节点",
    };
    const api = makeApi({
      getNotebookTree: vi.fn().mockResolvedValue({
        tree: { ...treeWithNode, nodes: [...treeWithNode.nodes, freeNode], freeNodeIds: [freeNode.id] },
      }),
    });
    render(<App api={api} />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    const workspace = await screen.findByLabelText("工作区");
    const selectTrayNode = await screen.findByRole("button", { name: "选择放入树中 自由节点" });
    fireEvent.click(selectTrayNode);
    expect(selectTrayNode).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "收起侧栏" }));

    expect(workspace).toHaveAttribute("data-sidebar-collapsed", "true");
    expect(screen.getByRole("button", { name: "展开侧栏" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "打开笔记本 笔记本1" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "自由节点" })).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "根节点 笔记本1" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "展开侧栏" }));

    expect(workspace).toHaveAttribute("data-sidebar-collapsed", "false");
    expect(await screen.findByRole("button", { name: "打开笔记本 笔记本1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "选择放入树中 自由节点" })).toHaveAttribute("aria-pressed", "false");
  });

  it("shows a notebook load error when the notebook list cannot be read", async () => {
    const api = makeApi({
      listNotebooks: vi.fn().mockRejectedValue(new Error("Failed to fetch")),
    });
    render(<App api={api} />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByText("笔记本读取失败，请稍后重试。")).toBeInTheDocument();
    expect(screen.getByText("暂无笔记本")).toBeInTheDocument();
    expect(screen.queryByText("Failed to fetch")).not.toBeInTheDocument();
  });

  it("shows a notebook content load error when the selected tree cannot be read", async () => {
    const api = makeApi({
      getNotebookTree: vi.fn().mockRejectedValue(new Error("Failed to fetch")),
    });
    render(<App api={api} />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByRole("button", { name: "打开笔记本 笔记本1" })).toBeInTheDocument();
    expect(await screen.findByText("笔记本内容读取失败，请稍后重试。")).toBeInTheDocument();
    expect(screen.queryByText("Failed to fetch")).not.toBeInTheDocument();
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

  it("changes theme, UI language, and neon text color from settings", async () => {
    const api = makeApi();
    render(<App api={api} />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    fireEvent.click(await screen.findByRole("button", { name: "打开设置" }));
    expect(screen.getByRole("dialog", { name: "设置" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "界面语言" }));
    fireEvent.click(screen.getByRole("button", { name: "English" }));

    expect(localStorage.getItem("notesheep-language")).toBe("en-US");
    expect(document.documentElement).toHaveAttribute("lang", "en-US");
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Theme & font" }));
    fireEvent.click(screen.getByRole("button", { name: "Neon" }));
    fireEvent.click(screen.getByRole("button", { name: "Orange" }));

    expect(localStorage.getItem("notesheep-theme")).toBe("neon");
    expect(localStorage.getItem("notesheep-neon-text-color")).toBe("orange");
    expect(document.documentElement).toHaveAttribute("data-theme", "neon");
    expect(document.documentElement).toHaveAttribute("data-neon-text-color", "orange");
    expect(document.documentElement.style.getPropertyValue("--neon-text-color")).toBe("#ff9f1c");
    expect(screen.queryByRole("button", { name: "Purple" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "紫" })).not.toBeInTheDocument();
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


});
