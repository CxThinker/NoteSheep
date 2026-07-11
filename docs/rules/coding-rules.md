# Coding Rules

本文档记录 NoteSheep 的 coding rules（编码规则）。如与更早文档冲突，以用户当前会话的最新指令和本文档为准。

## File Size Limit

- 单个手写项目文件最多 200 行。
- 重构后的手写项目文件必须满足 200 行上限；既有超限文件应在相关重构中逐步拆分。
- 超过 200 行时，优先按 responsibility（职责）、state ownership（状态归属）、UI section（界面区域）、domain concept（领域概念）或 test fixture（测试夹具）拆分。
- 禁止为了压缩行数牺牲 readability（可读性），例如把无关逻辑塞进长表达式、删除必要类型、合并不相关函数。
- 不适用范围：`notes/` 下的用户笔记/文档、dependency lockfile（依赖锁文件）、generated code（生成代码）、binary/resource files（二进制/资源文件）、第三方 vendored files（内置第三方文件）。

## Local-Only Files

- `skills/structured-task-workflow/` 及其所有内容属于 local-only（仅本地）素材，不提交到 Git（版本控制）。

## Refactor Guard

- 大规模 refactor（重构）必须先按 Large Change（大型变更）写 Spec（需求规格）和 Plan（执行计划），经用户确认后再改代码。
- 重构必须保持原有 UI（用户界面）效果、关键交互、API contract（接口契约）和测试覆盖。
- 拆分文件时优先移动代码，不改变行为；行为变化必须单独说明并有测试依据。
