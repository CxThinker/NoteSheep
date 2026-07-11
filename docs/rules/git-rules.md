# Git Rules

本文档记录 NoteSheep 的 Git（版本控制）、GitHub PR（合并请求）与远端仓库操作规则。

## Draft PR Creation Via Git Credential Manager

当本机满足以下条件时，可以通过 Git Credential Manager（Git 凭据管理器）临时取得 GitHub HTTPS 凭据，并调用 GitHub REST API（REST 接口）创建 draft PR（草稿合并请求）：

- `git push` 已确认可用，说明本机 Git 凭据可以访问 GitHub remote（远端仓库）。
- 当前环境没有 `gh`（GitHub CLI）或没有可用 `GH_TOKEN` / `GITHUB_TOKEN`。
- 用户已明确授权读取本机 Git 凭据并调用 GitHub API。

该路径解决的问题是：`git push` 会自动通过 Git Credential Manager 取凭据，但 PowerShell `Invoke-RestMethod` 不会自动取得 Git 凭据。必须显式执行 `git credential fill`，再把返回的 credential（凭据）放入 API request header（请求头）。

### Safe Handling

- 不得打印 token（令牌）或 credential（凭据）。
- 不得把 token 写入仓库、日志、临时文件或文档。
- 只允许在当前 PowerShell 进程变量中短暂使用 credential。
- 优先使用 `Authorization: Bearer <credential>`。
- 只有 `Bearer` 方式不可用且用户明确同意时，才考虑 `Authorization: Basic base64(username:credential)` 兼容路径。
- 调用前必须确认仓库 owner/repo（所有者/仓库名）与当前 remote 一致，避免把 PR 创建到错误仓库。

### Recommended Flow

1. 确认工作区状态：

```powershell
git status --short
git branch --show-current
git rev-parse --abbrev-ref --symbolic-full-name '@{u}'
```

2. 从 Git Credential Manager 读取 GitHub HTTPS credential：

```powershell
$credentialInput = "protocol=https`nhost=github.com`n`n"
$credentialOutput = $credentialInput | git credential fill
```

3. 解析 `git credential fill` 输出，只在内存变量中保留 `username` 与 `password`。其中 `password` 通常是 Git Credential Manager 保存的 token 或等价凭据。

4. 使用 credential 验证 GitHub API 身份：

```http
GET /user
Authorization: Bearer <credential>
```

5. 创建 PR 前先查询是否已有 open PR（开放合并请求），避免重复创建：

```http
GET /repos/{owner}/{repo}/pulls?state=open&head={owner}:{branch}&base={base}
Authorization: Bearer <credential>
```

6. 如不存在 open PR，再创建 draft PR：

```http
POST /repos/{owner}/{repo}/pulls
Authorization: Bearer <credential>
Content-Type: application/json
```

Request body（请求体）：

```json
{
  "title": "PR title",
  "head": "branch-name",
  "base": "master",
  "draft": true,
  "body": "PR description"
}
```

### Current Repository Example

当前仓库为 `CxThinker/NoteSheep`，创建当前工作分支 draft PR 时使用：

```http
GET /repos/CxThinker/NoteSheep/pulls?state=open&head=CxThinker:codex/voice-recorder-ci&base=master
POST /repos/CxThinker/NoteSheep/pulls
```

`POST` body：

```json
{
  "title": "feat: add voice recording and CI",
  "head": "codex/voice-recorder-ci",
  "base": "master",
  "draft": true,
  "body": "..."
}
```

### Rulesets

配置 GitHub rulesets（规则集）也可以复用同一条认证路径：Git Credential Manager -> GitHub REST API。

规则集属于 repository governance（仓库治理）操作，风险高于创建 PR。除非用户明确要求并确认目标规则，否则不得自动创建、修改或删除 rulesets。

### Failure Modes

- `401 Unauthorized`：API request（接口请求）没有有效认证，或 credential 不能用于 REST API。
- `403 Forbidden`：已认证，但 token 权限不足；创建 PR 通常需要 Pull requests write（合并请求写入）权限。
- `422 Unprocessable Entity`：PR 已存在、head/base 参数错误，或请求体字段不符合 GitHub API 要求。

### References

- GitHub REST API authentication（接口认证）：https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api
- GitHub Pulls API（合并请求接口）：https://docs.github.com/en/rest/pulls/pulls
- GitHub Credential Manager（凭据管理器）：https://docs.github.com/en/get-started/git-basics/caching-your-github-credentials-in-git
