import type { CSSProperties, ReactNode } from "react";

import { LANGUAGES, LanguageCode, NEON_TEXT_COLORS, NeonTextColorName, THEMES, ThemeName } from "@notesheep/ui";

import { messages } from "../messages";

type SettingsDialogProps = {
  language: LanguageCode;
  neonTextColor: NeonTextColorName;
  onClose: () => void;
  onLanguageChange: (value: LanguageCode) => void;
  onNeonTextColorChange: (value: NeonTextColorName) => void;
  onThemeChange: (value: ThemeName) => void;
  theme: ThemeName;
};

export function SettingsDialog({
  language,
  neonTextColor,
  onClose,
  onLanguageChange,
  onNeonTextColorChange,
  onThemeChange,
  theme,
}: SettingsDialogProps) {
  return (
    <div className="modal-backdrop">
      <section aria-labelledby="settings-dialog-title" aria-modal="true" className="modal-panel settings-panel" role="dialog">
        <div className="modal-header">
          <h2 id="settings-dialog-title">{messages.settings.title}</h2>
          <button aria-label={messages.shell.closeDialog} className="icon-button" onClick={onClose} type="button">
            x
          </button>
        </div>
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
        {theme === "neon" ? (
          <SettingGroup label={messages.settings.neonTextColor}>
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
        ) : null}
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
