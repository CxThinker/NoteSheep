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

