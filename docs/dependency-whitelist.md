# Dependency Whitelist

本文件记录 NoteSheep 当前允许使用的 dependency（依赖）与依据。新增依赖前必须先更新本文件，并优先选择官方维护或可信维护者发布的包。

## Tech Stack（技术栈）

### Backend（后端）

- Language（语言）：Python 3.12。
- Web framework（网页框架）：FastAPI。
- ASGI server（异步服务器）：Uvicorn。
- Database（数据库）：SQLite；schema（数据结构）由 Alembic migration（迁移）管理，数据库访问当前仍通过 Python standard library（标准库）`sqlite3` 执行参数化查询。
- Migration/tooling（迁移/工具链）：SQLAlchemy Core `MetaData`（元数据）定义表结构，Alembic 负责生成与执行 migration（迁移脚本）。
- Auth（认证）：本地 username/password（用户名/密码）注册登录，密码使用 `hashlib.pbkdf2_hmac` 哈希，session token（会话令牌）使用 `secrets` 生成。
- Test framework（测试框架）：pytest，HTTP/API 测试使用 FastAPI `TestClient` 与 `httpx`。

### Frontend（前端）

- Language（语言）：TypeScript。
- UI framework（用户界面框架）：React。
- Build tool（构建工具）：Vite。
- Package manager（包管理器）：npm workspace（工作区）。
- Test framework（测试框架）：Vitest + Testing Library + jsdom。
- UI structure（界面结构）：`frontend/apps/user-web` 为用户端应用，`frontend/packages/api-client` 为共享 API client（接口客户端），`frontend/packages/ui` 为共享 UI/theme（主题）工具。

## Dependency Lock（依赖锁）

### Current Lock Files（当前锁文件）

- `frontend/package-lock.json`：前端 npm dependency lock（依赖锁），锁定 workspace 内直接依赖与 transitive dependencies（传递依赖）。
- `backend/requirements.lock.txt`：后端 Python dependency lock（依赖锁），由当前 virtual environment（虚拟环境）的 `pip freeze` 生成，锁定直接依赖与 transitive dependencies（传递依赖）。

### Direct Dependency Manifests（直接依赖清单）

- `frontend/package.json` 与各 workspace package 的 `package.json`：声明前端 direct dependencies（直接依赖）。
- `backend/requirements.txt`：声明后端 direct dependencies（直接依赖），保持人工可读、便于审查。

### Lock Generation（依赖锁生成）

- 前端锁文件必须由 npm 生成或更新，不得手写：

```powershell
cd frontend
npm install
```

- 前端 clean install（干净安装）验证：

```powershell
cd frontend
npm ci --dry-run
```

- 后端锁文件必须由 pip 从已安装 virtual environment（虚拟环境）生成，不得手写：

```powershell
backend\.venv\Scripts\python -m pip freeze --local > backend\requirements.lock.txt
```

- 后端依赖一致性验证：

```powershell
backend\.venv\Scripts\python -m pip check
```

### Maintenance Rules（维护规则）

- 新增、升级或删除 dependency（依赖）时，必须先更新本白名单，再使用包管理工具生成 lockfile（锁文件）。
- `frontend/package-lock.json` 只能由 `npm install`、`npm update` 或等价 npm 命令更新。
- `backend/requirements.lock.txt` 只能由 `pip freeze` 或后续确认采用的 Python lock tool（锁文件工具）生成。
- 不允许手动编辑 lockfile（锁文件）内容来“修版本”；需要改版本时，先改 direct dependency manifest（直接依赖清单），再重新生成锁文件。

## Backend

- `alembic`：database migration（数据库迁移）工具。Official docs（官方文档）：https://alembic.sqlalchemy.org/
- `fastapi`：Python 后端 HTTP/API（应用程序接口）框架。Official docs（官方文档）：https://fastapi.tiangolo.com/
- `uvicorn[standard]`：FastAPI 本地 ASGI server（异步服务器）。Official docs（官方文档）：https://www.uvicorn.org/
- `pytest`：Python tests（测试）框架。Official docs（官方文档）：https://docs.pytest.org/
- `sqlalchemy`：SQL toolkit（数据库工具包），用于 Alembic autogenerate（自动生成迁移）的 metadata（元数据）与 SQLite dialect（方言）。Official docs（官方文档）：https://www.sqlalchemy.org/
- `httpx`：FastAPI `TestClient` 的底层测试依赖与 HTTP client（客户端）。Official docs（官方文档）：https://www.python-httpx.org/
- `python-multipart`：FastAPI 解析 `multipart/form-data`（表单数据）与 uploaded files（上传文件）所需依赖。Official docs（官方文档）：https://fastapi.tiangolo.com/tutorial/request-forms-and-files/

## Frontend

- `react`：用户界面库。Official docs（官方文档）：https://react.dev/
- `react-dom`：React DOM renderer（渲染器）。Official docs（官方文档）：https://react.dev/
- `vite`：Frontend build tool（前端构建工具）。Official docs（官方文档）：https://vite.dev/
- `typescript`：TypeScript（类型脚本）语言与类型检查。Official docs（官方文档）：https://www.typescriptlang.org/
- `@vitejs/plugin-react`：Vite React plugin（插件）。Official docs（官方文档）：https://vite.dev/plugins/
- `vitest`：Frontend tests（前端测试）框架。Official docs（官方文档）：https://vitest.dev/
- `@testing-library/react`：React component testing（组件测试）工具。Official docs（官方文档）：https://testing-library.com/docs/react-testing-library/intro/
- `@testing-library/jest-dom`：DOM assertion（断言）扩展。Official docs（官方文档）：https://testing-library.com/docs/ecosystem-jest-dom/
- `jsdom`：Node test environment（测试环境）中的 DOM 实现。Repository（代码仓库）：https://github.com/jsdom/jsdom
- `@types/react`：React TypeScript type definitions（类型定义）。Package page（包页面）：https://www.npmjs.com/package/@types/react
- `@types/react-dom`：React DOM TypeScript type definitions（类型定义）。Package page（包页面）：https://www.npmjs.com/package/@types/react-dom

## Standard Library

- Python `sqlite3`：SQLite database（数据库）访问，必须使用 parameterized queries（参数化查询）防 SQL injection（SQL 注入）。Official docs（官方文档）：https://docs.python.org/3/library/sqlite3.html
- Python `hashlib.pbkdf2_hmac`：password hashing（密码哈希）。Official docs（官方文档）：https://docs.python.org/3/library/hashlib.html
- Python `secrets`：生成 session token（会话令牌）和 salt（盐）。Official docs（官方文档）：https://docs.python.org/3/library/secrets.html
