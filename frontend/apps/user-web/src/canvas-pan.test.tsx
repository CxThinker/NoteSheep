import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { makeApi, resetAppTestEnvironment } from "./testUtils";

describe("Canvas pan", () => {
  beforeEach(() => {
    resetAppTestEnvironment();
    mockTreeBoardWidth(800);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("centers the root node horizontally when entering a notebook", async () => {
    render(<App api={makeApi()} />);
    const treeBoard = await login();

    await waitForRootCenter(treeBoard);

    expect(treeBoard.querySelector(".mind-map-shell")).toHaveStyle({
      paddingLeft: "400px",
      paddingRight: "400px",
      width: "1240px",
    });
  });

  it("pans the tree board by dragging a blank area with the left button", async () => {
    render(<App api={makeApi()} />);
    const treeBoard = await login();
    await waitForRootCenter(treeBoard);

    treeBoard.scrollLeft = 120;
    treeBoard.scrollTop = 90;

    fireEvent.pointerDown(treeBoard, { button: 0, buttons: 1, clientX: 100, clientY: 100, pointerId: 30 });
    expect(treeBoard).toHaveAttribute("data-panning", "true");

    fireEvent.pointerMove(treeBoard, { buttons: 1, clientX: 70, clientY: 60, pointerId: 30 });

    expect(treeBoard.scrollLeft).toBe(150);
    expect(treeBoard.scrollTop).toBe(130);

    fireEvent.pointerUp(treeBoard, { buttons: 0, clientX: 70, clientY: 60, pointerId: 30 });
    expect(treeBoard).toHaveAttribute("data-panning", "false");
  });

  it("does not pan the tree board when dragging starts on a node", async () => {
    render(<App api={makeApi()} />);
    const treeBoard = await login();
    await waitForRootCenter(treeBoard);

    const node = await screen.findByRole("button", { name: "拖动节点 节点一" });
    treeBoard.scrollLeft = 120;
    treeBoard.scrollTop = 90;

    fireEvent.pointerDown(node, { button: 0, buttons: 1, clientX: 100, clientY: 100, pointerId: 31 });
    fireEvent.pointerMove(treeBoard, { buttons: 1, clientX: 70, clientY: 60, pointerId: 31 });

    expect(treeBoard).toHaveAttribute("data-panning", "false");
    expect(treeBoard.scrollLeft).toBe(120);
    expect(treeBoard.scrollTop).toBe(90);
  });
});

async function login() {
  fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
  fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
  fireEvent.click(screen.getByRole("button", { name: "登录" }));
  await screen.findByRole("button", { name: "打开笔记本 笔记本1" });
  const treeBoard = screen.getByLabelText("树状图画布");
  await screen.findByRole("button", { name: "拖动节点 节点一" });
  return treeBoard;
}

async function waitForRootCenter(treeBoard: HTMLElement) {
  await waitFor(() => expect(treeBoard.scrollLeft).toBe(220));
}

function mockTreeBoardWidth(width: number) {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
    return this.classList.contains("tree-board") ? width : 0;
  });
}
