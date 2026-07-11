import { PanelScrollbar } from "./usePanelScrollbar";

type SidebarScrollbarProps = {
  controls: PanelScrollbar;
  label: string;
  targetId: string;
};

export function SidebarScrollbar({ controls, label, targetId }: SidebarScrollbarProps) {
  const scrollbar = controls.scrollbar;
  return (
    <div
      aria-controls={targetId}
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemax={scrollbar.valueMax}
      aria-valuemin={0}
      aria-valuenow={scrollbar.valueNow}
      className="workspace-scrollbar"
      role="scrollbar"
      tabIndex={0}
      {...controls.handlers}
    >
      <span
        className="workspace-scrollbar-thumb"
        style={{
          height: scrollbar.thumbHeight ? `${scrollbar.thumbHeight}px` : "100%",
          transform: `translateY(${scrollbar.thumbTop}px)`,
        }}
      />
    </div>
  );
}
