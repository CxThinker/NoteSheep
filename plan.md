# NoteSheep v1 Plan

## Summary

NoteSheep v1 是一个 local-first Web app（本地优先网页应用）：用户随时录音保存点子，系统在本机完成 transcription（语音转文字），生成可编辑的 idea note（点子笔记）。用户通过 app 内 folder（文件夹）区分类型，并手动把不同时间想到、自己认为“是同一件事”的点子加入同一个 Thread（主题线索）。

当前仓库为空，因此按从零创建项目规划。v1 明确不让 AI（人工智能）判断点子是否属于同一件事，也不自动合并、自动归类或自动建立关系。

## Key Decisions

- 平台：Web app（网页应用）+ local service（本机服务）。
- 入口：v1 包含 local account（本地账号）注册与登录，只使用用户名和密码，不做云端账号。
- 存储：应用内 folder（文件夹），不直接依赖操作系统真实文件夹。
- 转写：完全本地离线 transcription（语音转文字），由本机后端调用 Whisper-compatible engine（Whisper 兼容转写引擎）。
- 关系模型：`Thread` 表示“用户认定的同一件事”；一个 note（笔记）可以加入零个或多个 Thread。
- AI 范围：v1 只做本地语音转文字；标题、文件夹、Thread 归属均由用户手动决定。

## Implementation Plan

- 项目结构采用前后端分离：
  - Frontend（前端）：Vite + React + TypeScript，负责录音、编辑、文件夹视图、Thread 视图。
  - Backend（后端）：Python FastAPI，负责本地注册/登录、音频保存、SQLite 数据库、离线转写任务。
  - Data（数据目录）：开发环境使用 `data/notesheep.sqlite` 与 `data/audio/`，SQLite schema（数据结构）通过 Alembic migration（迁移）管理，后续可迁移到用户应用数据目录。

- 核心数据模型：
  - `User`：`id`, `username`, `password_hash`, `password_salt`, `created_at`, `updated_at`。
  - `Session`：`id`, `user_id`, `token_hash`, `expires_at`, `created_at`。
  - `Folder`：`id`, `user_id`, `name`, `sort_order`, `created_at`, `updated_at`；新用户默认创建 `笔记本1`。
  - `IdeaNote`：`id`, `folder_id`, `title`, `content`, `transcript_text`, `audio_source_id`, `created_at`, `updated_at`。
  - `AudioSource`：`id`, `file_path`, `duration_ms`, `mime_type`, `created_at`。
  - `TranscriptSegment`：`id`, `audio_source_id`, `start_ms`, `end_ms`, `text`。
  - `Thread`：`id`, `title`, `description`, `created_at`, `updated_at`。
  - `ThreadNote`：`thread_id`, `note_id`, `sort_order`, `added_at`。

- 主要界面：
  - Auth（认证）页：用户名 + 密码注册/登录，并支持 Cartoon（卡通）与 Neon（霓虹）主题切换。
  - Capture（捕捉）页：开始录音、停止录音、保存为点子笔记。
  - `笔记本1` 默认文件夹：登录后在左侧 folder sidebar（文件夹侧栏）展示。
  - Folder（文件夹）侧栏：用于类型归类，如“产品想法”“写作灵感”“技术方案”。
  - Note editor（笔记编辑器）：编辑标题、正文、转写文本，移动到文件夹。
  - Thread view（主题线索视图）：用户手动把多个 note 加入同一个 Thread，并按时间或手动顺序查看。

- REST API（接口）：
  - `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`。
  - `GET /api/folders`, `POST /api/folders`, `PATCH /api/folders/{id}`, `DELETE /api/folders/{id}`。
  - `GET /api/notes`, `POST /api/notes`, `PATCH /api/notes/{id}`, `DELETE /api/notes/{id}`。
  - `POST /api/audio` 上传录音文件并创建 `AudioSource`。
  - `POST /api/audio/{id}/transcribe` 启动本地转写任务。
  - `GET /api/audio/{id}/transcription` 获取转写结果与 segments（片段）。
  - `GET /api/threads`, `POST /api/threads`, `PATCH /api/threads/{id}`, `DELETE /api/threads/{id}`。
  - `POST /api/threads/{thread_id}/notes/{note_id}` 手动加入 Thread。
  - `DELETE /api/threads/{thread_id}/notes/{note_id}` 手动移出 Thread。

- 关键行为：
  - 用户注册后自动拥有 `笔记本1` 文件夹；后续录音如果未选择 folder，note 默认进入该文件夹。
  - 转写失败时保留原始音频，并允许用户手动填写内容。
  - 删除 note 不默认删除音频，除非用户选择“同时删除源音频”。
  - 删除 Thread 只删除关系，不删除其中的 notes。
  - 系统可以展示“最近 notes”，但不能自动推荐“同一件事”。

## Test Plan

- Backend tests（后端测试）：
  - 注册、登录、退出和当前用户查询。
  - 密码少于 6 位时拒绝注册。
  - 使用 parameterized queries（参数化查询）防止 SQL injection（SQL 注入）绕过登录。
  - 数据库不保存明文密码。
  - Alembic migration（迁移）可以创建 auth 与 folder 表。
  - 新用户注册后自动拥有 `笔记本1` 文件夹。
  - 未登录访问 folder API 返回 `401`。
  - 创建、编辑、删除 folder/note/thread。
  - note 加入和移出 Thread 后，原 note 不丢失。
  - 删除 Thread 不删除 notes。
  - 转写任务失败时，audio source 仍可访问。
  - 使用 mock transcription provider（模拟转写服务）测试转写流程，不依赖真实模型。

- Frontend tests（前端测试）：
  - 用户可以在注册与登录模式间切换。
  - 用户可以在 Cartoon 与 Neon 主题间切换，刷新后保留选择。
  - 密码少于 6 位时前端阻止提交并提示。
  - 用户可以录音或上传音频并生成 note。
  - 登录后左侧 1/5 区域展示 `笔记本1`，右侧 4/5 区域保持空白。
  - 未选 folder 时 note 自动进入默认文件夹。
  - 用户可以编辑 note 标题、正文、转写文本。
  - 用户可以手动创建 Thread，并把多个 notes 加入其中。
  - 用户可以从 Thread 中移除 note，note 本身仍存在。

- Acceptance scenarios（验收场景）：
  - 首次使用时，用户可以用用户名和至少 6 位密码注册本地账号，再登录进入 NoteSheep。
  - 登录页可以在 Cartoon 和 Neon 两套主题间切换。
  - 用户早上录一个产品点子，晚上又录一个相关点子，可以手动把二者加入同一个 Thread。
  - 用户可以把不同点子分别放入“产品想法”“写作灵感”等 folder。
  - 没有任何 AI 自动判断或自动合并“同一件事”。
  - 断网情况下，已下载好本地转写模型后，录音、保存、转写、整理都可继续使用。

## Assumptions

- v1 不做真实系统文件夹同步，只做应用内文件夹。
- v1 做本地账号注册与登录；不做云同步、远端账号、多人协作、移动端原生应用。
- v1 不做自动摘要、自动标题、自动分类、自动关联。
- v1 默认使用本机后端完成离线转写；纯浏览器 WASM 转写留到后续评估。
- v1 的核心目标是把“随时语音记录点子”和“用户手动整理同一件事”这条闭环做顺。
