export type AuthCredentials = {
  username: string;
  password: string;
};

export type AuthUser = {
  id: number;
  username: string;
};

export type AuthResponse = {
  user: AuthUser;
};

export type Folder = {
  id: number;
  name: string;
  sortOrder: number;
};

export type FoldersResponse = {
  folders: Folder[];
};

export type NotebookEntry = {
  name: string;
};

export type DeletedNotebookEntry = {
  id: string;
  name: string;
};

export type NotebooksResponse = {
  notebooks: NotebookEntry[];
};

export type DeletedNotebooksResponse = {
  notebooks: DeletedNotebookEntry[];
};

export type NotebookResponse = {
  notebook: NotebookEntry;
};

export type DeletedNotebookResponse = {
  notebook: DeletedNotebookEntry;
};

export type NotebookNode = {
  id: string;
  title: string;
  textFile: string;
  voiceDir: string;
  imgDir: string;
};

export type NotebookAsset = {
  name: string;
  path: string;
  mediaType: string;
  url: string;
};

export type NotebookNodeDetail = {
  node: NotebookNode;
  textPath: string;
  textContent: string;
  imagePath: string;
  images: NotebookAsset[];
  voicePath: string;
  voices: NotebookAsset[];
};

export type NotebookNodeDetailResponse = {
  detail: NotebookNodeDetail;
};

export type TreeEdge = {
  from: string;
  to: string;
  side: "left" | "right";
  order: number;
};

export type NotebookTree = {
  rootId: string | null;
  nodes: NotebookNode[];
  edges: TreeEdge[];
  freeNodeIds: string[];
  deletedNodeIds: string[];
};

export type NotebookTreeResponse = {
  tree: NotebookTree;
};

export type CreateNodeRequest = {
  title: string;
  parentId?: string | null;
  textContent?: string;
  images?: File[];
  voices?: File[];
};

export type CreateNodeResponse = {
  node: NotebookNode;
  tree: NotebookTree;
};
