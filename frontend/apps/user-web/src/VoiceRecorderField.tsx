import { useEffect, useMemo, useRef, useState } from "react";
import { messages } from "./messages";
import { VoiceRecorderView } from "./VoiceRecorderView";
import { releasePreviewUrlRef, releaseRecordingResources } from "./voiceRecorderCleanup";
import {
  hasRecorderSupport,
  MICROPHONE_REQUEST_TIMEOUT_MS,
  preferredRecordingMimeType,
  recordedVoiceFilename,
  RecordingStatus,
  recordingStatusLabel,
  stopStream,
} from "./voiceRecorderHelpers";
type VoiceRecorderFieldProps = {
  allowFileUpload: boolean;
  files: File[];
  onBusyChange: (busy: boolean) => void;
  onFilesChange: (files: File[]) => void;
};
export function VoiceRecorderField({ allowFileUpload, files, onBusyChange, onFilesChange }: VoiceRecorderFieldProps) {
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

    const requestId = beginMicrophoneRequest();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      clearRequestTimeout();
      if (disposedRef.current || requestIdRef.current !== requestId) {
        stopStream(stream);
        return;
      }
      startRecorder(stream);
    } catch (caught) {
      clearRequestTimeout();
      const permissionError = caught instanceof DOMException && caught.name === "NotAllowedError";
      setError(permissionError ? messages.shell.microphonePermissionDenied : messages.shell.voiceRecordingFailed);
      setStatus("idle");
      releaseRecording({ finalize: false });
    }
  }

  function beginMicrophoneRequest() {
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
    return requestId;
  }

  function startRecorder(stream: MediaStream) {
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
    onFilesChange([...filesRef.current, new File([blob], recordedVoiceFilename(blobType), { type: blobType })]);
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
    releaseRecordingResources({ chunksRef, recorderRef, streamRef }, finalize, clearRecordingTimer);
  }

  function releasePreviewUrl(updateState: boolean) {
    releasePreviewUrlRef(previewUrlRef, updateState, setPreviewUrl);
  }

  return (
    <VoiceRecorderView
      canRecord={canRecord}
      elapsedSeconds={elapsedSeconds}
      error={error}
      files={files}
      allowFileUpload={allowFileUpload}
      onCancelRequest={cancelRecordingRequest}
      onFilesChange={onFilesChange}
      onStartRecording={startRecording}
      onStopRecording={stopRecording}
      previewUrl={previewUrl}
      status={status}
      statusLabel={statusLabel}
    />
  );
}
