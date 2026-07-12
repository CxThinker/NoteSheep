import { MouseEvent, PointerEvent, SyntheticEvent, useRef, useState } from "react";

import { NotebookNodeDetail } from "@notesheep/api-client";

import { formatMessage, messages } from "./messages";

type MindMapNodeCardProps = {
  createdAt?: string;
  detail: NotebookNodeDetail | null;
  position: string;
};

export function MindMapNodeCard({ createdAt, detail, position }: MindMapNodeCardProps) {
  const textContent = detail?.textContent.trim() ?? "";
  const firstVoice = detail?.voices[0] ?? null;

  return (
    <div className="node-card-summary">
      <div className="node-card-meta">
        <span aria-label={formatMessage(messages.shell.nodePositionLabel, { position })} className="root-badge">
          <span>{messages.shell.node}</span>
          <strong>{position}</strong>
        </span>
        <NodeCardAudio audioUrl={firstVoice?.url ?? ""} />
        <time className="node-card-created">{formatCreatedAt(createdAt)}</time>
      </div>
      <p className="node-card-text" data-empty={!textContent}>{textContent || messages.shell.emptyNodeCardText}</p>
    </div>
  );
}

function NodeCardAudio({ audioUrl }: { audioUrl: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [duration, setDuration] = useState("0:00");
  const hasAudio = Boolean(audioUrl);

  function handlePlay(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    const playPromise = audioRef.current?.play();
    if (playPromise) {
      playPromise.catch(() => undefined);
    }
  }

  function handleLoadedMetadata(event: SyntheticEvent<HTMLAudioElement>) {
    setDuration(formatDuration(event.currentTarget.duration));
  }

  function stopNodePointer(event: PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
  }

  return (
    <>
      <button
        aria-label={messages.shell.playAudio}
        className="node-card-play"
        disabled={!hasAudio}
        onClick={handlePlay}
        onPointerDown={stopNodePointer}
        title={messages.shell.playAudio}
        type="button"
      >
        ▶
      </button>
      <time className="node-card-duration">{hasAudio ? duration : messages.shell.noAudioDuration}</time>
      {hasAudio ? <audio onLoadedMetadata={handleLoadedMetadata} preload="metadata" ref={audioRef} src={audioUrl} /> : null}
    </>
  );
}

function formatDuration(duration: number) {
  if (!Number.isFinite(duration) || duration < 0) {
    return "0:00";
  }
  const totalSeconds = Math.round(duration);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatCreatedAt(createdAt?: string) {
  if (!createdAt) {
    return messages.shell.noNodeCreatedAt;
  }
  const normalized = createdAt.replace("T", " ");
  return normalized.length >= 16 ? normalized.slice(0, 16) : createdAt;
}
