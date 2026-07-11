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


});
