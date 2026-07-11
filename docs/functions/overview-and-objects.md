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

