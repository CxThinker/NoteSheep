import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { makeApi, resetAppTestEnvironment, treeWithNode } from "./testUtils";

describe("Mind map node card", () => {
  beforeEach(resetAppTestEnvironment);

  it("shows node text content and playable audio duration on the default card", async () => {
    const api = makeApi({
      getNodeDetail: vi.fn().mockResolvedValue({
        detail: {
          node: treeWithNode.nodes[0],
          textPath: "notes/笔记本1/note/节点一.md",
          textContent: "第一行正文\n第二行正文",
          imagePath: "notes/笔记本1/img/节点一/",
          images: [],
          voicePath: "notes/笔记本1/voice/节点一/",
          voices: [
            {
              mediaType: "audio/mpeg",
              name: "录音.mp3",
              path: "notes/笔记本1/voice/节点一/录音.mp3",
              url: "/api/notebooks/笔记本1/nodes/node-1/assets/voices/录音.mp3",
            },
          ],
        },
      }),
    });
    const { container } = render(<App api={api} />);

    await login();

    expect(await screen.findByText(/第一行正文/)).toBeInTheDocument();
    expect(screen.queryByText("note/节点一.md")).not.toBeInTheDocument();
    const playButton = screen.getByRole("button", { name: "播放音频" });
    expect(playButton).toBeEnabled();

    const audio = container.querySelector(".node-card-audio audio") as HTMLAudioElement;
    Object.defineProperty(audio, "duration", { configurable: true, value: 65 });
    fireEvent.loadedMetadata(audio);

    expect(screen.getByText("1:05")).toBeInTheDocument();
  });

  it("shows empty text and disabled audio state when detail content has no body or audio", async () => {
    const api = makeApi({
      getNodeDetail: vi.fn().mockResolvedValue({
        detail: {
          node: treeWithNode.nodes[0],
          textPath: "notes/笔记本1/note/节点一.md",
          textContent: "   ",
          imagePath: "notes/笔记本1/img/节点一/",
          images: [],
          voicePath: "notes/笔记本1/voice/节点一/",
          voices: [],
        },
      }),
    });
    render(<App api={api} />);

    await login();

    expect(await screen.findByText("空")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "播放音频" })).toBeDisabled();
    expect(screen.getByText("无")).toBeInTheDocument();
  });
});

async function login() {
  fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
  fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
  fireEvent.click(screen.getByRole("button", { name: "登录" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "打开笔记本 笔记本1" })).toBeInTheDocument());
}
