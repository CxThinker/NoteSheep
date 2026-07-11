import { useEffect, useState } from "react";

import { DeleteNodeDialog } from "./DeleteNodeDialog";
import { NotebookDetailDialog } from "./NotebookDetailDialog";
import { NotebookDialog } from "./NotebookDialog";
import { NodeDetailDialog } from "./NodeDetailDialog";
import { NodeDialog } from "./NodeDialog";
import type { useWorkspaceController } from "./useWorkspaceController";

type WorkspaceController = ReturnType<typeof useWorkspaceController>;

export function WorkspaceDialogs({ controller }: { controller: WorkspaceController }) {
  const [isNodeVoiceBusy, setNodeVoiceBusy] = useNodeVoiceBusy(controller.workspaceDialog);
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
        <NodeDetailDialog detail={controller.nodeDetail} error={controller.workspaceError} isLoading={controller.isNodeDetailLoading} onClose={controller.onCloseDialog} target={controller.nodeDetailTarget} />
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
    </>
  );
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
