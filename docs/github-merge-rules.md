# GitHub Merge Rules

本文档记录 NoteSheep 在 GitHub 上应启用的 CI（持续集成）与 merge protection（合并保护）策略。

## Repository Files

仓库内 `.github/workflows/ci.yml` 已提供 CI workflow（工作流）：

- `pull_request` 到 `master` 时运行。
- `push` 到 `master` 时运行。
- `workflow_dispatch` 支持手动运行。
- `frontend` job（任务）运行 `npm ci`、`npm test`、`npm run build`。
- `backend` job（任务）安装 `backend/requirements.lock.txt` 并运行 `python -m pytest`。

## GitHub Settings

CI 文件只负责运行检查；强制“通过 CI 才能合并”和“其他人需要 approval（审批）”必须在 GitHub repository settings（仓库设置）里配置。

建议优先使用 rulesets（规则集）保护 `master`，把 CI 与 review（审查）拆成两个规则集：

### Ruleset 1: master-ci

1. 打开 repository（仓库）的 `Settings`。
2. 进入 `Rules` -> `Rulesets`。
3. 新建 branch ruleset（分支规则集），目标分支设为 `master`。
4. 启用 require status checks to pass（要求状态检查通过）。
5. 选择 required status checks（必需状态检查）：
   - `frontend`
   - `backend`
6. 不添加 bypass actor（绕过主体），使 owner（所有者）和 collaborator（协作者）都必须通过 CI。

如果 `frontend` / `backend` 尚未出现在可选 status checks（状态检查）列表里，先提交一次包含 workflow（工作流）的 PR，让 GitHub Actions 至少运行一次。

### Ruleset 2: master-review

1. 新建第二个 branch ruleset（分支规则集），目标分支同样设为 `master`。
2. 启用 require a pull request before merging（合并前要求 PR）。
3. 启用 require approvals（要求审批），数量设为 `1`。
4. 将 repository owner/admin（仓库所有者/管理员）加入 bypass list（绕过名单）。
5. 不要把普通 collaborator（协作者）加入 bypass list。
6. 不要给普通 collaborator admin（管理员）权限，否则他们可能绕过 review（审查）规则。

## Owner Bypass

本仓库 owner（所有者）需要免 approval（审批）时，推荐使用上面的双 ruleset（规则集）：

- `master-ci` 不设置 bypass（绕过），保证所有人都必须通过 CI。
- `master-review` 只给 owner/admin bypass（绕过），实现 owner 免 approval。

如果改用单一 branch protection rule（分支保护规则）并允许 admin bypass（管理员绕过），admin/owner 可能绕过的不只是 approval（审批），还可能包含其他保护要求。只有在接受这个治理弱点时才使用单一规则。

## References

- GitHub protected branches（受保护分支）：https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- GitHub rulesets（规则集）：https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
