# Feature Module Colors

本文档记录 NoteSheep 当前各 feature module（功能模块）的 color choices（颜色选择）。
颜色规范以 `frontend/apps/user-web/src/styles/part-01.css` 的 theme tokens（主题令牌）为 source of truth（唯一事实来源），各模块应优先复用 token 与 `color-mix(...)`，不要散落新增 hex color（十六进制颜色）。

## Theme Tokens

| Token | Cartoon | Neon | 用途 |
| --- | --- | --- | --- |
| `--page` | `#fff8df` | `#111214` | 页面与大面积背景。 |
| `--panel` | `#fffdf5` | `#181b20` | 面板、卡片、弹窗、输入框基底。 |
| `--text` | `#20242a` | `#f6f7ef` | 主文本。 |
| `--muted` | `#63717a` | `#aab2b8` | 次级文本、空状态、路径标签。 |
| `--line` | `#2f4050` | `#d7f9ff` | 边框、分隔线、连接线、结构描边。 |
| `--accent` | `#ffcf48` | `#47f5c7` | Primary action（主操作）、拖拽 ghost（拖拽影像）、徽章。 |
| `--accent-strong` | `#ef6b4a` | `#ff4d4d` | 强提示、当前 drop zone（放置区域）等交互强调；Neon 不使用紫色系。 |
| `--text-accent` | `#ef6b4a` | `var(--neon-text-color)` | 文字强调色；Neon 下由用户设置控制。 |
| `--secondary` | `#5ac8b8` | `#ffd166` | Active selection（激活选择）、节点托盘选择、录音按钮。 |
| `--danger` | `#b82f48` | `#ff6b6b` | 删除、错误、危险操作。 |
| `--panel-strong` | `color-mix(in srgb, #fffdf5 84%, #2f4050)` | `color-mix(in srgb, #181b20 78%, #d7f9ff)` | 强调面板/控件背景。 |
| `--shadow` | `8px 8px 0 #2f4050` | `0 0 0 1px #47f5c7, 0 0 28px rgba(71, 245, 199, 0.34)` | 主要投影。 |
| `--focus` | `#007a7a` | `#ffd166` | Keyboard focus（键盘焦点）描边。 |

## Module Color Map

