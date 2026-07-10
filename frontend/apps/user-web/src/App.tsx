import {
  FormEvent,
  KeyboardEvent,
  PointerEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
  WheelEvent,
} from "react";

import {
  AuthApi,
  AuthUser,
  HttpAuthApi,
  NotebookEntry,
  NotebookNodeDetail,
  NotebookTree,
} from "@notesheep/api-client";
import { applyTheme, readStoredTheme, storeTheme, ThemeName, THEMES } from "@notesheep/ui";

import { MindMapCanvas, NodeCreateTarget, NodeDetailTarget } from "./MindMapCanvas";
import { messages } from "./messages";
import { moveNodeAsSibling, NOTEBOOK_ROOT_ID } from "./mindMapTree";

type AuthMode = "login" | "register";

type AppProps = {
  api?: AuthApi;
};

type WorkspaceDialog = "notebook" | "node" | "notebook-detail" | "node-detail" | null;

type ScrollbarState = {
  thumbHeight: number;
  thumbTop: number;
  valueMax: number;
  valueNow: number;
};

type ScrollbarDrag = {
  offsetY: number;
  pointerId: number;
};

const EMPTY_TREE: NotebookTree = {
  rootId: null,
  nodes: [],
  edges: [],
};

const EMPTY_SCROLLBAR: ScrollbarState = {
  thumbHeight: 0,
  thumbTop: 0,
  valueMax: 0,
  valueNow: 0,
};

const MIN_WORKSPACE_ZOOM = 0.5;
const MAX_WORKSPACE_ZOOM = 2;
const WORKSPACE_ZOOM_STEP = 0.1;
const NODE_DETAIL_TRANSITION_MS = 800;

