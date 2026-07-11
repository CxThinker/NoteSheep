import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App, readScrollbarState } from "./App";
import { emptyTree, installMediaRecorderMock, makeApi, MockMediaRecorder, resetAppTestEnvironment, treeWithNode } from "./testUtils";

describe("Auth screen", () => {
  beforeEach(resetAppTestEnvironment);

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
