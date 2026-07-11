import { stopStream } from "./voiceRecorderHelpers";

type RecorderRefs = {
  chunksRef: React.MutableRefObject<Blob[]>;
  recorderRef: React.MutableRefObject<MediaRecorder | null>;
  streamRef: React.MutableRefObject<MediaStream | null>;
};

export function releaseRecordingResources(
  { chunksRef, recorderRef, streamRef }: RecorderRefs,
  finalize: boolean,
  clearRecordingTimer: () => void,
) {
  clearRecordingTimer();
  const recorder = recorderRef.current;
  recorderRef.current = null;
  if (recorder) {
    recorder.ondataavailable = null;
    recorder.onstop = null;
    recorder.onerror = null;
    if (!finalize && recorder.state !== "inactive") {
      recorder.stop();
    }
  }
  if (streamRef.current) {
    stopStream(streamRef.current);
    streamRef.current = null;
  }
  chunksRef.current = [];
}

export function releasePreviewUrlRef(
  previewUrlRef: React.MutableRefObject<string>,
  updateState: boolean,
  setPreviewUrl: (value: string) => void,
) {
  if (previewUrlRef.current) {
    URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = "";
  }
  if (updateState) {
    setPreviewUrl("");
  }
}
