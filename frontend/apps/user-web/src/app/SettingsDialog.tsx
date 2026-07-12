import { useState } from "react";

import { LanguageCode, NeonTextColorName, ThemeName } from "@notesheep/ui";

import { messages } from "../messages";
import { FeaturePanel, LanguagePanel, ThemeFontPanel } from "./SettingsPanels";

type SettingsDialogProps = {
  dropZoneSizePercent: number;
  isNodeAudioUploadEnabled: boolean;
  isNodeDetailPathVisible: boolean;
  language: LanguageCode;
  neonTextColor: NeonTextColorName;
  onClose: () => void;
  onDropZoneSizePercentChange: (value: number) => void;
  onLanguageChange: (value: LanguageCode) => void;
  onNeonTextColorChange: (value: NeonTextColorName) => void;
  onNodeAudioUploadEnabledChange: (value: boolean) => void;
  onNodeDetailPathVisibleChange: (value: boolean) => void;
  onThemeChange: (value: ThemeName) => void;
  theme: ThemeName;
};

type SettingsPage = "theme-font" | "language" | "features";

export function SettingsDialog(props: SettingsDialogProps) {
  const [activePage, setActivePage] = useState<SettingsPage>("theme-font");
  return (
    <div className="modal-backdrop">
      <section aria-labelledby="settings-dialog-title" aria-modal="true" className="modal-panel settings-panel" role="dialog">
        <div className="modal-header">
          <h2 id="settings-dialog-title">{messages.settings.title}</h2>
          <button aria-label={messages.shell.closeDialog} className="icon-button" onClick={props.onClose} type="button">
            x
          </button>
        </div>
        <div className="settings-layout">
          <nav aria-label={messages.settings.navigation} className="settings-sidebar">
            {settingsPages().map((page) => (
              <button
                aria-current={activePage === page.id ? "page" : undefined}
                className="settings-nav-button"
                data-active={activePage === page.id}
                key={page.id}
                onClick={() => setActivePage(page.id)}
                type="button"
              >
                {page.label}
              </button>
            ))}
          </nav>
          <div className="settings-content">{renderSettingsPage(activePage, props)}</div>
        </div>
      </section>
    </div>
  );
}

function renderSettingsPage(page: SettingsPage, props: SettingsDialogProps) {
  if (page === "theme-font") {
    return (
      <ThemeFontPanel
        neonTextColor={props.neonTextColor}
        onNeonTextColorChange={props.onNeonTextColorChange}
        onThemeChange={props.onThemeChange}
        theme={props.theme}
      />
    );
  }
  if (page === "language") {
    return <LanguagePanel language={props.language} onLanguageChange={props.onLanguageChange} />;
  }
  return (
    <FeaturePanel
      dropZoneSizePercent={props.dropZoneSizePercent}
      isNodeAudioUploadEnabled={props.isNodeAudioUploadEnabled}
      isNodeDetailPathVisible={props.isNodeDetailPathVisible}
      onDropZoneSizePercentChange={props.onDropZoneSizePercentChange}
      onNodeAudioUploadEnabledChange={props.onNodeAudioUploadEnabledChange}
      onNodeDetailPathVisibleChange={props.onNodeDetailPathVisibleChange}
    />
  );
}

function settingsPages(): Array<{ id: SettingsPage; label: string }> {
  return [
    { id: "theme-font", label: messages.settings.themeAndFont },
    { id: "language", label: messages.settings.language },
    { id: "features", label: messages.settings.featureSwitches },
  ];
}
