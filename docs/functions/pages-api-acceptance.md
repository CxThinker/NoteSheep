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
