import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { App } from "./App";
import { makeApi, resetAppTestEnvironment } from "./testUtils";

describe("Canvas pan", () => {
  beforeEach(resetAppTestEnvironment);

  it("pans the tree board by dragging a blank area with the left button", async () => {
    render(<App api={makeApi()} />);
    await login();

    const treeBoard = screen.getByLabelText("树状图画布");
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
    await login();

    const treeBoard = screen.getByLabelText("树状图画布");
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
}
