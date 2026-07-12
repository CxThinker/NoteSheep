import { useState, type CSSProperties, type ReactNode } from "react";

import { LANGUAGES, LanguageCode, NEON_TEXT_COLORS, NeonTextColorName, THEMES, ThemeName } from "@notesheep/ui";

import { messages } from "../messages";

type SettingsDialogProps = {
  isNodeAudioUploadEnabled: boolean;
  isNodeDetailPathVisible: boolean;
  language: LanguageCode;
  neonTextColor: NeonTextColorName;
  onClose: () => void;
  onLanguageChange: (value: LanguageCode) => void;
  onNeonTextColorChange: (value: NeonTextColorName) => void;
  onNodeAudioUploadEnabledChange: (value: boolean) => void;
  onNodeDetailPathVisibleChange: (value: boolean) => void;
  onThemeChange: (value: ThemeName) => void;
  theme: ThemeName;
};

type SettingsPage = "theme-font" | "language" | "features";

export function SettingsDialog({
  isNodeAudioUploadEnabled,
  isNodeDetailPathVisible,
  language,
  neonTextColor,
  onClose,
  onLanguageChange,
  onNeonTextColorChange,
  onNodeAudioUploadEnabledChange,
  onNodeDetailPathVisibleChange,
  onThemeChange,
  theme,
}: SettingsDialogProps) {
  const [activePage, setActivePage] = useState<SettingsPage>("theme-font");

  return (
    <div className="modal-backdrop">
      <section aria-labelledby="settings-dialog-title" aria-modal="true" className="modal-panel settings-panel" role="dialog">
        <div className="modal-header">
          <h2 id="settings-dialog-title">{messages.settings.title}</h2>
          <button aria-label={messages.shell.closeDialog} className="icon-button" onClick={onClose} type="button">
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
          <div className="settings-content">
            {activePage === "theme-font" ? (
              <>
                <SettingGroup label={messages.settings.theme}>
                  <div className="settings-segmented">
                    {THEMES.map((item) => (
                      <button
                        aria-pressed={theme === item.name}
                        className="settings-option"
                        data-active={theme === item.name}
                        key={item.name}
                        onClick={() => onThemeChange(item.name)}
                        type="button"
                      >
                        {themeLabel(item.name)}
                      </button>
                    ))}
                  </div>
                </SettingGroup>
                <SettingGroup label={messages.settings.fontColor}>
                  <div className="settings-swatches">
                    {NEON_TEXT_COLORS.map((item) => (
                      <button
                        aria-label={neonTextColorLabel(item.name)}
                        aria-pressed={neonTextColor === item.name}
                        className="settings-swatch"
                        data-active={neonTextColor === item.name}
                        key={item.name}
                        onClick={() => onNeonTextColorChange(item.name)}
                        style={{ "--swatch-color": item.value } as CSSProperties}
                        type="button"
                      >
                        <span>{neonTextColorLabel(item.name)}</span>
                      </button>
                    ))}
                  </div>
                  <p className="settings-hint">{messages.settings.neonTextColorHint}</p>
                </SettingGroup>
              </>
            ) : null}
            {activePage === "language" ? (
              <SettingGroup label={messages.settings.language}>
                <div className="settings-segmented">
                  {LANGUAGES.map((item) => (
                    <button
                      aria-pressed={language === item.code}
                      className="settings-option"
                      data-active={language === item.code}
                      key={item.code}
                      onClick={() => onLanguageChange(item.code)}
                      type="button"
                    >
                      {languageLabel(item.code)}
                    </button>
                  ))}
                </div>
              </SettingGroup>
            ) : null}
            {activePage === "features" ? (
              <SettingGroup label={messages.settings.featureSwitches}>
                <SettingsToggle
                  checked={isNodeAudioUploadEnabled}
                  label={messages.settings.nodeAudioUpload}
                  onChange={onNodeAudioUploadEnabledChange}
                />
                <SettingsToggle
                  checked={isNodeDetailPathVisible}
                  label={messages.settings.nodeDetailPathVisible}
                  onChange={onNodeDetailPathVisibleChange}
                />
              </SettingGroup>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function SettingGroup({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section className="settings-group" aria-label={label}>
      <h3>{label}</h3>
      {children}
    </section>
  );
}

function SettingsToggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (value: boolean) => void }) {
  return (
    <label className="settings-toggle">
      <span>{label}</span>
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
    </label>
  );
}

function settingsPages(): Array<{ id: SettingsPage; label: string }> {
  return [
    { id: "theme-font", label: messages.settings.themeAndFont },
    { id: "language", label: messages.settings.language },
    { id: "features", label: messages.settings.featureSwitches },
  ];
}

function themeLabel(theme: ThemeName) {
  return theme === "cartoon" ? messages.settings.cartoonTheme : messages.settings.neonTheme;
}

function languageLabel(language: LanguageCode) {
  return language === "zh-CN" ? messages.settings.chinese : messages.settings.english;
}

function neonTextColorLabel(color: NeonTextColorName) {
  const labels = {
    blue: messages.settings.blue,
    cyan: messages.settings.cyan,
    green: messages.settings.green,
    orange: messages.settings.orange,
    red: messages.settings.red,
    yellow: messages.settings.yellow,
  };
  return labels[color];
}
