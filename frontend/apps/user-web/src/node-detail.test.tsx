import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App, readScrollbarState } from "./App";
import { emptyTree, installMediaRecorderMock, makeApi, MockMediaRecorder, resetAppTestEnvironment, treeWithNode } from "./testUtils";

describe("Node detail", () => {
  beforeEach(resetAppTestEnvironment);

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
    expect(within(dialog).getByText("2026-07-12 08:09")).toBeInTheDocument();
    expect(await within(dialog).findByText("notes/笔记本1/note/节点一.md")).toBeInTheDocument();
    expect(within(dialog).getByText("节点正文")).toBeInTheDocument();
    expect(within(dialog).getByText("图片路径").closest("[data-panel-open]")).toHaveAttribute(
      "data-panel-open",
      "false"
    );
    expect(within(dialog).getByLabelText("图片内容")).toHaveAttribute("data-panel-open", "false");
    vi.useFakeTimers();
    act(() => {
      fireEvent.click(within(dialog).getByRole("button", { name: "展开图片" }));
    });
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

  it("keeps image sections and panel toggles available when detail loading fails", async () => {
    const api = makeApi({
      getNodeDetail: vi.fn().mockRejectedValue(new Error("Request failed.")),
    });
    render(<App api={api} />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    const node = await screen.findByRole("button", { name: "拖动节点 节点一" });
    fireEvent.pointerDown(node, { clientX: 100, clientY: 100, pointerId: 7 });
    fireEvent.pointerUp(node, { clientX: 100, clientY: 100, pointerId: 7 });

    const dialog = screen.getByRole("dialog", { name: "节点详情" });
    expect(await within(dialog).findByText("节点详情读取失败，请稍后重试。")).toBeInTheDocument();
    expect(within(dialog).queryByText("Request failed.")).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText("文本内容")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("图片内容")).toHaveAttribute("data-panel-open", "false");
    expect(within(dialog).getByRole("button", { name: "展开图片" })).toBeEnabled();
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


});
