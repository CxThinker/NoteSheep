import { NotebookAsset } from "@notesheep/api-client";

import { messages } from "../messages";

type NodeDetailAudioProps = {
  firstVoice: NotebookAsset | null;
  isPathVisible: boolean;
  voicePath: string;
};

export function NodeDetailAudio({ firstVoice, isPathVisible, voicePath }: NodeDetailAudioProps) {
  return (
    <div className="node-detail-audio">
      <div className="audio-path">
        <span>{messages.shell.voiceResource}</span>
        <strong>{isPathVisible ? voicePath : messages.shell.pathHidden}</strong>
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
