import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App, readScrollbarState } from "./App";
import { emptyTree, installMediaRecorderMock, makeApi, MockMediaRecorder, resetAppTestEnvironment, treeWithNode } from "./testUtils";

describe("Workspace node creation", () => {
  beforeEach(resetAppTestEnvironment);

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

  it("shows a localized error when notebook creation fails", async () => {
    const api = makeApi({
      createNotebook: vi.fn().mockRejectedValue(new Error("Failed to fetch")),
      listNotebooks: vi.fn().mockResolvedValue({ notebooks: [] }),
    });
    render(<App api={api} />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => {
      expect(screen.getByText("暂无笔记本")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "+ 创建新笔记本" }));
    fireEvent.change(screen.getByLabelText("笔记本名称"), { target: { value: "笔记本失败" } });
    fireEvent.click(screen.getByRole("button", { name: "创建笔记本" }));

    expect(await screen.findByText("笔记本操作失败，请稍后重试。")).toBeInTheDocument();
    expect(screen.queryByText("Failed to fetch")).not.toBeInTheDocument();
  });

  it("uses the floating pen button to create a free node", async () => {
    const api = makeApi({
      getNotebookTree: vi.fn().mockResolvedValue({ tree: emptyTree })
    });
    render(<App api={api} />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    await screen.findByRole("button", { name: "笔记本1" });
    fireEvent.click(screen.getByRole("button", { name: "创建节点" }));
    expect(screen.getByRole("dialog", { name: "创建新节点" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("节点名称"), { target: { value: "节点一" } });
    fireEvent.click(screen.getByRole("button", { name: "保存节点" }));

    await waitFor(() => {
      expect(api.createNode).toHaveBeenCalledWith("笔记本1", {
        title: "节点一",
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
});