export function App({ api }: AppProps) {
  const authApi = useMemo(() => api ?? new HttpAuthApi(), [api]);
  const [theme, setTheme] = useState<ThemeName>(() => readStoredTheme());
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [notebooks, setNotebooks] = useState<NotebookEntry[]>([]);
  const [selectedNotebookName, setSelectedNotebookName] = useState("");
  const [newNotebookName, setNewNotebookName] = useState("");
  const [tree, setTree] = useState<NotebookTree>(EMPTY_TREE);
  const [newNodeTitle, setNewNodeTitle] = useState("");
  const [newNodeTextContent, setNewNodeTextContent] = useState("");
  const [newNodeImages, setNewNodeImages] = useState<File[]>([]);
  const [newNodeVoices, setNewNodeVoices] = useState<File[]>([]);
  const [nodeCreateTarget, setNodeCreateTarget] = useState<NodeCreateTarget | null>(null);
  const [nodeDetailTarget, setNodeDetailTarget] = useState<NodeDetailTarget | null>(null);
  const [nodeDetail, setNodeDetail] = useState<NotebookNodeDetail | null>(null);
  const [isNodeDetailLoading, setNodeDetailLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");
  const [isWorkspaceSubmitting, setWorkspaceSubmitting] = useState(false);
  const [workspaceDialog, setWorkspaceDialog] = useState<WorkspaceDialog>(null);
  const nodeDetailRequestRef = useRef(0);

  useEffect(() => {
    applyTheme(theme);
    storeTheme(theme);
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    authApi
      .me()
      .then((response) => {
        if (!cancelled) {
          setUser(response.user);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [authApi]);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      clearWorkspace();
      return () => {
        cancelled = true;
      };
    }

    authApi
      .listNotebooks()
      .then((response) => {
        if (!cancelled) {
          applyNotebooks(response.notebooks);
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearWorkspace();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authApi, user]);

  useEffect(() => {
    let cancelled = false;
    if (!user || !selectedNotebookName) {
      setTree(EMPTY_TREE);
      return () => {
        cancelled = true;
      };
    }

    authApi
      .getNotebookTree(selectedNotebookName)
      .then((response) => {
        if (!cancelled) {
          setTree(response.tree);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTree(EMPTY_TREE);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authApi, selectedNotebookName, user]);

  function clearWorkspace() {
    setNotebooks([]);
    setSelectedNotebookName("");
    setTree(EMPTY_TREE);
    setNodeCreateTarget(null);
    setNewNodeTextContent("");
    setNewNodeImages([]);
    setNewNodeVoices([]);
    setNodeDetailTarget(null);
    setNodeDetail(null);
    setNodeDetailLoading(false);
    setWorkspaceDialog(null);
    nodeDetailRequestRef.current += 1;
  }

  function applyNotebooks(nextNotebooks: NotebookEntry[], preferredName?: string) {
    setNotebooks(nextNotebooks);
    const nextSelected =
      nextNotebooks.find((notebook) => notebook.name === preferredName)?.name ??
      nextNotebooks[0]?.name ??
      "";
    setSelectedNotebookName(nextSelected);
    if (!nextSelected) {
      setTree(EMPTY_TREE);
    }
  }

  async function reloadNotebooks(preferredName?: string) {
    const response = await authApi.listNotebooks();
    applyNotebooks(response.notebooks, preferredName);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 6) {
      setError(messages.auth.shortPassword);
      return;
    }

    setSubmitting(true);
    try {
      const response =
        mode === "login"
          ? await authApi.login({ username, password })
          : await registerThenLogin(authApi, username, password);
      setUser(response.user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : messages.auth.submitFailed);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await authApi.logout();
    setUser(null);
    setPassword("");
  }

  async function handleCreateNotebook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorkspaceError("");
    const notebookName = newNotebookName.trim();
    if (!notebookName) {
      setWorkspaceError(messages.shell.notebookNameRequired);
      return;
    }

    setWorkspaceSubmitting(true);
    try {
      const response = await authApi.createNotebook({ name: notebookName });
      setNewNotebookName("");
      setWorkspaceDialog(null);
      await reloadNotebooks(response.notebook.name);
    } catch (caught) {
      setWorkspaceError(caught instanceof Error ? caught.message : messages.shell.notebookActionFailed);
    } finally {
      setWorkspaceSubmitting(false);
    }
  }

  async function handleCreateNode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorkspaceError("");
    const nodeTitle = newNodeTitle.trim();
    if (!selectedNotebookName || !nodeTitle) {
      setWorkspaceError(messages.shell.nodeTitleRequired);
      return;
    }

    setWorkspaceSubmitting(true);
    try {
      const createTarget = nodeCreateTarget ?? { kind: "child" as const, parentId: NOTEBOOK_ROOT_ID };
      const parentId =
        createTarget.kind === "child"
          ? createTarget.parentId
          : findParentId(tree, createTarget.targetId) ?? NOTEBOOK_ROOT_ID;
      const createPayload = {
        title: nodeTitle,
        parentId,
        ...(newNodeTextContent ? { textContent: newNodeTextContent } : {}),
        ...(newNodeImages.length ? { images: newNodeImages } : {}),
        ...(newNodeVoices.length ? { voices: newNodeVoices } : {}),
      };
      const response = await authApi.createNode(selectedNotebookName, createPayload);
      let nextTree = response.tree;
      if (createTarget.kind === "sibling") {
        const result = moveNodeAsSibling(response.tree, response.node.id, createTarget.targetId, createTarget.side);
        if (result.error) {
          throw new Error(messages.shell.nodeActionFailed);
        }
        const saved = await authApi.updateNotebookTree(selectedNotebookName, result.tree);
        nextTree = saved.tree;
      }
      setNewNodeTitle("");
      setNewNodeTextContent("");
      setNewNodeImages([]);
      setNewNodeVoices([]);
      setNodeCreateTarget(null);
      setWorkspaceDialog(null);
      setTree(nextTree);
    } catch (caught) {
      setWorkspaceError(caught instanceof Error ? caught.message : messages.shell.nodeActionFailed);
    } finally {
      setWorkspaceSubmitting(false);
    }
  }

  async function handleUpdateTree(nextTree: NotebookTree) {
    if (!selectedNotebookName) {
      return false;
    }

    const previousTree = tree;
    const notebookName = selectedNotebookName;
    setTree(nextTree);
    setWorkspaceError("");
    setWorkspaceSubmitting(true);
    try {
      const response = await authApi.updateNotebookTree(notebookName, nextTree);
      if (selectedNotebookName === notebookName) {
        setTree(response.tree);
      }
      return true;
    } catch (caught) {
      if (selectedNotebookName === notebookName) {
        setTree(previousTree);
        setWorkspaceError(caught instanceof Error ? caught.message : messages.shell.treeUpdateFailed);
      }
      return false;
    } finally {
      setWorkspaceSubmitting(false);
    }
  }

  if (user) {
    return (
      <AppShell
        isWorkspaceSubmitting={isWorkspaceSubmitting}
        nodeDetailTarget={nodeDetailTarget}
        nodeDetail={nodeDetail}
        isNodeDetailLoading={isNodeDetailLoading}
        nodeCreateTarget={nodeCreateTarget}
        newNodeTitle={newNodeTitle}
        newNodeTextContent={newNodeTextContent}
        newNodeImages={newNodeImages}
        newNodeVoices={newNodeVoices}
        newNotebookName={newNotebookName}
        notebooks={notebooks}
        onCreateNode={handleCreateNode}
        onCreateNotebook={handleCreateNotebook}
        onCloseDialog={() => {
          setWorkspaceDialog(null);
          setWorkspaceError("");
          setNodeDetailTarget(null);
          setNodeDetail(null);
          setNodeDetailLoading(false);
          setNewNodeTextContent("");
          setNewNodeImages([]);
          setNewNodeVoices([]);
          nodeDetailRequestRef.current += 1;
        }}
        onLogout={handleLogout}
        onNewNodeTitleChange={setNewNodeTitle}
        onNewNodeTextContentChange={setNewNodeTextContent}
        onNewNodeImagesChange={setNewNodeImages}
        onNewNodeVoicesChange={setNewNodeVoices}
        onNewNotebookNameChange={setNewNotebookName}
        onOpenNodeDialog={(target = { kind: "child", parentId: NOTEBOOK_ROOT_ID }) => {
          setNewNodeTitle("");
          setNewNodeTextContent("");
          setNewNodeImages([]);
          setNewNodeVoices([]);
          setNodeCreateTarget(target);
          setNodeDetailTarget(null);
          setNodeDetail(null);
          setNodeDetailLoading(false);
          nodeDetailRequestRef.current += 1;
          setWorkspaceDialog("node");
          setWorkspaceError("");
        }}
        onOpenNodeDetail={(target) => {
          setNodeDetailTarget(target);
          setWorkspaceDialog(target.kind === "notebook" ? "notebook-detail" : "node-detail");
          setWorkspaceError("");
          setNodeDetail(null);
          const requestId = nodeDetailRequestRef.current + 1;
          nodeDetailRequestRef.current = requestId;
          if (target.kind !== "node") {
            setNodeDetailLoading(false);
            return;
          }
          if (!selectedNotebookName) {
            setNodeDetailLoading(false);
            setWorkspaceError(messages.shell.nodeDetailLoadFailed);
            return;
          }
          setNodeDetailLoading(true);
          authApi
            .getNodeDetail(selectedNotebookName, target.node.id)
            .then((response) => {
              if (nodeDetailRequestRef.current === requestId) {
                setNodeDetail(response.detail);
              }
            })
            .catch((caught) => {
              if (nodeDetailRequestRef.current === requestId) {
                setWorkspaceError(caught instanceof Error ? caught.message : messages.shell.nodeDetailLoadFailed);
              }
            })
            .finally(() => {
              if (nodeDetailRequestRef.current === requestId) {
                setNodeDetailLoading(false);
              }
            });
        }}
        onOpenNotebookDialog={() => {
          setNewNotebookName("");
          setNodeDetailTarget(null);
          setNodeDetail(null);
          setNodeDetailLoading(false);
          nodeDetailRequestRef.current += 1;
          setWorkspaceDialog("notebook");
          setWorkspaceError("");
        }}
        onSelectNotebook={(name) => {
          setSelectedNotebookName(name);
          setNodeCreateTarget(null);
          setNodeDetailTarget(null);
          setNodeDetail(null);
          setNodeDetailLoading(false);
          nodeDetailRequestRef.current += 1;
          setWorkspaceError("");
        }}
        onUpdateTree={handleUpdateTree}
        selectedNotebookName={selectedNotebookName}
        tree={tree}
        user={user}
        workspaceDialog={workspaceDialog}
        workspaceError={workspaceError}
      />
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">
            NS
          </div>
          <div>
            <p className="eyebrow">{messages.appName}</p>
            <h1 id="auth-title">
              {mode === "login" ? messages.auth.loginTitle : messages.auth.registerTitle}
            </h1>
          </div>
        </div>

        <p className="subtitle">{messages.auth.subtitle}</p>

        <div className="theme-switcher" aria-label="主题">
          {THEMES.map((item) => (
            <button
              className="theme-button"
              data-active={theme === item.name}
              key={item.name}
              onClick={() => setTheme(item.name)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>{messages.auth.username}</span>
            <input
              autoComplete="username"
              name="username"
              onChange={(event) => setUsername(event.target.value)}
              required
              value={username}
            />
          </label>

          <label>
            <span>{messages.auth.password}</span>
            <input
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-action" disabled={isSubmitting} type="submit">
            {mode === "login" ? messages.auth.login : messages.auth.register}
          </button>
        </form>

        <button
          className="text-action"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
          type="button"
        >
          {mode === "login" ? messages.auth.switchToRegister : messages.auth.switchToLogin}
        </button>
      </section>
    </main>
  );
}

async function registerThenLogin(api: AuthApi, username: string, password: string) {
  await api.register({ username, password });
  return api.login({ username, password });
}

function formatSelectedFiles(files: File[]) {
  return files.map((file) => file.name).join("、");
}

function AppShell({
  isWorkspaceSubmitting,
  isNodeDetailLoading,
  nodeDetail,
  newNodeTitle,
  newNodeTextContent,
  newNodeImages,
  newNodeVoices,
  nodeDetailTarget,
  nodeCreateTarget,
  newNotebookName,
  notebooks,
  onCreateNode,
  onCreateNotebook,
  onCloseDialog,
  user,
  onLogout,
  onNewNodeTitleChange,
  onNewNodeTextContentChange,
  onNewNodeImagesChange,
  onNewNodeVoicesChange,
  onNewNotebookNameChange,
  onOpenNodeDialog,
  onOpenNodeDetail,
  onOpenNotebookDialog,
  onSelectNotebook,
  onUpdateTree,
  selectedNotebookName,
  tree,
  workspaceDialog,
  workspaceError,
}: {
  isWorkspaceSubmitting: boolean;
  isNodeDetailLoading: boolean;
  nodeDetail: NotebookNodeDetail | null;
  newNodeTitle: string;
  newNodeTextContent: string;
  newNodeImages: File[];
  newNodeVoices: File[];
  nodeDetailTarget: NodeDetailTarget | null;
  nodeCreateTarget: NodeCreateTarget | null;
  newNotebookName: string;
  notebooks: NotebookEntry[];
  onCreateNode: (event: FormEvent<HTMLFormElement>) => void;
  onCreateNotebook: (event: FormEvent<HTMLFormElement>) => void;
  onCloseDialog: () => void;
  user: AuthUser;
  onLogout: () => void;
  onNewNodeTitleChange: (value: string) => void;
  onNewNodeTextContentChange: (value: string) => void;
  onNewNodeImagesChange: (files: File[]) => void;
  onNewNodeVoicesChange: (files: File[]) => void;
  onNewNotebookNameChange: (value: string) => void;
  onOpenNodeDialog: (target?: NodeCreateTarget) => void;
  onOpenNodeDetail: (target: NodeDetailTarget) => void;
  onOpenNotebookDialog: () => void;
  onSelectNotebook: (name: string) => void;
  onUpdateTree: (tree: NotebookTree) => Promise<boolean>;
  selectedNotebookName: string;
  tree: NotebookTree;
  workspaceDialog: WorkspaceDialog;
  workspaceError: string;
}) {
  const notebookSidebarRef = useRef<HTMLElement | null>(null);
  const scrollbarDragRef = useRef<ScrollbarDrag | null>(null);
  const [notebookScrollbar, setNotebookScrollbar] = useState<ScrollbarState>(EMPTY_SCROLLBAR);
  const [workspaceZoom, setWorkspaceZoom] = useState(1);

  function syncNotebookScrollbar() {
    const element = notebookSidebarRef.current;
    if (!element) {
      return;
    }
    setNotebookScrollbar((current) => {
      const next = readScrollbarState(element);
      return isSameScrollbarState(current, next) ? current : next;
    });
  }

  function scrollNotebookTo(nextScrollTop: number) {
    const element = notebookSidebarRef.current;
    if (!element) {
      return;
    }
    const maxScroll = Math.max(element.scrollHeight - element.clientHeight, 0);
    element.scrollTop = clampNumber(nextScrollTop, 0, maxScroll);
    syncNotebookScrollbar();
  }

  function scrollNotebookFromPointer(clientY: number, track: HTMLDivElement, offsetY: number) {
    const element = notebookSidebarRef.current;
    if (!element) {
      return;
    }
    const maxScroll = Math.max(element.scrollHeight - element.clientHeight, 0);
    const maxThumbTop = Math.max(element.clientHeight - notebookScrollbar.thumbHeight, 0);
    if (maxScroll === 0 || maxThumbTop === 0) {
      scrollNotebookTo(0);
      return;
    }

    const trackTop = track.getBoundingClientRect().top;
    const nextThumbTop = clampNumber(clientY - trackTop - offsetY, 0, maxThumbTop);
    scrollNotebookTo((nextThumbTop / maxThumbTop) * maxScroll);
  }

  function handleNotebookScrollbarWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const element = notebookSidebarRef.current;
    if (!element) {
      return;
    }
    scrollNotebookTo(element.scrollTop + event.deltaY);
  }

  function handleNotebookScrollbarPointerDown(event: PointerEvent<HTMLDivElement>) {
    const element = notebookSidebarRef.current;
    if (!element) {
      return;
    }
    event.preventDefault();

    const pointerTop = event.clientY - event.currentTarget.getBoundingClientRect().top;
    const thumbBottom = notebookScrollbar.thumbTop + notebookScrollbar.thumbHeight;
    const offsetY =
      pointerTop >= notebookScrollbar.thumbTop && pointerTop <= thumbBottom
        ? pointerTop - notebookScrollbar.thumbTop
        : notebookScrollbar.thumbHeight / 2;

    scrollbarDragRef.current = {
      offsetY,
      pointerId: event.pointerId,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    scrollNotebookFromPointer(event.clientY, event.currentTarget, offsetY);
  }

  function handleNotebookScrollbarPointerMove(event: PointerEvent<HTMLDivElement>) {
    const dragState = scrollbarDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    scrollNotebookFromPointer(event.clientY, event.currentTarget, dragState.offsetY);
  }

  function handleNotebookScrollbarPointerUp(event: PointerEvent<HTMLDivElement>) {
    const dragState = scrollbarDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }
    scrollbarDragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleNotebookScrollbarKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const element = notebookSidebarRef.current;
    if (!element) {
      return;
    }

    const keyScrollAmount: Record<string, number> = {
      ArrowDown: 48,
      ArrowUp: -48,
      PageDown: element.clientHeight,
      PageUp: -element.clientHeight,
    };

    if (event.key === "Home") {
      event.preventDefault();
      scrollNotebookTo(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      scrollNotebookTo(element.scrollHeight);
      return;
    }
    if (event.key in keyScrollAmount) {
      event.preventDefault();
      scrollNotebookTo(element.scrollTop + keyScrollAmount[event.key]);
    }
  }

  function updateWorkspaceZoom(delta: number) {
    setWorkspaceZoom((currentZoom) => clampZoom(currentZoom + delta));
  }

  function resetWorkspaceZoom() {
    setWorkspaceZoom(1);
  }

  function handleTreeBoardWheel(event: WheelEvent<HTMLDivElement>) {
    if (event.deltaY === 0) {
      return;
    }
    event.preventDefault();
    updateWorkspaceZoom(event.deltaY < 0 ? WORKSPACE_ZOOM_STEP : -WORKSPACE_ZOOM_STEP);
  }

  useEffect(() => {
    const element = notebookSidebarRef.current;
    if (!element) {
      return undefined;
    }

    syncNotebookScrollbar();
    window.addEventListener("resize", syncNotebookScrollbar);

    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(syncNotebookScrollbar);
      resizeObserver.observe(element);
      const content = element.querySelector(".notebook-sidebar-content");
      if (content instanceof HTMLElement) {
        resizeObserver.observe(content);
      }
    }

    return () => {
      window.removeEventListener("resize", syncNotebookScrollbar);
      resizeObserver?.disconnect();
    };
  }, [notebooks.length]);

  return (
    <main className="shell-page">
      <header className="shell-header">
        <div className="shell-brand">
          <h1>{messages.appName}</h1>
          <span>{user.username}</span>
        </div>
        <button className="text-action" onClick={onLogout} type="button">
          {messages.shell.logout}
        </button>
      </header>

      <section className="workspace-frame" aria-label="工作区">
        <div className="notebook-scroll-shell">
          <div
            aria-controls="notebook-sidebar-scroll"
            aria-label="笔记本滚动条"
            aria-orientation="vertical"
            aria-valuemax={notebookScrollbar.valueMax}
            aria-valuemin={0}
            aria-valuenow={notebookScrollbar.valueNow}
            className="workspace-scrollbar"
            onKeyDown={handleNotebookScrollbarKeyDown}
            onPointerCancel={handleNotebookScrollbarPointerUp}
            onPointerDown={handleNotebookScrollbarPointerDown}
            onPointerMove={handleNotebookScrollbarPointerMove}
            onPointerUp={handleNotebookScrollbarPointerUp}
            onWheel={handleNotebookScrollbarWheel}
            role="scrollbar"
            tabIndex={0}
          >
            <span
              className="workspace-scrollbar-thumb"
              style={{
                height: notebookScrollbar.thumbHeight ? `${notebookScrollbar.thumbHeight}px` : "100%",
                transform: `translateY(${notebookScrollbar.thumbTop}px)`,
              }}
            />
          </div>

          <aside
            className="notebook-sidebar"
            id="notebook-sidebar-scroll"
            onScroll={syncNotebookScrollbar}
            ref={notebookSidebarRef}
            aria-label="笔记本侧栏"
          >
            <div className="notebook-sidebar-content">
              <button className="create-notebook-button" onClick={onOpenNotebookDialog} type="button">
                {messages.shell.openCreateNotebook}
              </button>

              <div aria-label="笔记本列表" className="notebook-list">
                {notebooks.length === 0 ? (
                  <p className="empty-state">{messages.shell.emptyNotebooks}</p>
                ) : null}
                {notebooks.map((notebook) => (
                  <button
                    className="notebook-item"
                    data-active={selectedNotebookName === notebook.name}
                    key={notebook.name}
                    onClick={() => onSelectNotebook(notebook.name)}
                    type="button"
                  >
                    {notebook.name}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <section className="notebook-canvas" aria-label="笔记本树状图">
          <div aria-label={messages.shell.zoomControls} className="zoom-toolbar">
            <button
              aria-label={messages.shell.zoomOut}
              className="zoom-button"
              disabled={workspaceZoom <= MIN_WORKSPACE_ZOOM}
              onClick={() => updateWorkspaceZoom(-WORKSPACE_ZOOM_STEP)}
              type="button"
            >
              -
            </button>
            <span aria-label={messages.shell.currentZoom} className="zoom-value">
              {formatZoom(workspaceZoom)}
            </span>
            <button
              aria-label={messages.shell.zoomIn}
              className="zoom-button"
              disabled={workspaceZoom >= MAX_WORKSPACE_ZOOM}
              onClick={() => updateWorkspaceZoom(WORKSPACE_ZOOM_STEP)}
              type="button"
            >
              +
            </button>
            <button
              aria-label={messages.shell.resetZoom}
              className="zoom-reset"
              disabled={workspaceZoom === 1}
              onClick={resetWorkspaceZoom}
              type="button"
            >
              100%
            </button>
          </div>

          <div aria-label={messages.shell.treeBoard} className="tree-board" onWheel={handleTreeBoardWheel}>
            {!selectedNotebookName ? (
              <p className="empty-state">{messages.shell.chooseNotebook}</p>
            ) : (
              <MindMapCanvas
                disabled={isWorkspaceSubmitting}
                error={workspaceDialog ? "" : workspaceError}
                onCreateNodeAt={onOpenNodeDialog}
                onOpenNodeDetail={onOpenNodeDetail}
                onTreeChange={onUpdateTree}
                rootTitle={selectedNotebookName}
                tree={tree}
                zoom={workspaceZoom}
              />
            )}
          </div>

          <button
            aria-label={messages.shell.createNode}
            className="node-fab"
            disabled={!selectedNotebookName}
            onClick={() => onOpenNodeDialog({ kind: "child", parentId: NOTEBOOK_ROOT_ID })}
            type="button"
          >
            ✎
          </button>
        </section>
      </section>

      {workspaceDialog === "notebook" ? (
        <WorkspaceDialogPanel
          error={workspaceError}
          isSubmitting={isWorkspaceSubmitting}
          onClose={onCloseDialog}
          onSubmit={onCreateNotebook}
          submitLabel={messages.shell.createNotebook}
          title={messages.shell.createNotebookTitle}
        >
          <label>
            <span>{messages.shell.notebookName}</span>
            <input
              autoFocus
              name="notebook-name"
              onChange={(event) => onNewNotebookNameChange(event.target.value)}
              value={newNotebookName}
            />
          </label>
        </WorkspaceDialogPanel>
      ) : null}

      {workspaceDialog === "node" ? (
        <WorkspaceDialogPanel
          error={workspaceError}
          isSubmitting={isWorkspaceSubmitting}
          onClose={onCloseDialog}
          onSubmit={onCreateNode}
          submitLabel={messages.shell.saveNode}
          title={
            nodeCreateTarget?.kind === "sibling"
              ? messages.shell.createSiblingNodeTitle
              : messages.shell.createChildNodeTitle
          }
        >
          <label>
            <span>{messages.shell.nodeTitle}</span>
            <input
              autoFocus
              name="node-title"
              onChange={(event) => onNewNodeTitleChange(event.target.value)}
              value={newNodeTitle}
            />
          </label>
          <label>
            <span>{messages.shell.nodeTextContent}</span>
            <textarea
              name="node-text-content"
              onChange={(event) => onNewNodeTextContentChange(event.target.value)}
              rows={5}
              value={newNodeTextContent}
            />
          </label>
          <label>
            <span>{messages.shell.nodeImages}</span>
            <input
              accept="image/avif,image/bmp,image/gif,image/jpeg,image/png,image/webp"
              multiple
              name="node-images"
              onChange={(event) => onNewNodeImagesChange(Array.from(event.target.files ?? []))}
              type="file"
            />
          </label>
          {newNodeImages.length ? <p className="file-selection">{formatSelectedFiles(newNodeImages)}</p> : null}
          <label>
            <span>{messages.shell.nodeVoices}</span>
            <input
              accept="audio/aac,audio/flac,audio/mp4,audio/mpeg,audio/ogg,audio/wav,audio/webm"
              multiple
              name="node-voices"
              onChange={(event) => onNewNodeVoicesChange(Array.from(event.target.files ?? []))}
              type="file"
            />
          </label>
          {newNodeVoices.length ? <p className="file-selection">{formatSelectedFiles(newNodeVoices)}</p> : null}
        </WorkspaceDialogPanel>
      ) : null}

      {workspaceDialog === "notebook-detail" && nodeDetailTarget?.kind === "notebook" ? (
        <WorkspaceDetailPanel onClose={onCloseDialog} title={messages.shell.notebookDetailTitle}>
          <dl className="detail-list">
            <div className="detail-row">
              <dt>{messages.shell.currentNotebook}</dt>
              <dd>{nodeDetailTarget.title}</dd>
            </div>
          </dl>
        </WorkspaceDetailPanel>
      ) : null}

      {workspaceDialog === "node-detail" && nodeDetailTarget?.kind === "node" ? (
        <WorkspaceDetailPanel className="node-detail-panel" onClose={onCloseDialog} title={messages.shell.nodeDetailTitle}>
          <NodeDetailView
            detail={nodeDetail}
            error={workspaceError}
            isLoading={isNodeDetailLoading}
            target={nodeDetailTarget}
          />
        </WorkspaceDetailPanel>
      ) : null}
    </main>
  );
}

function WorkspaceDetailPanel({
  children,
  className = "",
  onClose,
  title,
}: {
  children: ReactNode;
  className?: string;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="modal-backdrop">
      <section
        aria-labelledby="workspace-dialog-title"
        aria-modal="true"
        className={`modal-panel ${className}`.trim()}
        role="dialog"
      >
        <div className="modal-header">
          <h2 id="workspace-dialog-title">{title}</h2>
          <button aria-label={messages.shell.closeDialog} className="icon-button" onClick={onClose} type="button">
            ×
          </button>
        </div>
        {children}
        <div className="detail-actions">
          <button className="primary-action" onClick={onClose} type="button">
            {messages.shell.closeDialog}
          </button>
        </div>
      </section>
    </div>
  );
}

function NodeDetailView({
  detail,
  error,
  isLoading,
  target,
}: {
  detail: NotebookNodeDetail | null;
  error: string;
  isLoading: boolean;
  target: Extract<NodeDetailTarget, { kind: "node" }>;
}) {
  const hasImages = Boolean(detail?.images.length);
  const [isTextPanelOpen, setTextPanelOpen] = useState(true);
  const [isImagePanelOpen, setImagePanelOpen] = useState(hasImages);
  const [isPanelTransitioning, setPanelTransitioning] = useState(false);
  const panelTransitionTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const firstVoice = detail?.voices[0] ?? null;
  const notePath = detail?.textPath ?? `note/${target.node.textFile}`;
  const imagePath = detail?.imagePath ?? target.node.imgDir;
  const voicePath = detail?.voicePath ?? target.node.voiceDir;
  const areBothPanelsOpen = isTextPanelOpen && isImagePanelOpen;
  const isTextOnlyPanelOpen = isTextPanelOpen && !isImagePanelOpen;
  const isImageOnlyPanelOpen = !isTextPanelOpen && isImagePanelOpen;

  useEffect(() => {
    if (panelTransitionTimeoutRef.current) {
      window.clearTimeout(panelTransitionTimeoutRef.current);
      panelTransitionTimeoutRef.current = null;
    }
    setPanelTransitioning(false);
    setTextPanelOpen(true);
    setImagePanelOpen(Boolean(detail?.images.length));
  }, [detail?.node.id, detail?.images.length]);

  useEffect(() => {
    return () => {
      if (panelTransitionTimeoutRef.current) {
        window.clearTimeout(panelTransitionTimeoutRef.current);
      }
    };
  }, []);

  function startPanelTransition(updatePanels: () => void) {
    if (isPanelTransitioning) {
      return;
    }
    if (panelTransitionTimeoutRef.current) {
      window.clearTimeout(panelTransitionTimeoutRef.current);
    }
    setPanelTransitioning(true);
    updatePanels();
    panelTransitionTimeoutRef.current = window.setTimeout(() => {
      setPanelTransitioning(false);
      panelTransitionTimeoutRef.current = null;
    }, NODE_DETAIL_TRANSITION_MS);
  }

  return (
    <section
      className="node-detail-layout"
      data-has-images={hasImages}
      data-images-open={isImagePanelOpen}
      data-text-open={isTextPanelOpen}
      data-transitioning={isPanelTransitioning}
    >
      <div className="node-detail-title-row">
        <h3>{target.node.title}</h3>
        <p className="node-detail-position">
          <span>{messages.shell.node}</span>
          <strong>{target.position}</strong>
        </p>
      </div>

      <div className="node-detail-grid-shell">
        <div className="node-detail-paths">
          <div aria-hidden={!isTextPanelOpen} data-panel-open={isTextPanelOpen}>
            <span>{messages.shell.textPath}</span>
            <strong>{notePath}</strong>
          </div>
          <div aria-hidden={!isImagePanelOpen} data-panel-open={isImagePanelOpen}>
            <span>{messages.shell.imagePath}</span>
            <strong>{imagePath}</strong>
          </div>
        </div>

        {isLoading ? <p className="node-detail-state">{messages.shell.nodeDetailLoading}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}

        {!isLoading && !error ? (
          <div className="node-detail-body">
            <section
              aria-hidden={!isTextPanelOpen}
              aria-label={messages.shell.textContent}
              className="node-detail-text"
              data-panel-open={isTextPanelOpen}
            >
              <h4>{messages.shell.textContent}</h4>
              <pre>{detail?.textContent.trim() ? detail.textContent : messages.shell.emptyTextContent}</pre>
            </section>

            <section
              aria-hidden={!isImagePanelOpen}
              aria-label={messages.shell.imageContent}
              className="node-detail-images"
              data-panel-open={isImagePanelOpen}
            >
              <h4>{messages.shell.imageContent}</h4>
              {hasImages ? (
                <div className="node-detail-image-grid">
                  {detail?.images.map((image) => (
                    <figure key={image.path}>
                      <img alt={image.name} src={image.url} />
                      <figcaption>{image.name}</figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <p className="empty-detail-panel">{messages.shell.emptyImageContent}</p>
              )}
            </section>

            <div
              aria-hidden={!areBothPanelsOpen}
              aria-label="详情模块收起控制"
              className="detail-panel-toggle-cluster"
              data-control-active={areBothPanelsOpen}
            >
              <button
                aria-label={messages.shell.collapseText}
                className="detail-panel-toggle"
                disabled={!areBothPanelsOpen || isPanelTransitioning}
                onClick={() => startPanelTransition(() => setTextPanelOpen(false))}
                tabIndex={areBothPanelsOpen ? 0 : -1}
                type="button"
              >
                &lt;
              </button>
              <button
                aria-label={messages.shell.collapseImages}
                className="detail-panel-toggle"
                disabled={!areBothPanelsOpen || isPanelTransitioning}
                onClick={() => startPanelTransition(() => setImagePanelOpen(false))}
                tabIndex={areBothPanelsOpen ? 0 : -1}
                type="button"
              >
                &gt;
              </button>
            </div>

            <button
              aria-hidden={!isTextOnlyPanelOpen}
              aria-label={messages.shell.expandImages}
              className="detail-panel-toggle detail-panel-toggle-single detail-panel-toggle-expand-images"
              data-control-active={isTextOnlyPanelOpen}
              disabled={!isTextOnlyPanelOpen || isPanelTransitioning}
              onClick={() => startPanelTransition(() => setImagePanelOpen(true))}
              tabIndex={isTextOnlyPanelOpen ? 0 : -1}
              type="button"
            >
              &lt;
            </button>

            <button
              aria-hidden={!isImageOnlyPanelOpen}
              aria-label={messages.shell.expandText}
              className="detail-panel-toggle detail-panel-toggle-single detail-panel-toggle-expand-text"
              data-control-active={isImageOnlyPanelOpen}
              disabled={!isImageOnlyPanelOpen || isPanelTransitioning}
              onClick={() => startPanelTransition(() => setTextPanelOpen(true))}
              tabIndex={isImageOnlyPanelOpen ? 0 : -1}
              type="button"
            >
              &gt;
            </button>
          </div>
        ) : null}
      </div>

      <div className="node-detail-audio">
        <div className="audio-path">
          <span>{messages.shell.voiceResource}</span>
          <strong>{voicePath}</strong>
        </div>
        {firstVoice ? (
          <audio controls src={firstVoice.url}>
            {messages.shell.audioUnsupported}
          </audio>
        ) : (
          <div className="audio-placeholder" aria-label={messages.shell.noAudio}>
            <button aria-label={messages.shell.playAudio} disabled type="button">
              ▶
            </button>
            <div className="audio-bars" aria-hidden="true">
              <span />
            </div>
            <time>0:00</time>
          </div>
        )}
      </div>
    </section>
  );
}

function WorkspaceDialogPanel({
  children,
  error,
  isSubmitting,
  onClose,
  onSubmit,
  submitLabel,
  title,
}: {
  children: ReactNode;
  error: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  title: string;
}) {
  return (
    <div className="modal-backdrop">
      <section aria-labelledby="workspace-dialog-title" aria-modal="true" className="modal-panel" role="dialog">
        <div className="modal-header">
          <h2 id="workspace-dialog-title">{title}</h2>
          <button aria-label={messages.shell.closeDialog} className="icon-button" onClick={onClose} type="button">
            ×
          </button>
        </div>
        <form className="dialog-form" onSubmit={onSubmit}>
          {children}
          {error ? <p className="form-error">{error}</p> : null}
          <div className="dialog-actions">
            <button className="text-action" onClick={onClose} type="button">
              {messages.shell.cancel}
            </button>
            <button className="primary-action" disabled={isSubmitting} type="submit">
              {submitLabel}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function readScrollbarState(element: HTMLElement): ScrollbarState {
  const clientHeight = element.clientHeight;
  const scrollHeight = Math.max(element.scrollHeight, clientHeight);
  if (clientHeight <= 0) {
    return EMPTY_SCROLLBAR;
  }

  const valueMax = Math.max(scrollHeight - clientHeight, 0);
  const minThumbHeight = Math.min(48, clientHeight);
  const thumbHeight =
    valueMax === 0 ? clientHeight : Math.max(minThumbHeight, (clientHeight / scrollHeight) * clientHeight);
  const maxThumbTop = Math.max(clientHeight - thumbHeight, 0);
  const thumbTop = valueMax === 0 ? 0 : (element.scrollTop / valueMax) * maxThumbTop;

  return {
    thumbHeight: Math.round(thumbHeight),
    thumbTop: Math.round(thumbTop),
    valueMax: Math.round(valueMax),
    valueNow: Math.round(element.scrollTop),
  };
}

function isSameScrollbarState(left: ScrollbarState, right: ScrollbarState) {
  return (
    left.thumbHeight === right.thumbHeight &&
    left.thumbTop === right.thumbTop &&
    left.valueMax === right.valueMax &&
    left.valueNow === right.valueNow
  );
}

function clampZoom(value: number) {
  return Math.round(clampNumber(value, MIN_WORKSPACE_ZOOM, MAX_WORKSPACE_ZOOM) * 10) / 10;
}

function formatZoom(value: number) {
  return `${Math.round(value * 100)}%`;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function findParentId(tree: NotebookTree, nodeId: string) {
  return tree.edges.find((edge) => edge.to === nodeId)?.from ?? null;
}
