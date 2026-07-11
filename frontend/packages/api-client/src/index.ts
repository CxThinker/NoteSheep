import { createNodeFormData } from "./nodeFormData";
import type {
  AuthCredentials,
  AuthResponse,
  CreateNodeRequest,
  CreateNodeResponse,
  FoldersResponse,
  NotebookEntry,
  NotebookNodeDetailResponse,
  NotebookResponse,
  NotebooksResponse,
  NotebookTree,
  NotebookTreeResponse,
} from "./types";

export type * from "./types";

export interface AuthApi {
  register(credentials: AuthCredentials): Promise<AuthResponse>;
  login(credentials: AuthCredentials): Promise<AuthResponse>;
  me(): Promise<AuthResponse>;
  logout(): Promise<void>;
  listFolders(): Promise<FoldersResponse>;
  listNotebooks(): Promise<NotebooksResponse>;
  createNotebook(payload: NotebookEntry): Promise<NotebookResponse>;
  renameNotebook(currentName: string, payload: NotebookEntry): Promise<NotebookResponse>;
  getNotebookTree(name: string): Promise<NotebookTreeResponse>;
  getNodeDetail(notebookName: string, nodeId: string): Promise<NotebookNodeDetailResponse>;
  createNode(notebookName: string, payload: CreateNodeRequest): Promise<CreateNodeResponse>;
  updateNotebookTree(notebookName: string, tree: NotebookTree): Promise<NotebookTreeResponse>;
  deleteNode(notebookName: string, nodeId: string): Promise<NotebookTreeResponse>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class HttpAuthApi implements AuthApi {
  constructor(private readonly baseUrl = "") {}

  register(credentials: AuthCredentials): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  }

  login(credentials: AuthCredentials): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  }

  me(): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/auth/me");
  }

  async logout(): Promise<void> {
    await this.request<void>("/api/auth/logout", { method: "POST" });
  }

  listFolders(): Promise<FoldersResponse> {
    return this.request<FoldersResponse>("/api/folders");
  }

  listNotebooks(): Promise<NotebooksResponse> {
    return this.request<NotebooksResponse>("/api/notebooks");
  }

  createNotebook(payload: NotebookEntry): Promise<NotebookResponse> {
    return this.request<NotebookResponse>("/api/notebooks", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  renameNotebook(currentName: string, payload: NotebookEntry): Promise<NotebookResponse> {
    return this.request<NotebookResponse>(`/api/notebooks/${encodeURIComponent(currentName)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  getNotebookTree(name: string): Promise<NotebookTreeResponse> {
    return this.request<NotebookTreeResponse>(`/api/notebooks/${encodeURIComponent(name)}/tree`);
  }

  getNodeDetail(notebookName: string, nodeId: string): Promise<NotebookNodeDetailResponse> {
    return this.request<NotebookNodeDetailResponse>(
      `/api/notebooks/${encodeURIComponent(notebookName)}/nodes/${encodeURIComponent(nodeId)}/detail`,
    );
  }

  createNode(notebookName: string, payload: CreateNodeRequest): Promise<CreateNodeResponse> {
    return this.request<CreateNodeResponse>(
      `/api/notebooks/${encodeURIComponent(notebookName)}/nodes`,
      {
        method: "POST",
        body: createNodeFormData(payload),
      },
    );
  }

  updateNotebookTree(notebookName: string, tree: NotebookTree): Promise<NotebookTreeResponse> {
    return this.request<NotebookTreeResponse>(`/api/notebooks/${encodeURIComponent(notebookName)}/tree`, {
      method: "PUT",
      body: JSON.stringify({ tree }),
    });
  }

  deleteNode(notebookName: string, nodeId: string): Promise<NotebookTreeResponse> {
    return this.request<NotebookTreeResponse>(
      `/api/notebooks/${encodeURIComponent(notebookName)}/nodes/${encodeURIComponent(nodeId)}`,
      { method: "DELETE" },
    );
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const isFormData = init.body instanceof FormData;
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...init.headers,
      },
    });

    if (!response.ok) {
      const detail = await readDetail(response);
      throw new ApiError(detail, response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }
}

async function readDetail(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: string };
    return body.detail ?? "Request failed.";
  } catch {
    return "Request failed.";
  }
}
