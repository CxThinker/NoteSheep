import { FormEvent } from "react";

import { AuthApi, NotebookTree } from "@notesheep/api-client";

import { NodeCreateTarget } from "../MindMapCanvas";
import { messages } from "../messages";
import { NOTEBOOK_ROOT_ID } from "../mindMapTree";
import { findParentId, treeAfterNodeCreate } from "./workspaceTreeActions";

type CreateNodeContext = {
  authApi: AuthApi;
  event: FormEvent<HTMLFormElement>;
  newNodeImages: File[];
  newNodeTextContent: string;
  newNodeTitle: string;
  newNodeVoices: File[];
  nodeCreateTarget: NodeCreateTarget | null;
  resetNodeForm: () => void;
  selectedNotebookName: string;
  setTree: (tree: NotebookTree) => void;
  setWorkspaceDialog: (value: null) => void;
  setWorkspaceError: (value: string) => void;
  setWorkspaceSubmitting: (value: boolean) => void;
  tree: NotebookTree;
};

export async function createNodeFromForm(context: CreateNodeContext) {
  context.event.preventDefault();
  context.setWorkspaceError("");
  const nodeTitle = context.newNodeTitle.trim();
  if (!context.selectedNotebookName || !nodeTitle) {
    context.setWorkspaceError(messages.shell.nodeTitleRequired);
    return;
  }

  context.setWorkspaceSubmitting(true);
  try {
    const createTarget = context.nodeCreateTarget;
    const parentId = parentIdForTarget(createTarget, context.tree);
    const response = await context.authApi.createNode(context.selectedNotebookName, {
      title: nodeTitle,
      ...(parentId ? { parentId } : {}),
      ...(context.newNodeTextContent ? { textContent: context.newNodeTextContent } : {}),
      ...(context.newNodeImages.length ? { images: context.newNodeImages } : {}),
      ...(context.newNodeVoices.length ? { voices: context.newNodeVoices } : {}),
    });
    context.setTree(
      await treeAfterNodeCreate({
        authApi: context.authApi,
        nodeId: response.node.id,
        selectedNotebookName: context.selectedNotebookName,
        target: createTarget ?? { kind: "child", parentId: response.node.id },
        tree: response.tree,
      }),
    );
    context.resetNodeForm();
    context.setWorkspaceDialog(null);
  } catch (caught) {
    context.setWorkspaceError(caught instanceof Error ? caught.message : messages.shell.nodeActionFailed);
  } finally {
    context.setWorkspaceSubmitting(false);
  }
}

function parentIdForTarget(target: NodeCreateTarget | null, tree: NotebookTree) {
  if (target?.kind === "child") {
    return target.parentId;
  }
  if (target?.kind === "sibling") {
    return findParentId(tree, target.targetId) ?? NOTEBOOK_ROOT_ID;
  }
  return undefined;
}
