import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { emptyTree, makeApi, resetAppTestEnvironment } from "./testUtils";

describe("Workspace notebook lifecycle", () => {
  beforeEach(() => {
    resetAppTestEnvironment();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("deletes, restores, and permanently deletes a notebook from the sidebar", async () => {
    const activeNotebooks = [{ name: "笔记本1" }, { name: "笔记本2" }];
    const deletedNotebooks: { id: string; name: string }[] = [];
    const api = makeApi({
      deleteNotebook: vi.fn().mockImplementation(async (name: string) => {
        activeNotebooks.splice(activeNotebooks.findIndex((notebook) => notebook.name === name), 1);
        deletedNotebooks.push({ id: "deleted-1", name });
        return { notebook: deletedNotebooks[0] };
      }),
      getNotebookTree: vi.fn().mockResolvedValue({ tree: emptyTree }),
      listDeletedNotebooks: vi.fn().mockImplementation(async () => ({ notebooks: [...deletedNotebooks] })),
      listNotebooks: vi.fn().mockImplementation(async () => ({ notebooks: [...activeNotebooks] })),
      permanentDeleteNotebook: vi.fn().mockImplementation(async (id: string) => {
        deletedNotebooks.splice(deletedNotebooks.findIndex((notebook) => notebook.id === id), 1);
      }),
      restoreDeletedNotebook: vi.fn().mockImplementation(async (id: string) => {
        const restored = deletedNotebooks.find((notebook) => notebook.id === id)!;
        deletedNotebooks.splice(deletedNotebooks.indexOf(restored), 1);
        activeNotebooks.push({ name: restored.name });
        return { notebook: { name: restored.name } };
      }),
    });
    render(<App api={api} />);

    login();
    expect(await screen.findByRole("button", { name: "打开笔记本 笔记本1" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "删除笔记本 笔记本1" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: "打开笔记本 笔记本1" })).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "打开笔记本 笔记本2" })).toHaveAttribute("data-active", "true");
    expect(screen.queryByRole("button", { name: "恢复笔记本 笔记本1" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "已删除笔记本" }));
    expect(screen.getByRole("button", { name: "恢复笔记本 笔记本1" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "恢复笔记本 笔记本1" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: "恢复笔记本 笔记本1" })).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("tab", { name: "笔记本" }));
    expect(screen.getByRole("button", { name: "打开笔记本 笔记本1" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "删除笔记本 笔记本1" }));
    fireEvent.click(screen.getByRole("tab", { name: "已删除笔记本" }));
    expect(await screen.findByRole("button", { name: "彻底删除笔记本 笔记本1" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "彻底删除笔记本 笔记本1" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: "恢复笔记本 笔记本1" })).not.toBeInTheDocument());
    expect(api.deleteNotebook).toHaveBeenCalledWith("笔记本1");
    expect(api.restoreDeletedNotebook).toHaveBeenCalledWith("deleted-1");
    expect(api.permanentDeleteNotebook).toHaveBeenCalledWith("deleted-1");
  });

  it("shows a localized error when notebook restore fails", async () => {
    const api = makeApi({
      listDeletedNotebooks: vi.fn().mockResolvedValue({ notebooks: [{ id: "deleted-1", name: "笔记本1" }] }),
      restoreDeletedNotebook: vi.fn().mockRejectedValue(new Error("Request failed.")),
    });
    render(<App api={api} />);

    login();
    fireEvent.click(await screen.findByRole("tab", { name: "已删除笔记本" }));
    fireEvent.click(await screen.findByRole("button", { name: "恢复笔记本 笔记本1" }));

    expect(await screen.findByText("笔记本恢复失败，请稍后重试。")).toBeInTheDocument();
    expect(screen.queryByText("Request failed.")).not.toBeInTheDocument();
  });
});

function login() {
  fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
  fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
  fireEvent.click(screen.getByRole("button", { name: "登录" }));
}
