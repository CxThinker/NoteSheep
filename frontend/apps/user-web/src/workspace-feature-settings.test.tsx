import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { App } from "./App";
import { makeApi, resetAppTestEnvironment } from "./testUtils";

describe("Workspace feature settings", () => {
  beforeEach(resetAppTestEnvironment);

  it("hides audio upload while keeping recording controls when the feature is off", async () => {
    render(<App api={makeApi()} />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByRole("button", { name: "给 节点一 添加子节点" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "打开设置" }));
    fireEvent.click(screen.getByRole("button", { name: "功能开关" }));
    fireEvent.click(screen.getByLabelText("创建节点时的音频上传"));
    fireEvent.click(screen.getByRole("button", { name: "关闭" }));

    fireEvent.click(screen.getByRole("button", { name: "给 节点一 添加子节点" }));

    expect(screen.getByRole("button", { name: "开始录音" })).toBeInTheDocument();
    expect(screen.queryByLabelText("音频文件")).not.toBeInTheDocument();
  });

  it("syncs the drop zone size slider with the preview and canvas", async () => {
    render(<App api={makeApi()} />);

    fireEvent.change(screen.getByLabelText("用户名"), { target: { value: "note-taker" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    const treeBoard = await screen.findByLabelText("树状图画布");
    expect(treeBoard).toHaveStyle({ "--drop-zone-size": "28px" });

    fireEvent.click(screen.getByRole("button", { name: "打开设置" }));
    fireEvent.click(screen.getByRole("button", { name: "功能开关" }));

    const slider = screen.getByLabelText("节点判定区大小") as HTMLInputElement;
    const preview = screen.getByLabelText("节点判定区大小预览");
    expect(slider.value).toBe("100");
    expect(preview).toHaveStyle({ "--preview-drop-zone-size": "28px" });

    fireEvent.change(slider, { target: { value: "200" } });

    expect(slider.value).toBe("200");
    expect(preview).toHaveStyle({ "--preview-drop-zone-size": "56px" });
    expect(treeBoard).toHaveStyle({ "--drop-zone-size": "56px" });
  });
});