| Module | Primary colors | State colors | 依据 |
| --- | --- | --- | --- |
| Auth（认证）与 theme switcher（主题切换） | `--page` 做页面背景，`--panel` 做 auth panel（认证面板），`--line` 做描边，`--accent` 做 brand mark（品牌标记）与 primary action（主按钮）。 | Active theme 使用 `--secondary`；form error（表单错误）使用 `--danger`；focus 使用 `--focus`。 | `part-01.css`, `part-02.css` |
| Shell header（应用头部） | 继承 `--page`，品牌与用户信息用 `--text` / `--muted`，分隔线使用 `color-mix(... var(--line) ...)`。 | Logout/text action（文本操作）保持 transparent（透明）背景，避免喧宾夺主。 | `part-03.css` |
| Notebook sidebar（笔记本侧栏） | Sidebar structure（侧栏结构）使用 `--line` 的透明混合色做分隔；notebook item（笔记本项）使用 `--panel`。 | Active notebook（当前笔记本）使用 `--secondary` 与 `color-mix(... var(--secondary) 24% ...)` 外圈。 | `part-03.css`, `part-04.css` |
| Node tray（节点托盘：自由节点/被删除节点） | Tray tabs（托盘标签）与 tray item（托盘项）使用 `--panel`、`--line`、`--text`。 | Active tab（激活标签）和 selected tray node（选中托盘节点）使用 `--secondary`；permanent delete（彻底删除）使用 `--danger`。 | `part-13.css` |
| Canvas and zoom（画布与缩放） | Tree board（树状图画布）使用 `color-mix(... var(--page) 94%, var(--panel))`，网格线使用 `color-mix(... var(--line) 10%, transparent)`。 | Zoom value（当前缩放值）使用 `color-mix(... var(--secondary) 18%, var(--panel))`；disabled zoom control（禁用缩放控件）降低 opacity（不透明度）。 | `part-04.css`, `part-05.css` |
| Mind map nodes（思维导图节点） | Node card（节点卡片）使用 `--panel`、`--line`、`--text`；connector（连接线）使用 `--line`。 | Root kicker（根节点提示）使用 `--text-accent`；node badge（节点徽章）和 drag ghost 使用 `--accent`；delete node（删除节点）使用 `--danger`。 | `part-05.css`, `part-06.css`, `part-07.css` |
| Drop zones（放置判定区） | Idle drop zone（静止判定区）使用 `color-mix(... var(--panel) 78%, transparent)` 与 `color-mix(... var(--line) 38%, transparent)`。 | Active/hover/focus drop zone（激活/悬停/焦点判定区）使用 `--accent` 背景混合、`--accent-strong` 描边和 halo（光晕）。 | `part-05.css`, `part-06.css` |
| Dialogs and forms（弹窗与表单） | Modal backdrop（弹窗遮罩）使用 `rgba(0, 0, 0, 0.42)`；modal panel（弹窗面板）使用 `--panel`、`--line`、`--shadow`。Inputs 使用 `color-mix(... var(--panel) 94%, var(--accent))`。 | Primary action 使用 `--accent`；secondary/text action 默认 transparent；error 使用 `--danger`。 | `part-02.css`, `part-07.css`, `part-08.css` |
| Voice recorder（录音控件） | Recorder field（录音字段）使用 `color-mix(... var(--panel) 92%, var(--page))`；bar（录音栏）使用 `--panel`。 | Recording state（录音中状态）使用 `--accent` 描边和 `color-mix(... var(--accent) 12%, var(--panel))` 背景；record button（录音按钮）使用 `--secondary`。 | `part-08.css` |
| Node detail（节点详情） | Detail layout（详情布局）使用 `color-mix(... var(--panel) 96%, var(--accent))`；title（标题）和 section heading（分区标题）使用 `--text-accent`。 | Path value（路径值）和 audio progress（音频进度）使用 `--secondary`；empty/detail state（空详情状态）使用 `--muted`。 | `part-09.css`, `part-10.css`, `part-11.css`, `part-12.css` |
| Media detail（图片与音频详情） | Image background（图片背景）使用 `color-mix(... var(--page) 72%, var(--panel))`；audio bars（音频条背景）使用 `color-mix(... var(--page) 78%, var(--panel))`。 | Audio progress 使用 `--secondary`；caption/time（说明与时间）使用 `--muted`。 | `part-12.css` |
| Status and feedback（状态与反馈） | Empty state（空状态）与 secondary metadata（次级元数据）使用 `--muted`。 | Error and rejection（错误与拒绝）使用 `--danger`；drag/move affordance（拖拽/移动提示）使用 `--accent` 与 `--accent-strong`。 | `part-02.css`, `part-04.css`, `part-06.css`, `part-07.css` |

## Rules For New UI Work

- 新增 UI（用户界面）颜色时，先选择已有 token；只有现有 token 无法表达新语义时，才新增 token。
- 新增 token 必须同时补齐 Cartoon 与 Neon 两套 theme（主题），并更新本文档。
- Module-local（模块局部）颜色应优先使用 `color-mix(...)` 基于 token 派生，不直接写孤立 hex color。
- `--accent` 保留给主操作、拖拽影像、徽章等“可行动”信号；`--accent-strong` 保留给强提示和 drop zone 激活态；`--text-accent` 保留给文字强调。
- `--secondary` 保留给 active/selected（激活/选中）状态，不用于 destructive action（破坏性操作）。
- `--danger` 只用于错误、删除和不可逆动作；危险按钮文字当前使用 `#fff`，accent/secondary 按钮文字当前使用 `#101316`。
- Focus style（焦点样式）统一使用 `--focus`，不要只依赖颜色变化表达可访问状态。

## Neon Text Color

- Neon text color（霓虹文字颜色）只影响 `--text-accent`，不影响 Cartoon theme（卡通主题），也不改变 drop zone（放置区域）等交互高光。
- 允许值仅为红 `#ff4d4d`、青 `#47f5c7`、蓝 `#4da3ff`、绿 `#57e389`、黄 `#ffd166`、橙 `#ff9f1c`。
- 严禁 purple / violet / magenta / pink-purple（紫色系）作为 Neon 文字色或 Neon 默认强调色。
