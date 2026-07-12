import { messages } from "./messages";
import { formatSelectedFiles } from "./app/format";
import {
  formatDuration,
  recordingButtonAction,
  recordingButtonLabel,
  RecordingStatus,
} from "./voiceRecorderHelpers";

type VoiceRecorderViewProps = {
  allowFileUpload: boolean;
  canRecord: boolean;
  elapsedSeconds: number;
  error: string;
  files: File[];
  onCancelRequest: () => void;
  onFilesChange: (files: File[]) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  previewUrl: string;
  status: RecordingStatus;
  statusLabel: string;
};

export function VoiceRecorderView({
  allowFileUpload,
  canRecord,
  elapsedSeconds,
  error,
  files,
  onCancelRequest,
  onFilesChange,
  onStartRecording,
  onStopRecording,
  previewUrl,
  status,
  statusLabel,
}: VoiceRecorderViewProps) {
  return (
    <section className="voice-recorder-field" aria-label={messages.shell.voiceRecorder}>
      <div className="voice-recorder-header">
        <span>{messages.shell.nodeVoices}</span>
        <strong>{statusLabel}</strong>
      </div>
      <div className="voice-recorder-bar" data-recording={status === "recording"}>
        <button
          className="voice-record-button"
          disabled={!canRecord || status === "processing"}
          onClick={recordingButtonAction(status, onStartRecording, onStopRecording, onCancelRequest)}
          type="button"
        >
          {recordingButtonLabel(status)}
        </button>
        <span className="voice-record-time">{formatDuration(elapsedSeconds)}</span>
        <span aria-live="polite" className="voice-record-state">
          {canRecord ? statusLabel : messages.shell.voiceRecordingUnsupported}
        </span>
      </div>
      {previewUrl ? (
        <audio aria-label={messages.shell.recordingPreview} className="voice-record-preview" controls src={previewUrl}>
          {messages.shell.audioUnsupported}
        </audio>
      ) : null}
      {allowFileUpload ? (
        <label>
          <span>{messages.shell.nodeVoiceFiles}</span>
          <input
            accept="audio/aac,audio/flac,audio/mp4,audio/mpeg,audio/ogg,audio/wav,audio/webm"
            className="file-picker"
            multiple
            name="node-voices"
            onChange={(event) => onFilesChange(Array.from(event.target.files ?? []))}
            type="file"
          />
        </label>
      ) : null}
      {files.length ? <p className="file-selection">{formatSelectedFiles(files)}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}
