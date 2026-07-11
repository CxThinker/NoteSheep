import { NotebookAsset } from "@notesheep/api-client";

import { messages } from "../messages";

type NodeDetailAudioProps = {
  firstVoice: NotebookAsset | null;
  voicePath: string;
};

export function NodeDetailAudio({ firstVoice, voicePath }: NodeDetailAudioProps) {
  return (
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
  );
}
