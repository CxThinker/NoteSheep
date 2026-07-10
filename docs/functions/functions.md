# NoteSheep 功能描述与设计实现

## 设计原则

NoteSheep v1 的功能设计围绕一个核心闭环：

```text
录音捕捉点子
  ↓
本地转写
  ↓
生成可编辑点子笔记
  ↓
用户放入文件夹
  ↓
用户手动加入 Thread
```

v1 的产品边界必须保持清晰：

- AI（人工智能）只负责 transcription（语音转文字）。
- 系统不自动判断“是否同一件事”。
- 系统不自动合并、分类、摘要或建立关系。
- 所有 folder（文件夹）归类和 Thread（主题线索）关系都由用户手动决定。
- 原始语音是 source（来源），不能因为生成文字而丢失。

## 核心对象

### User（用户）

用于本地注册与登录。v1 的用户账号只存在于本机 SQLite（嵌入式数据库），不代表云端账号，也不启用多人协作。

设计要点：

- 注册字段只包含 `username` 与 `password`。
- 密码长度至少 6 个字符。
- 数据库中不得保存明文密码，只保存 password hash（密码哈希）与 salt（盐）。
- 所有 SQL 查询必须使用 parameterized queries（参数化查询），防止 SQL injection（SQL 注入）。

建议字段：

```text
id
username
password_hash
password_salt
created_at
updated_at
```

### Session（会话）

用于记录用户登录状态。v1 使用本地 session token（会话令牌）与 HttpOnly cookie（仅 HTTP Cookie）。

设计要点：

- session token 原文只返回到 cookie，不写入数据库。
- 数据库保存 `token_hash`，避免数据库泄漏时直接暴露有效 token。
- logout（退出登录）后删除对应 session。

建议字段：

```text
id
user_id
token_hash
expires_at
created_at
```

### Folder（文件夹）

用于大范围归类点子，例如“产品想法”“写作灵感”“技术方案”。

设计要点：

- 文件夹是应用内结构，不直接等同于操作系统真实文件夹。
- 默认存在 `笔记本1`，用于存放未归类点子。
- v1 当前先实现一层文件夹；层级文件夹可在后续 schema（数据结构）迁移中扩展。

建议字段：

```text
id
user_id
name
sort_order
created_at
updated_at
```

### IdeaNote（点子笔记）

用户一次录音或一次手动输入形成的一条点子记录。

设计要点：

- 点子笔记是 v1 的核心内容单位。
- 一条点子笔记可以有语音来源，也可以只有文字内容。
- 标题、正文、转写文本都允许用户手动编辑。
- 笔记只能属于一个 folder，但可以加入多个 Thread。

建议字段：

```text
id
folder_id
title
content
transcript_text
audio_source_id
transcript_status
created_at
updated_at
```

`transcript_status` 建议取值：

```text
none
pending
running
succeeded
failed
```

### AudioSource（语音来源）

保存用户原始录音文件的信息。

设计要点：

- 原始语音文件存放在本机数据目录。
- 转写失败时，语音来源仍然保留。
- 删除笔记时不默认删除语音，除非用户明确选择“同时删除源音频”。

建议字段：

```text
id
file_path
duration_ms
mime_type
created_at
```

### TranscriptSegment（转写片段）

记录语音转文字后的分段内容。

设计要点：

- 用于后续播放时定位到原始语音片段。
- v1 不需要复杂可视化，但应保留时间戳结构。

建议字段：

```text
id
audio_source_id
start_ms
end_ms
text
```

### Thread（主题线索）

用户认为“这些点子属于同一件事”时，手动创建的点子集合。

设计要点：

- Thread 不是 AI 判断结果，而是用户整理结果。
- 删除 Thread 只删除关系，不删除其中的点子笔记。
- 一条点子笔记可以加入多个 Thread。

建议字段：

```text
id
title
description
created_at
updated_at
```

关联表：

```text
thread_id
note_id
sort_order
added_at
```

## 功能零：本地注册与登录

### 功能描述

用户可以用 username（用户名）与 password（密码）注册本地账号，并登录进入 NoteSheep。登录界面支持 Cartoon（卡通）与 Neon（霓虹）两套 UI theme（界面主题）切换。

### 用户流程

```text
打开 Auth 页面
  ↓
选择注册或登录
  ↓
输入用户名和至少 6 位密码
  ↓
提交
  ↓
成功后进入 NoteSheep 应用壳
```

### 设计实现

Frontend（前端）：

