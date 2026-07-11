import { useEffect, useMemo, useRef, useState } from "react";

import { messages } from "./messages";

type RecordingStatus = "idle" | "requesting" | "recording" | "processing" | "recorded";

type VoiceRecorderFieldProps = {
  files: File[];
  onBusyChange: (busy: boolean) => void;
  onFilesChange: (files: File[]) => void;
};

const RECORDING_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];
const MICROPHONE_REQUEST_TIMEOUT_MS = 10_000;

export function VoiceRecorderField({
  files,
  onBusyChange,
  onFilesChange,
}: VoiceRecorderFieldProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const chunksRef = useRef<Blob[]>([]);
  const disposedRef = useRef(false);
  const filesRef = useRef(files);
  const previewUrlRef = useRef("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const requestIdRef = useRef(0);
  const requestTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof window.setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const isBusy = status === "requesting" || status === "recording" || status === "processing";
  const canRecord = hasRecorderSupport();
  const statusLabel = useMemo(() => recordingStatusLabel(status), [status]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    onBusyChange(isBusy);
  }, [isBusy, onBusyChange]);

  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
      requestIdRef.current += 1;
      clearRequestTimeout();
      releaseRecording({ finalize: false });
      releasePreviewUrl(false);
      onBusyChange(false);
    };
  }, [onBusyChange]);

  async function startRecording() {
    if (!canRecord) {
      setError(messages.shell.voiceRecordingUnsupported);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    releaseRecording({ finalize: false });
    setElapsedSeconds(0);
    setError("");
    setStatus("requesting");
    requestTimeoutRef.current = window.setTimeout(() => {
      if (disposedRef.current || requestIdRef.current !== requestId) {
        return;
      }
      requestIdRef.current += 1;
      requestTimeoutRef.current = null;
      setError(messages.shell.microphoneRequestTimedOut);
      setStatus("idle");
    }, MICROPHONE_REQUEST_TIMEOUT_MS);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      clearRequestTimeout();
      if (disposedRef.current || requestIdRef.current !== requestId) {
        stopStream(stream);
        return;
      }

      const mimeType = preferredRecordingMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorderRef.current = recorder;
      streamRef.current = stream;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => finishRecording(mimeType);
      recorder.onerror = () => {
        setError(messages.shell.voiceRecordingFailed);
        setStatus("idle");
        releaseRecording({ finalize: false });
      };
      recorder.start();
      startedAtRef.current = Date.now();
      setStatus("recording");
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);
    } catch (caught) {
      clearRequestTimeout();
      const permissionError = caught instanceof DOMException && caught.name === "NotAllowedError";
      setError(permissionError ? messages.shell.microphonePermissionDenied : messages.shell.voiceRecordingFailed);
      setStatus("idle");
      releaseRecording({ finalize: false });
    }
  }

  function stopRecording() {
    if (!recorderRef.current || recorderRef.current.state === "inactive") {
      return;
    }
    setStatus("processing");
    clearRecordingTimer();
    recorderRef.current.stop();
  }

  function cancelRecordingRequest() {
    requestIdRef.current += 1;
    clearRequestTimeout();
    setStatus("idle");
  }

  function finishRecording(mimeType: string | undefined) {
    clearRecordingTimer();
    const blobType = mimeType || recorderRef.current?.mimeType || "audio/webm";
    const blob = new Blob(chunksRef.current, { type: blobType });
    releaseRecording({ finalize: true });

    if (!blob.size) {
      setError(messages.shell.voiceRecordingEmpty);
      setStatus("idle");
      return;
    }

    releasePreviewUrl(true);
    const nextPreviewUrl = URL.createObjectURL(blob);
    const file = new File([blob], recordedVoiceFilename(blobType), { type: blobType });
    onFilesChange([...filesRef.current, file]);
    previewUrlRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
    setStatus("recorded");
  }

  function clearRecordingTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function clearRequestTimeout() {
    if (requestTimeoutRef.current !== null) {
      window.clearTimeout(requestTimeoutRef.current);
      requestTimeoutRef.current = null;
    }
  }

  function releaseRecording({ finalize }: { finalize: boolean }) {
    clearRecordingTimer();
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && !finalize) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
    }
    if (finalize && recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
    }
    if (streamRef.current) {
      stopStream(streamRef.current);
      streamRef.current = null;
    }
    chunksRef.current = [];
  }

  function releasePreviewUrl(updateState: boolean) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }
    if (updateState) {
      setPreviewUrl("");
    }
  }

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
          onClick={recordingButtonAction(status, startRecording, stopRecording, cancelRecordingRequest)}
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

      <label>
        <span>{messages.shell.nodeVoiceFiles}</span>
        <input
          accept="audio/aac,audio/flac,audio/mp4,audio/mpeg,audio/ogg,audio/wav,audio/webm"
          multiple
          name="node-voices"
          onChange={(event) => onFilesChange(Array.from(event.target.files ?? []))}
          type="file"
        />
      </label>

      {files.length ? <p className="file-selection">{formatSelectedFiles(files)}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}

function hasRecorderSupport() {
  return Boolean(
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
      typeof MediaRecorder !== "undefined",
  );
}

function preferredRecordingMimeType() {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return undefined;
  }
  return RECORDING_MIME_TYPES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
}

function recordingStatusLabel(status: RecordingStatus) {
  if (status === "requesting") {
    return messages.shell.voiceRecordingRequesting;
  }
  if (status === "recording") {
    return messages.shell.voiceRecordingActive;
  }
  if (status === "processing") {
    return messages.shell.voiceRecordingProcessing;
  }
  if (status === "recorded") {
    return messages.shell.voiceRecordingReady;
  }
  return messages.shell.voiceRecordingIdle;
}

function recordingButtonAction(
  status: RecordingStatus,
  startRecording: () => void,
  stopRecording: () => void,
  cancelRecordingRequest: () => void,
) {
  if (status === "recording") {
    return stopRecording;
  }
  if (status === "requesting") {
    return cancelRecordingRequest;
  }
  return startRecording;
}

function recordingButtonLabel(status: RecordingStatus) {
  if (status === "recording") {
    return messages.shell.stopRecording;
  }
  if (status === "requesting") {
    return messages.shell.cancelRecordingRequest;
  }
  return messages.shell.startRecording;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatSelectedFiles(files: File[]) {
  return files.map((file) => file.name).join("、");
}

function recordedVoiceFilename(mimeType: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `现场录音-${timestamp}.${extensionForMimeType(mimeType)}`;
}

function extensionForMimeType(mimeType: string) {
  const normalizedType = mimeType.split(";")[0];
  if (normalizedType === "audio/mp4") {
    return "m4a";
  }
  if (normalizedType === "audio/ogg") {
    return "ogg";
  }
  return "webm";
}

function stopStream(stream: MediaStream) {
  for (const track of stream.getTracks()) {
    track.stop();
  }
}
