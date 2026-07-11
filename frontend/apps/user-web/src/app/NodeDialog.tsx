import { FormEvent } from "react";

import { NodeCreateTarget } from "../MindMapCanvas";
import { VoiceRecorderField } from "../VoiceRecorderField";
import { messages } from "../messages";
import { formatSelectedFiles } from "./format";
import { WorkspaceDialogPanel } from "./WorkspaceDialogPanel";

type NodeDialogProps = {
  error: string;
  images: File[];
  isSubmitting: boolean;
  isVoiceBusy: boolean;
  nodeCreateTarget: NodeCreateTarget | null;
  onBusyChange: (busy: boolean) => void;
  onClose: () => void;
  onImagesChange: (files: File[]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTextContentChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onVoicesChange: (files: File[]) => void;
  textContent: string;
  title: string;
  voices: File[];
};

export function NodeDialog({
  error,
  images,
  isSubmitting,
  isVoiceBusy,
  nodeCreateTarget,
  onBusyChange,
  onClose,
  onImagesChange,
  onSubmit,
  onTextContentChange,
  onTitleChange,
  onVoicesChange,
  textContent,
  title,
  voices,
}: NodeDialogProps) {
  return (
    <WorkspaceDialogPanel
      error={error}
      isSubmitting={isSubmitting}
      onClose={onClose}
      onSubmit={onSubmit}
      submitDisabled={isVoiceBusy}
      submitLabel={messages.shell.saveNode}
      title={nodeCreateTarget?.kind === "sibling" ? messages.shell.createSiblingNodeTitle : messages.shell.createChildNodeTitle}
    >
      <label>
        <span>{messages.shell.nodeTitle}</span>
        <input autoFocus name="node-title" onChange={(event) => onTitleChange(event.target.value)} value={title} />
      </label>
      <label>
        <span>{messages.shell.nodeTextContent}</span>
        <textarea name="node-text-content" onChange={(event) => onTextContentChange(event.target.value)} rows={5} value={textContent} />
      </label>
      <label>
        <span>{messages.shell.nodeImages}</span>
        <input
          accept="image/avif,image/bmp,image/gif,image/jpeg,image/png,image/webp"
          multiple
          name="node-images"
          onChange={(event) => onImagesChange(Array.from(event.target.files ?? []))}
          type="file"
        />
      </label>
      {images.length ? <p className="file-selection">{formatSelectedFiles(images)}</p> : null}
      <VoiceRecorderField files={voices} onBusyChange={onBusyChange} onFilesChange={onVoicesChange} />
    </WorkspaceDialogPanel>
  );
}