- 使用同一个 Auth 页面承载 register（注册）与 login（登录）模式。
- 登录页提供 Cartoon 与 Neon 主题切换，并把选择保存到 `localStorage`。
- 密码少于 6 个字符时，前端阻止提交并显示明确错误。
- API 调用集中在 `frontend/packages/api-client`，页面组件不直接散落请求封装。

Backend（后端）：

- `POST /api/auth/register` 创建本地用户。
- `POST /api/auth/login` 校验密码并创建 session。
- `GET /api/auth/me` 返回当前登录用户。
- `POST /api/auth/logout` 删除当前 session。
- 使用 Python `sqlite3` 的 parameterized queries（参数化查询）。
- 使用 password hash（密码哈希）与随机 salt（盐），不保存明文密码。
- session token 通过 HttpOnly cookie（仅 HTTP Cookie）传递。

建议接口：

```text
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
POST /api/auth/logout
```

### 边界情况

- 用户名已存在：返回明确错误。
- 密码少于 6 个字符：前后端都拒绝。
- 用户名或密码包含 SQL injection（SQL 注入）payload：不能绕过认证或破坏数据库。
- 未登录访问受保护接口：返回 `401 Unauthorized`。

## 功能一：快速录音捕捉

### 功能描述

用户可以在 Capture（捕捉）页快速开始录音，录完后保存为一条点子笔记。该功能的目标是降低记录成本，让用户不需要先想标题、分类或结构。

### 用户流程

```text
打开 Capture
  ↓
点击开始录音
  ↓
说出点子
  ↓
点击停止录音
  ↓
保存为点子笔记
  ↓
进入 `笔记本1` 或当前选择的 folder
```

### 设计实现

Frontend（前端）：

- 使用浏览器 `MediaRecorder` API 采集音频。
- 录音过程中显示录音状态、时长、停止按钮。
- 停止后允许用户试听、重录或保存。
- 保存时通过 `multipart/form-data` 上传音频文件。

Backend（后端）：

- 接收音频文件并保存到 `data/audio/`。
- 生成 `AudioSource` 记录。
- 创建一条 `IdeaNote`，默认进入 `笔记本1` 或用户当前选择的 folder。
- 将该笔记的 `transcript_status` 设置为 `pending`。
- 触发本地转写任务。

建议接口：

```text
POST /api/audio
POST /api/notes
POST /api/audio/{id}/transcribe
```

### 边界情况

- 用户拒绝麦克风权限：提示无法录音，但允许手动输入文字。
- 录音中断：保留已采集片段，用户决定是否保存。
- 上传失败：前端保留本地录音对象，允许重试。
- 转写未完成：笔记先保存，界面显示“转写中”。

## 功能二：本地离线转写

### 功能描述

系统在本机将用户语音转换成文字。该能力用于减少手动整理成本，但不参与判断点子含义或关系。

### 用户流程

```text
保存录音
  ↓
系统开始本地转写
  ↓
用户可以先离开页面
  ↓
转写完成后笔记显示文字
  ↓
用户手动编辑转写结果
```

### 设计实现

Backend（后端）：

- 提供 transcription provider（转写服务提供者）抽象。
- v1 使用本机 Whisper-compatible engine（Whisper 兼容转写引擎）。
- 使用后台任务队列处理转写，避免阻塞 API 请求。
- 转写结果写入 `IdeaNote.transcript_text`。
- 分段结果写入 `TranscriptSegment`。

建议 provider 接口：

```text
transcribe(audio_path) -> {
  text,
  segments: [
    { start_ms, end_ms, text }
  ]
}
```

建议状态流转：

```text
pending -> running -> succeeded
pending -> running -> failed
```

Frontend（前端）：

- 轮询或订阅转写状态。
- 在 note editor（笔记编辑器）中展示转写状态。
- 转写完成后刷新文本。
- 转写失败时提供“重试转写”和“手动填写”。

建议接口：

```text
POST /api/audio/{id}/transcribe
GET /api/audio/{id}/transcription
```

### 边界情况

- 本地模型不存在：提示用户先配置或下载模型。
- 模型运行失败：保留音频和空白笔记。
- 音频格式不支持：后端返回明确错误，前端提示用户更换格式。
- 转写结果不准确：用户可以直接编辑 `transcript_text` 和 `content`。

## 功能三：点子笔记编辑

### 功能描述

用户可以查看和编辑每条点子笔记，包括标题、正文、转写文本、所属文件夹和来源音频。

### 用户流程

```text
打开点子笔记
  ↓
查看标题、正文、转写文本和来源音频
  ↓
编辑内容
  ↓
保存修改
```

