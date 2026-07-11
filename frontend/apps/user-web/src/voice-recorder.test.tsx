import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App, readScrollbarState } from "./App";
import { emptyTree, installMediaRecorderMock, makeApi, MockMediaRecorder, resetAppTestEnvironment, treeWithNode } from "./testUtils";

describe("Voice recorder", () => {
  beforeEach(resetAppTestEnvironment);

  it("records microphone audio and submits it as a node voice file", async () => {
    const { getUserMedia, stopTrack } = installMediaRecorderMock();
    const api = makeApi();
    render(<App api={api} />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByRole("button", { name: "给 节点一 添加子节点" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "给 节点一 添加子节点" }));
    fireEvent.change(screen.getByLabelText("节点名称"), { target: { value: "现场录音节点" } });
    fireEvent.click(screen.getByRole("button", { name: "开始录音" }));

    await waitFor(() => {
      expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    });
    expect(screen.getByRole("button", { name: "保存节点" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "停止录音" }));

    await waitFor(() => {
      expect(screen.getByLabelText("录音预览")).toBeInTheDocument();
    });
    expect(stopTrack).toHaveBeenCalled();
    expect(screen.getByText(/现场录音-/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "保存节点" }));

    await waitFor(() => {
      expect(api.createNode).toHaveBeenCalledWith(
        "笔记本1",
        expect.objectContaining({
          title: "现场录音节点",
          parentId: "node-1",
          voices: [expect.any(File)]
        })
      );
    });
  });

  it("starts microphone recording under React StrictMode", async () => {
    const { getUserMedia } = installMediaRecorderMock();
    render(
      <StrictMode>
        <App api={makeApi()} />
      </StrictMode>,
    );

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByRole("button", { name: "给 节点一 添加子节点" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "给 节点一 添加子节点" }));
    fireEvent.click(screen.getByRole("button", { name: "开始录音" }));

    await waitFor(() => {
      expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    });

    expect(await screen.findByRole("button", { name: "停止录音" })).toBeEnabled();
  });

  it("keeps file upload available when microphone permission is rejected", async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException("Denied", "NotAllowedError"));
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia }
    });
    Object.defineProperty(globalThis, "MediaRecorder", {
      configurable: true,
      value: MockMediaRecorder
    });
    const api = makeApi();
    const voice = new File(["fake-audio"], "录音.mp3", { type: "audio/mpeg" });
    render(<App api={api} />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByRole("button", { name: "给 节点一 添加子节点" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "给 节点一 添加子节点" }));
    fireEvent.change(screen.getByLabelText("节点名称"), { target: { value: "权限失败节点" } });
    fireEvent.click(screen.getByRole("button", { name: "开始录音" }));

    expect(await screen.findByText("无法访问麦克风，请检查浏览器权限。")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("音频文件"), { target: { files: [voice] } });
    fireEvent.click(screen.getByRole("button", { name: "保存节点" }));

    await waitFor(() => {
      expect(api.createNode).toHaveBeenCalledWith("笔记本1", {
        title: "权限失败节点",
        parentId: "node-1",
        voices: [voice]
      });
    });
  });

  it("recovers when the microphone permission request stays pending", async () => {
    const getUserMedia = vi.fn().mockImplementation(() => new Promise<MediaStream>(() => undefined));
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia }
    });
    Object.defineProperty(globalThis, "MediaRecorder", {
      configurable: true,
      value: MockMediaRecorder
    });
    const api = makeApi();
    render(<App api={api} />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByRole("button", { name: "给 节点一 添加子节点" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "给 节点一 添加子节点" }));
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "开始录音" }));

    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(screen.getByRole("button", { name: "保存节点" })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(screen.getByText("麦克风请求超时，请检查浏览器权限提示后重试。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "开始录音" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "保存节点" })).toBeEnabled();
    vi.useRealTimers();
  });

  it("lets the user cancel a pending microphone permission request", async () => {
    const getUserMedia = vi.fn().mockImplementation(() => new Promise<MediaStream>(() => undefined));
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia }
    });
    Object.defineProperty(globalThis, "MediaRecorder", {
      configurable: true,
      value: MockMediaRecorder
    });
    render(<App api={makeApi()} />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByRole("button", { name: "给 节点一 添加子节点" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "给 节点一 添加子节点" }));
    fireEvent.click(screen.getByRole("button", { name: "开始录音" }));

    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(screen.getByRole("button", { name: "取消请求" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "保存节点" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "取消请求" }));

    expect(screen.getByRole("button", { name: "开始录音" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "保存节点" })).toBeEnabled();
  });

  it("stops active microphone tracks when closing the node dialog", async () => {
    const { getUserMedia, stopTrack } = installMediaRecorderMock();
    render(<App api={makeApi()} />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByRole("button", { name: "给 节点一 添加子节点" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "给 节点一 添加子节点" }));
    fireEvent.click(screen.getByRole("button", { name: "开始录音" }));

    await waitFor(() => {
      expect(getUserMedia).toHaveBeenCalled();
    });
    fireEvent.click(screen.getByRole("button", { name: "关闭" }));

    expect(stopTrack).toHaveBeenCalled();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });


});
