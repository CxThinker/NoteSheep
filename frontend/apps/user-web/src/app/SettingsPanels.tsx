import type { CSSProperties, ReactNode } from "react";

import {
  DROP_ZONE_SIZE_MAX_PERCENT,
  DROP_ZONE_SIZE_MIN_PERCENT,
  LANGUAGES,
  LanguageCode,
  NEON_TEXT_COLORS,
  NeonTextColorName,
  THEMES,
  ThemeName,
} from "@notesheep/ui";

import { messages } from "../messages";

const DROP_ZONE_BASE_SIZE_PX = 28;

type ThemeFontPanelProps = {
  neonTextColor: NeonTextColorName;
  onNeonTextColorChange: (value: NeonTextColorName) => void;
  onThemeChange: (value: ThemeName) => void;
  theme: ThemeName;
};

type LanguagePanelProps = {
  language: LanguageCode;
  onLanguageChange: (value: LanguageCode) => void;
};

type FeaturePanelProps = {
  dropZoneSizePercent: number;
  isNodeAudioUploadEnabled: boolean;
  isNodeDetailPathVisible: boolean;
  onDropZoneSizePercentChange: (value: number) => void;
  onNodeAudioUploadEnabledChange: (value: boolean) => void;
  onNodeDetailPathVisibleChange: (value: boolean) => void;
};

export function ThemeFontPanel({ neonTextColor, onNeonTextColorChange, onThemeChange, theme }: ThemeFontPanelProps) {
  return (
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
  );
}

export function LanguagePanel({ language, onLanguageChange }: LanguagePanelProps) {
  return (
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
  );
}

export function FeaturePanel({
  dropZoneSizePercent,
  isNodeAudioUploadEnabled,
  isNodeDetailPathVisible,
  onDropZoneSizePercentChange,
  onNodeAudioUploadEnabledChange,
  onNodeDetailPathVisibleChange,
}: FeaturePanelProps) {
  const previewSize = Math.round((DROP_ZONE_BASE_SIZE_PX * dropZoneSizePercent) / 100);
  return (
    <>
      <SettingGroup label={messages.settings.featureSwitches}>
        <SettingsToggle checked={isNodeAudioUploadEnabled} label={messages.settings.nodeAudioUpload} onChange={onNodeAudioUploadEnabledChange} />
        <SettingsToggle checked={isNodeDetailPathVisible} label={messages.settings.nodeDetailPathVisible} onChange={onNodeDetailPathVisibleChange} />
      </SettingGroup>
      <SettingGroup label={messages.settings.dropZoneSize}>
        <div className="settings-slider-row">
          <input
            aria-label={messages.settings.dropZoneSize}
            max={DROP_ZONE_SIZE_MAX_PERCENT}
            min={DROP_ZONE_SIZE_MIN_PERCENT}
            onChange={(event) => onDropZoneSizePercentChange(Number(event.target.value))}
            step={10}
            type="range"
            value={dropZoneSizePercent}
          />
          <output>{dropZoneSizePercent}%</output>
        </div>
        <DropZoneSizePreview sizePx={previewSize} />
      </SettingGroup>
    </>
  );
}

function SettingGroup({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section className="settings-group">
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

function DropZoneSizePreview({ sizePx }: { sizePx: number }) {
  return (
    <div aria-label={messages.settings.dropZoneSizePreview} className="drop-zone-size-preview" style={{ "--preview-drop-zone-size": `${sizePx}px` } as CSSProperties}>
      <div className="drop-zone-preview-node">
        <span>{messages.shell.node}</span>
        <button aria-hidden="true" className="drop-zone-preview-button" data-position="left" tabIndex={-1} type="button" />
        <button aria-hidden="true" className="drop-zone-preview-button" data-position="right" tabIndex={-1} type="button" />
        <button aria-hidden="true" className="drop-zone-preview-button" data-position="bottom" tabIndex={-1} type="button" />
      </div>
    </div>
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