### 设计实现

Frontend（前端）：

- 使用 note editor 展示笔记详情。
- 标题输入框允许用户直接修改。
- 正文区域用于用户整理后的内容。
- 转写文本区域保留语音转文字结果，也允许用户修正。
- 如果存在音频来源，显示播放控件。

Backend（后端）：

- `PATCH /api/notes/{id}` 更新标题、正文、转写文本和 folder。
- 保存时更新 `updated_at`。
- 不因用户编辑转写文本而删除 `TranscriptSegment`。

建议接口：

```text
GET /api/notes/{id}
PATCH /api/notes/{id}
DELETE /api/notes/{id}
```

### 边界情况

- 删除笔记：默认只删除笔记和 Thread 关联，不删除音频文件。
- 空标题：允许保存，但列表中显示“未命名点子”。
- 多处编辑冲突：v1 为单用户本地应用，可以先采用最后保存覆盖。

## 功能四：应用内文件夹归类

### 功能描述

用户通过 folder（文件夹）按类型或领域整理点子。文件夹用于“这条点子属于哪类内容”，不表达“是否同一件事”。

### 用户流程

```text
创建文件夹
  ↓
录音或编辑点子
  ↓
选择所属文件夹
  ↓
在文件夹视图中查看点子列表
```

### 设计实现

Frontend（前端）：

- 左侧显示 folder sidebar（文件夹侧栏）。
- 默认展示 `笔记本1`。
- 支持创建、重命名、删除文件夹。
- 支持将笔记移动到其他 folder。

Backend（后端）：

- 用户注册后确保 `笔记本1` 存在；已存在用户请求文件夹列表时，如果缺失也补齐。
- 删除 folder 时，不直接删除 notes。
- 被删除 folder 下的 notes 移回默认文件夹。

建议接口：

```text
GET /api/folders
POST /api/folders
PATCH /api/folders/{id}
DELETE /api/folders/{id}
GET /api/notes?folder_id={folder_id}
```

当前已实现的 v1 最小接口为：

```text
GET /api/folders
```

### 边界情况

- 删除默认文件夹：不允许。
- 重名文件夹：v1 可以允许，但界面建议提示用户避免混淆。
- 删除非空文件夹：先确认，再将其中 notes 移回默认文件夹。

## 功能五：Thread 手动整理同一件事

### 功能描述

Thread（主题线索）用于表达用户自己判断的“这些点子属于同一件事”。这是 NoteSheep 的核心整理能力。

### 用户流程

```text
创建 Thread
  ↓
打开某条点子笔记
  ↓
选择加入 Thread
  ↓
在 Thread 视图中查看相关点子
  ↓
手动调整顺序或移除点子
```

### 设计实现

Frontend（前端）：

- 提供 Thread 列表视图。
- 提供 Thread 详情页，展示该 Thread 下的 notes。
- 在 note editor 中提供“加入 Thread”操作。
- 支持将 note 从 Thread 中移除。
- 支持按创建时间或手动顺序展示。

Backend（后端）：

- 使用 `ThreadNote` 关联 Thread 和 IdeaNote。
- `ThreadNote.sort_order` 保存用户手动顺序。
- 删除 Thread 时只删除 `ThreadNote` 关系，不删除 notes。
- 删除 note 时同步删除对应 `ThreadNote` 关系。

建议接口：

```text
GET /api/threads
POST /api/threads
PATCH /api/threads/{id}
DELETE /api/threads/{id}
GET /api/threads/{id}/notes
POST /api/threads/{thread_id}/notes/{note_id}
DELETE /api/threads/{thread_id}/notes/{note_id}
PATCH /api/threads/{thread_id}/notes/order
```

### 边界情况

- 同一 note 重复加入同一 Thread：后端应保持幂等，不创建重复关系。
- 删除 Thread：notes 保留。
- 删除 note：从所有 Thread 中移除。
- AI 不参与 Thread 创建和归属判断。

## 功能六：来源音频管理

### 功能描述

系统保存每条语音点子的原始音频，使用户可以回听来源，而不是只依赖转写文本。

### 用户流程

```text
打开点子笔记
  ↓
查看来源音频
  ↓
播放原始录音
  ↓
必要时删除来源音频
```

### 设计实现

Frontend（前端）：

- 在 note editor 中显示音频播放器。
- 如果存在分段数据，后续可以支持点击文本片段跳转播放。
- 删除音频需要二次确认。

Backend（后端）：

