import { AuthUser } from "@notesheep/api-client";

import { messages } from "../messages";
import { UserBadge } from "./UserBadge";
import { ZoomToolbar } from "./ZoomToolbar";

type ShellHeaderProps = {
  onLogout: () => void;
  onOpenSettings: () => void;
  onZoom: (delta: number) => void;
  onZoomReset: () => void;
  user: AuthUser;
  workspaceZoom: number;
};

export function ShellHeader({ onLogout, onOpenSettings, onZoom, onZoomReset, user, workspaceZoom }: ShellHeaderProps) {
  return (
    <header className="shell-header">
      <div className="shell-sidebar-nav">
        <div className="shell-sidebar-nav-grid">
          <div className="shell-brand">
            <h1>{messages.appName}</h1>
          </div>
        </div>
      </div>
      <UserBadge username={user.username} />
      <div className="shell-nav-actions">
        <ZoomToolbar onZoom={onZoom} onZoomReset={onZoomReset} workspaceZoom={workspaceZoom} />
        <button aria-label={messages.settings.open} className="settings-button" onClick={onOpenSettings} type="button">
          {messages.settings.title}
        </button>
        <button className="text-action" onClick={onLogout} type="button">
          {messages.shell.logout}
        </button>
      </div>
    </header>
  );
}
