import { messages } from "../messages";

type NodeDetailTogglesProps = {
  areBothPanelsOpen: boolean;
  isImageOnlyPanelOpen: boolean;
  isPanelTransitioning: boolean;
  isTextOnlyPanelOpen: boolean;
  onCollapseImages: () => void;
  onCollapseText: () => void;
  onExpandImages: () => void;
  onExpandText: () => void;
};

export function NodeDetailToggles({
  areBothPanelsOpen,
  isImageOnlyPanelOpen,
  isPanelTransitioning,
  isTextOnlyPanelOpen,
  onCollapseImages,
  onCollapseText,
  onExpandImages,
  onExpandText,
}: NodeDetailTogglesProps) {
  return (
    <>
      <div
        aria-hidden={!areBothPanelsOpen}
        aria-label={messages.shell.detailCollapseControls}
        className="detail-panel-toggle-cluster"
        data-control-active={areBothPanelsOpen}
      >
        <button
          aria-label={messages.shell.collapseText}
          className="detail-panel-toggle"
          disabled={!areBothPanelsOpen || isPanelTransitioning}
          onClick={onCollapseText}
          tabIndex={areBothPanelsOpen ? 0 : -1}
          type="button"
        >
          &lt;
        </button>
        <button
          aria-label={messages.shell.collapseImages}
          className="detail-panel-toggle"
          disabled={!areBothPanelsOpen || isPanelTransitioning}
          onClick={onCollapseImages}
          tabIndex={areBothPanelsOpen ? 0 : -1}
          type="button"
        >
          &gt;
        </button>
      </div>
      <button
        aria-hidden={!isTextOnlyPanelOpen}
        aria-label={messages.shell.expandImages}
        className="detail-panel-toggle detail-panel-toggle-single detail-panel-toggle-expand-images"
        data-control-active={isTextOnlyPanelOpen}
        disabled={!isTextOnlyPanelOpen || isPanelTransitioning}
        onClick={onExpandImages}
        tabIndex={isTextOnlyPanelOpen ? 0 : -1}
        type="button"
      >
        &lt;
      </button>
      <button
        aria-hidden={!isImageOnlyPanelOpen}
        aria-label={messages.shell.expandText}
        className="detail-panel-toggle detail-panel-toggle-single detail-panel-toggle-expand-text"
        data-control-active={isImageOnlyPanelOpen}
        disabled={!isImageOnlyPanelOpen || isPanelTransitioning}
        onClick={onExpandText}
        tabIndex={isImageOnlyPanelOpen ? 0 : -1}
        type="button"
      >
        &gt;
      </button>
    </>
  );
}
