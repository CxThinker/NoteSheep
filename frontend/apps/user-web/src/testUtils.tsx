import { vi } from "vitest";

import type { AuthApi, NotebookTree } from "@notesheep/api-client";

export const emptyTree: NotebookTree = {
  rootId: null,
  nodes: [],
  edges: [],
  freeNodeIds: [],
  deletedNodeIds: [],
};

export const treeWithNode: NotebookTree = {
  rootId: "__notesheep_notebook_root__",
  nodes: [
    {
      id: "node-1",
      title: "节点一",
      textFile: "节点一.md",
      voiceDir: "../voice/节点一",
      imgDir: "../img/节点一",
    },
  ],
  edges: [{ from: "__notesheep_notebook_root__", to: "node-1", side: "right", order: 0 }],
  freeNodeIds: [],
  deletedNodeIds: [],
};

export class MockMediaRecorder {
  static instances: MockMediaRecorder[] = [];
  static isTypeSupported = vi.fn(() => true);

  mimeType: string;
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: ((event: Event) => void) | null = null;
  state: RecordingState = "inactive";

  constructor() {
    this.mimeType = "audio/webm";
    MockMediaRecorder.instances.push(this);
  }

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    this.ondataavailable?.({
      data: new Blob(["recorded audio"], { type: this.mimeType }),
    } as BlobEvent);
    this.onstop?.(new Event("stop"));
  }
}

export function resetAppTestEnvironment() {
  vi.useRealTimers();
  localStorage.clear();
  document.documentElement.dataset.theme = "";
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  MockMediaRecorder.instances = [];
  MockMediaRecorder.isTypeSupported.mockClear();
}

export function installMediaRecorderMock() {
  const stopTrack = vi.fn();
  const getUserMedia = vi.fn().mockResolvedValue({
    getTracks: () => [{ stop: stopTrack }],
  } as unknown as MediaStream);

  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
  Object.defineProperty(globalThis, "MediaRecorder", {
    configurable: true,
    value: MockMediaRecorder,
  });
  URL.createObjectURL = vi.fn(() => "blob:recorded-voice");
  URL.revokeObjectURL = vi.fn();

  return { getUserMedia, stopTrack };
}

export function makeApi(overrides: Partial<AuthApi> = {}): AuthApi {
  return {
    register: vi.fn().mockResolvedValue({ user: { id: 1, username: "new-user" } }),
    login: vi.fn().mockResolvedValue({ user: { id: 2, username: "note-taker" } }),
    me: vi.fn().mockRejectedValue(new Error("Not authenticated.")),
    logout: vi.fn().mockResolvedValue(undefined),
    listFolders: vi.fn().mockResolvedValue({ folders: [{ id: 1, name: "笔记本1", sortOrder: 0 }] }),
    listNotebooks: vi.fn().mockResolvedValue({ notebooks: [{ name: "笔记本1" }] }),
    createNotebook: vi.fn().mockResolvedValue({ notebook: { name: "笔记本1" } }),
    renameNotebook: vi.fn().mockResolvedValue({ notebook: { name: "笔记本2" } }),
    getNotebookTree: vi.fn().mockResolvedValue({ tree: treeWithNode }),
    getNodeDetail: vi.fn().mockResolvedValue({
      detail: {
        node: treeWithNode.nodes[0],
        textPath: "notes/笔记本1/note/节点一.md",
        textContent: "节点正文",
        imagePath: "notes/笔记本1/img/节点一/",
        images: [],
        voicePath: "notes/笔记本1/voice/节点一/",
        voices: [],
      },
    }),
    createNode: vi.fn().mockResolvedValue({ node: treeWithNode.nodes[0], tree: treeWithNode }),
    updateNotebookTree: vi.fn().mockImplementation((_, tree) => Promise.resolve({ tree })),
    deleteNode: vi.fn().mockImplementation((_, __) => Promise.resolve({ tree: emptyTree })),
    ...overrides,
  };
}
