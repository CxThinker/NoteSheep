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

