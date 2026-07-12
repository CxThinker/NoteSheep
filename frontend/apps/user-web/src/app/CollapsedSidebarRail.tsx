import { messages } from "../messages";

type CollapsedSidebarRailProps = {
  onExpand: () => void;
};

export function CollapsedSidebarRail({ onExpand }: CollapsedSidebarRailProps) {
  return (
    <div className="collapsed-sidebar-rail">
      <button aria-label={messages.shell.expandSidebar} className="sidebar-collapse-button" onClick={onExpand} type="button">
        &gt;
      </button>
    </div>
  );
}
