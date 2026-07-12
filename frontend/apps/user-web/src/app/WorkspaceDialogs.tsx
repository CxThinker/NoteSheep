import { useEffect, useState } from "react";

import { formatMessage, messages } from "../messages";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { DeleteNodeDialog } from "./DeleteNodeDialog";
import { NotebookDetailDialog } from "./NotebookDetailDialog";
import { NotebookDialog } from "./NotebookDialog";
import { NodeDetailDialog } from "./NodeDetailDialog";
import { NodeDialog } from "./NodeDialog";
import type { useWorkspaceController } from "./useWorkspaceController";

type WorkspaceController = ReturnType<typeof useWorkspaceController>;

type WorkspaceDialogsProps = {
  controller: WorkspaceController;
  isNodeAudioUploadEnabled: boolean;
  isNodeDetailPathVisible: boolean;
};

export function WorkspaceDialogs({ controller, isNodeAudioUploadEnabled, isNodeDetailPathVisible }: WorkspaceDialogsProps) {
  const [isNodeVoiceBusy, setNodeVoiceBusy] = useNodeVoiceBusy(controller.workspaceDialog);
  const deleteConfirmation = getDeleteConfirmation(controller);
  return (
    <>
      {controller.workspaceDialog === "notebook" ? (
        <NotebookDialog
          error={controller.workspaceError}
          isSubmitting={controller.isWorkspaceSubmitting}
          name={controller.newNotebookName}
          onClose={controller.onCloseDialog}
          onNameChange={controller.setNewNotebookName}
          onSubmit={controller.handleCreateNotebook}
        />
      ) : null}
      {controller.workspaceDialog === "node" ? (
        <NodeDialog
          error={controller.workspaceError}
          images={controller.newNodeImages}
          isAudioUploadEnabled={isNodeAudioUploadEnabled}
          isSubmitting={controller.isWorkspaceSubmitting}
          isVoiceBusy={isNodeVoiceBusy}
          nodeCreateTarget={controller.nodeCreateTarget}
          onBusyChange={setNodeVoiceBusy}
          onClose={controller.onCloseDialog}
          onImagesChange={controller.setNewNodeImages}
          onSubmit={controller.handleCreateNode}
          onTextContentChange={controller.setNewNodeTextContent}
          onTitleChange={controller.setNewNodeTitle}
          onVoicesChange={controller.setNewNodeVoices}
          textContent={controller.newNodeTextContent}
          title={controller.newNodeTitle}
          voices={controller.newNodeVoices}
        />
      ) : null}
      {controller.workspaceDialog === "notebook-detail" && controller.nodeDetailTarget?.kind === "notebook" ? (
        <NotebookDetailDialog onClose={controller.onCloseDialog} target={controller.nodeDetailTarget} />
      ) : null}
      {controller.workspaceDialog === "node-detail" && controller.nodeDetailTarget?.kind === "node" ? (
        <NodeDetailDialog
          detail={controller.nodeDetail}
          error={controller.workspaceError}
          isLoading={controller.isNodeDetailLoading}
          isPathVisible={isNodeDetailPathVisible}
          onClose={controller.onCloseDialog}
          target={controller.nodeDetailTarget}
        />
      ) : null}
      {controller.workspaceDialog === "delete-node" && controller.pendingDeleteTarget?.node ? (
        <DeleteNodeDialog
          hasChildren={controller.pendingDeleteTarget.hasChildren}
          isSubmitting={controller.isWorkspaceSubmitting}
          nodeTitle={controller.pendingDeleteTarget.node.title}
          onCancel={controller.onCloseDialog}
          onDeleteNodeOnly={controller.onConfirmDeleteNodeOnly}
          onDeleteSubtree={controller.onConfirmDeleteSubtree}
        />
      ) : null}
      {controller.workspaceDialog === "confirm-delete" && deleteConfirmation ? (
        <ConfirmDeleteDialog
          confirmLabel={deleteConfirmation.confirmLabel}
          error={controller.workspaceError}
          isSubmitting={controller.isWorkspaceSubmitting}
          itemName={deleteConfirmation.itemName}
          message={deleteConfirmation.message}
          onCancel={controller.onCloseDialog}
          onConfirm={deleteConfirmation.onConfirm}
          title={deleteConfirmation.title}
        />
      ) : null}
    </>
  );
}

function getDeleteConfirmation(controller: WorkspaceController) {
  if (controller.pendingPermanentDeleteTarget?.node) {
    return {
      confirmLabel: messages.shell.permanentDelete,
      itemName: controller.pendingPermanentDeleteTarget.node.title,
      message: messages.shell.confirmPermanentDelete,
      onConfirm: controller.onConfirmPermanentDeleteNode,
      title: messages.shell.confirmPermanentDeleteNodeTitle,
    };
  }
  if (!controller.pendingNotebookDelete) {
    return null;
  }
  if (controller.pendingNotebookDelete.kind === "delete") {
    const notebookName = controller.pendingNotebookDelete.notebookName;
    return {
      confirmLabel: messages.shell.deleteNotebookAction,
      itemName: notebookName,
      message: formatMessage(messages.shell.confirmDeleteNotebook, { notebookName }),
      onConfirm: controller.onConfirmNotebookDelete,
      title: messages.shell.deleteNotebookAction,
    };
  }
  const notebookName = controller.pendingNotebookDelete.notebook.name;
  return {
    confirmLabel: messages.shell.permanentDeleteNotebookAction,
    itemName: notebookName,
    message: formatMessage(messages.shell.confirmPermanentDeleteNotebook, { notebookName }),
    onConfirm: controller.onConfirmNotebookDelete,
    title: messages.shell.permanentDeleteNotebookAction,
  };
}

function useNodeVoiceBusy(workspaceDialog: string | null) {
  const [isNodeVoiceBusy, setNodeVoiceBusy] = useState(false);
  useEffect(() => {
    if (workspaceDialog !== "node") {
      setNodeVoiceBusy(false);
    }
  }, [workspaceDialog]);
  return [isNodeVoiceBusy, setNodeVoiceBusy] as const;
}
