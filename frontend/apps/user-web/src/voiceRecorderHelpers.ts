import { messages } from "./messages";

export type RecordingStatus = "idle" | "requesting" | "recording" | "processing" | "recorded";

export const MICROPHONE_REQUEST_TIMEOUT_MS = 10_000;

const RECORDING_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

export function hasRecorderSupport() {
  return Boolean(
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
      typeof MediaRecorder !== "undefined",
  );
}

export function preferredRecordingMimeType() {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return undefined;
  }
  return RECORDING_MIME_TYPES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
}

export function recordingStatusLabel(status: RecordingStatus) {
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

export function recordingButtonAction(
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

export function recordingButtonLabel(status: RecordingStatus) {
  if (status === "recording") {
    return messages.shell.stopRecording;
  }
  if (status === "requesting") {
    return messages.shell.cancelRecordingRequest;
  }
  return messages.shell.startRecording;
}

export function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function recordedVoiceFilename(mimeType: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `现场录音-${timestamp}.${extensionForMimeType(mimeType)}`;
}

export function stopStream(stream: MediaStream) {
  for (const track of stream.getTracks()) {
    track.stop();
  }
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
