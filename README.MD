# NoteSheep

NoteSheep 是一个面向即时灵感捕捉的 voice note（语音笔记）软件。它的核心目标是让用户随时录下点子，转成文字，并由用户自己通过 folder（文件夹）和 Thread（主题线索）整理这些点子之间的关系。

## Current Status

当前仓库处于 v1 planning（规划）阶段。详细产品与实现计划见 `plan.md`。

## Repository Structure

```text
.
├── docs/
│   ├── rules/
│   ├── functions/
│   ├── background/
│   └── dependency/
├── skills/
├── AGENTS.MD
├── README.MD
├── plan.md
└── .gitignore
```

## Directory Purpose

- `docs/rules`：项目规则、产品边界、协作约定。
- `docs/functions`：功能设计、用户流程、接口草案。
- `docs/background`：背景资料、调研记录、决策依据。
- `docs/dependency`：依赖、技术选型、运行环境说明。
- `skills`：项目相关 skill（技能）或工作流能力说明。
- `AGENTS.MD`：给 coding agent（编码代理）的项目级指令。
- `plan.md`：NoteSheep v1 的当前计划。

## v1 Direction

- Web app（网页应用）+ local service（本机服务）。
- 应用内 folder（文件夹）归类。
- 本地离线 transcription（语音转文字）。
- 用户手动决定哪些点子属于同一个 Thread（主题线索）。
- AI（人工智能）只负责语音转文字，不负责判断“是否同一件事”。
