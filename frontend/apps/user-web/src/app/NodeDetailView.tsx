import { useEffect, useRef, useState } from "react";

import { NotebookNodeDetail } from "@notesheep/api-client";

import { NodeDetailTarget } from "../MindMapCanvas";
import { messages } from "../messages";
import { NodeDetailAudio } from "./NodeDetailAudio";
import { NodeDetailToggles } from "./NodeDetailToggles";

const NODE_DETAIL_TRANSITION_MS = 800;

type NodeDetailViewProps = {
  detail: NotebookNodeDetail | null;
  error: string;
  isLoading: boolean;
  target: Extract<NodeDetailTarget, { kind: "node" }>;
};

export function NodeDetailView({ detail, error, isLoading, target }: NodeDetailViewProps) {
  const hasImages = Boolean(detail?.images.length);
  const [isTextPanelOpen, setTextPanelOpen] = useState(true);
  const [isImagePanelOpen, setImagePanelOpen] = useState(hasImages);
  const [isPanelTransitioning, setPanelTransitioning] = useState(false);
  const panelTransitionTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const firstVoice = detail?.voices[0] ?? null;
  const notePath = detail?.textPath ?? `note/${target.node.textFile}`;
  const imagePath = detail?.imagePath ?? target.node.imgDir;
  const voicePath = detail?.voicePath ?? target.node.voiceDir;
  const areBothPanelsOpen = isTextPanelOpen && isImagePanelOpen;
  const isTextOnlyPanelOpen = isTextPanelOpen && !isImagePanelOpen;
  const isImageOnlyPanelOpen = !isTextPanelOpen && isImagePanelOpen;

  useEffect(() => {
    if (panelTransitionTimeoutRef.current) {
      window.clearTimeout(panelTransitionTimeoutRef.current);
      panelTransitionTimeoutRef.current = null;
    }
    setPanelTransitioning(false);
    setTextPanelOpen(true);
    setImagePanelOpen(Boolean(detail?.images.length));
  }, [detail?.node.id, detail?.images.length]);

  useEffect(() => {
    return () => {
      if (panelTransitionTimeoutRef.current) {
        window.clearTimeout(panelTransitionTimeoutRef.current);
      }
    };
  }, []);

  function startPanelTransition(updatePanels: () => void) {
    if (isPanelTransitioning) {
      return;
    }
    if (panelTransitionTimeoutRef.current) {
      window.clearTimeout(panelTransitionTimeoutRef.current);
    }
    setPanelTransitioning(true);
    updatePanels();
    panelTransitionTimeoutRef.current = window.setTimeout(() => {
      setPanelTransitioning(false);
      panelTransitionTimeoutRef.current = null;
    }, NODE_DETAIL_TRANSITION_MS);
  }

  return (
    <section
      className="node-detail-layout"
      data-has-images={hasImages}
      data-images-open={isImagePanelOpen}
      data-text-open={isTextPanelOpen}
      data-transitioning={isPanelTransitioning}
    >
      <div className="node-detail-title-row">
        <h3>{target.node.title}</h3>
        <p className="node-detail-position">
          <span>{messages.shell.node}</span>
          <strong>{target.position}</strong>
        </p>
      </div>
      <div className="node-detail-grid-shell">
        <NodeDetailPaths
          imagePath={imagePath}
          isImagePanelOpen={isImagePanelOpen}
          isTextPanelOpen={isTextPanelOpen}
          notePath={notePath}
        />
        {isLoading ? <p className="node-detail-state">{messages.shell.nodeDetailLoading}</p> : null}
        {!isLoading ? (
          <div className="node-detail-body">
            <NodeDetailText detail={detail} error={error} isTextPanelOpen={isTextPanelOpen} />
            <NodeDetailImages detail={detail} hasImages={hasImages} isImagePanelOpen={isImagePanelOpen} />
            <NodeDetailToggles
              areBothPanelsOpen={areBothPanelsOpen}
              isImageOnlyPanelOpen={isImageOnlyPanelOpen}
              isPanelTransitioning={isPanelTransitioning}
              isTextOnlyPanelOpen={isTextOnlyPanelOpen}
              onCollapseImages={() => startPanelTransition(() => setImagePanelOpen(false))}
              onCollapseText={() => startPanelTransition(() => setTextPanelOpen(false))}
              onExpandImages={() => startPanelTransition(() => setImagePanelOpen(true))}
              onExpandText={() => startPanelTransition(() => setTextPanelOpen(true))}
            />
          </div>
        ) : null}
      </div>
      <NodeDetailAudio firstVoice={firstVoice} voicePath={voicePath} />
    </section>
  );
}

function NodeDetailPaths({
  imagePath,
  isImagePanelOpen,
  isTextPanelOpen,
  notePath,
}: {
  imagePath: string;
  isImagePanelOpen: boolean;
  isTextPanelOpen: boolean;
  notePath: string;
}) {
  return (
    <div className="node-detail-paths">
      <div aria-hidden={!isTextPanelOpen} data-panel-open={isTextPanelOpen}>
        <span>{messages.shell.textPath}</span>
        <strong>{notePath}</strong>
      </div>
      <div aria-hidden={!isImagePanelOpen} data-panel-open={isImagePanelOpen}>
        <span>{messages.shell.imagePath}</span>
        <strong>{imagePath}</strong>
      </div>
    </div>
  );
}

function NodeDetailText({
  detail,
  error,
  isTextPanelOpen,
}: {
  detail: NotebookNodeDetail | null;
  error: string;
  isTextPanelOpen: boolean;
}) {
  return (
    <section aria-hidden={!isTextPanelOpen} aria-label={messages.shell.textContent} className="node-detail-text" data-panel-open={isTextPanelOpen}>
      {error ? <p className="form-error">{error}</p> : null}
      <pre>{detail?.textContent.trim() ? detail.textContent : messages.shell.emptyTextContent}</pre>
    </section>
  );
}

function NodeDetailImages({
  detail,
  hasImages,
  isImagePanelOpen,
}: {
  detail: NotebookNodeDetail | null;
  hasImages: boolean;
  isImagePanelOpen: boolean;
}) {
  return (
    <section aria-hidden={!isImagePanelOpen} aria-label={messages.shell.imageContent} className="node-detail-images" data-panel-open={isImagePanelOpen}>
      {hasImages ? (
        <div className="node-detail-image-grid">
          {detail?.images.map((image) => (
            <figure key={image.path}>
              <img alt={image.name} src={image.url} />
              <figcaption>{image.name}</figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p className="empty-detail-panel">{messages.shell.emptyImageContent}</p>
      )}
    </section>
  );
}
