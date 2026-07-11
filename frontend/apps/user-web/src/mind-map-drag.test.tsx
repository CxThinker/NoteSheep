import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App, readScrollbarState } from "./App";
import { emptyTree, installMediaRecorderMock, makeApi, MockMediaRecorder, resetAppTestEnvironment, treeWithNode } from "./testUtils";

describe("Mind map drag", () => {
  beforeEach(resetAppTestEnvironment);

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


});