- 音频文件以 UUID 命名，避免文件名冲突。
- 数据库记录相对路径，不在业务数据中硬编码绝对路径。
- 提供音频读取接口，前端通过 URL 播放。

建议接口：

```text
GET /api/audio/{id}
DELETE /api/audio/{id}
```

### 边界情况

- 音频文件丢失：笔记仍可打开，界面显示“源音频不可用”。
- 删除音频：清空 `IdeaNote.audio_source_id` 或标记来源已删除。
- 删除音频不删除转写文本。

## 功能七：列表、最近记录与搜索

### 功能描述

用户需要快速找回最近点子、某个文件夹下的点子，以及包含特定关键词的点子。

### 用户流程

```text
打开应用
  ↓
查看最近点子
  ↓
按文件夹筛选
  ↓
输入关键词搜索
  ↓
打开目标点子或 Thread
```

### 设计实现

Frontend（前端）：

- 首页显示最近 notes。
- 文件夹视图显示当前 folder 下的 notes。
- 搜索框按关键词查询标题、正文和转写文本。

Backend（后端）：

- `GET /api/notes` 支持 `folder_id`、`q`、`limit`、`offset`。
- v1 可以先用 SQLite `LIKE` 搜索。
- 后续可升级为 SQLite FTS（全文搜索）。

建议接口：

```text
GET /api/notes
GET /api/notes?q={keyword}
GET /api/notes?folder_id={folder_id}
```

### 边界情况

- 没有搜索结果：显示空状态，不自动推荐相似内容。
- 搜索很慢：v1 数据量小可以接受，后续再引入 FTS。

## 功能八：设置与本地运行环境

### 功能描述

用户需要知道本地转写模型是否可用、数据存放位置在哪里，以及服务是否正常运行。

### 用户流程

```text
打开设置
  ↓
查看本地服务状态
  ↓
查看转写模型状态
  ↓
查看数据目录
```

### 设计实现

Frontend（前端）：

- Settings（设置）页显示后端连接状态。
- 显示 transcription provider 状态。
- 显示数据目录路径和模型状态。

Backend（后端）：

- 提供 health check（健康检查）接口。
- 提供 transcription status（转写状态）接口。
- 检查模型是否存在、是否可执行。

建议接口：

```text
GET /api/health
GET /api/settings
GET /api/transcription/status
```

### 边界情况

- 后端未启动：前端显示连接失败，并提示启动本机服务。
- 模型未配置：录音和手动笔记仍可用，但转写不可用。
- 数据目录不可写：后端启动时返回明确错误。

## v1 页面结构

建议页面结构：

```text
App
├── Capture
├── Notes
│   ├── Recent
│   ├── FolderNotes
│   └── NoteEditor
├── Threads
│   ├── ThreadList
│   └── ThreadDetail
└── Settings
```

建议布局：

```text
左侧：Folder 与 Thread 导航
中间：点子列表或 Thread 内容
右侧：Note editor
```

## v1 API 汇总

```text
GET    /api/health
GET    /api/settings

POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/folders
POST   /api/folders
PATCH  /api/folders/{id}
DELETE /api/folders/{id}

GET    /api/notes
GET    /api/notes/{id}
POST   /api/notes
PATCH  /api/notes/{id}
DELETE /api/notes/{id}

POST   /api/audio
GET    /api/audio/{id}
DELETE /api/audio/{id}
POST   /api/audio/{id}/transcribe
GET    /api/audio/{id}/transcription

GET    /api/threads
POST   /api/threads
PATCH  /api/threads/{id}
DELETE /api/threads/{id}
GET    /api/threads/{id}/notes
POST   /api/threads/{thread_id}/notes/{note_id}
DELETE /api/threads/{thread_id}/notes/{note_id}
PATCH  /api/threads/{thread_id}/notes/order
```

## v1 验收标准

- 用户可以录音并保存为点子笔记。
- 用户可以用用户名和至少 6 位密码注册本地账号，并登录进入应用。
- 登录页可以在 Cartoon 和 Neon 两套主题间切换。
- 系统使用参数化查询防止 SQL 注入绕过登录。
- 数据库不保存明文密码。
- 保存后，即使转写失败，原始音频和笔记仍然存在。
- 用户可以手动编辑标题、正文和转写文本。
- 用户可以将点子移动到不同 folder。
- 用户可以创建 Thread，并手动把多个点子加入其中。
- 删除 Thread 不删除点子。
- 删除点子不默认删除源音频。
- 系统不会自动判断哪些点子属于同一件事。
- 系统不会自动合并、分类、摘要或建立关系。
