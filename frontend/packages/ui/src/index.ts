export type ThemeName = "cartoon" | "neon";
export type LanguageCode = "zh-CN" | "en-US";
export type NeonTextColorName = "red" | "cyan" | "blue" | "green" | "yellow" | "orange";

export const THEME_STORAGE_KEY = "notesheep-theme";
export const LANGUAGE_STORAGE_KEY = "notesheep-language";
export const NEON_TEXT_COLOR_STORAGE_KEY = "notesheep-neon-text-color";
export const NODE_AUDIO_UPLOAD_ENABLED_STORAGE_KEY = "notesheep-node-audio-upload-enabled";
export const NODE_DETAIL_PATH_VISIBLE_STORAGE_KEY = "notesheep-node-detail-path-visible";
export const DROP_ZONE_SIZE_PERCENT_STORAGE_KEY = "notesheep-drop-zone-size-percent";
export const DROP_ZONE_SIZE_DEFAULT_PERCENT = 100;
export const DROP_ZONE_SIZE_MIN_PERCENT = 50;
export const DROP_ZONE_SIZE_MAX_PERCENT = 200;

export const THEMES: Array<{ name: ThemeName; label: string }> = [
  { name: "cartoon", label: "Cartoon 卡通" },
  { name: "neon", label: "Neon 霓虹" },
];

export const LANGUAGES: Array<{ code: LanguageCode; label: string }> = [
  { code: "zh-CN", label: "中文" },
  { code: "en-US", label: "English" },
];

export const NEON_TEXT_COLORS: Array<{ name: NeonTextColorName; label: string; value: string }> = [
  { name: "red", label: "红", value: "#ff4d4d" },
  { name: "cyan", label: "青", value: "#47f5c7" },
  { name: "blue", label: "蓝", value: "#4da3ff" },
  { name: "green", label: "绿", value: "#57e389" },
  { name: "yellow", label: "黄", value: "#ffd166" },
  { name: "orange", label: "橙", value: "#ff9f1c" },
];

export function readStoredTheme(storage: Storage = window.localStorage): ThemeName {
  const storedTheme = storage.getItem(THEME_STORAGE_KEY);
  return storedTheme === "neon" ? "neon" : "cartoon";
}

export function readStoredLanguage(storage: Storage = window.localStorage): LanguageCode {
  const storedLanguage = storage.getItem(LANGUAGE_STORAGE_KEY);
  return storedLanguage === "en-US" ? "en-US" : "zh-CN";
}

export function readStoredNeonTextColor(storage: Storage = window.localStorage): NeonTextColorName {
  const storedColor = storage.getItem(NEON_TEXT_COLOR_STORAGE_KEY);
  return isNeonTextColorName(storedColor) ? storedColor : "cyan";
}

export function readStoredNodeAudioUploadEnabled(storage: Storage = window.localStorage): boolean {
  return readStoredBoolean(NODE_AUDIO_UPLOAD_ENABLED_STORAGE_KEY, true, storage);
}

export function readStoredNodeDetailPathVisible(storage: Storage = window.localStorage): boolean {
  return readStoredBoolean(NODE_DETAIL_PATH_VISIBLE_STORAGE_KEY, true, storage);
}

export function readStoredDropZoneSizePercent(storage: Storage = window.localStorage): number {
  return normalizeDropZoneSizePercent(storage.getItem(DROP_ZONE_SIZE_PERCENT_STORAGE_KEY));
}

export function applyTheme(theme: ThemeName, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = theme;
}

export function applyLanguage(language: LanguageCode, root: HTMLElement = document.documentElement): void {
  root.lang = language;
  root.dataset.language = language;
}

export function applyNeonTextColor(color: NeonTextColorName, root: HTMLElement = document.documentElement): void {
  root.dataset.neonTextColor = color;
  root.style.setProperty("--neon-text-color", valueForNeonTextColor(color));
}

export function storeTheme(theme: ThemeName, storage: Storage = window.localStorage): void {
  storage.setItem(THEME_STORAGE_KEY, theme);
}

export function storeLanguage(language: LanguageCode, storage: Storage = window.localStorage): void {
  storage.setItem(LANGUAGE_STORAGE_KEY, language);
}

export function storeNeonTextColor(color: NeonTextColorName, storage: Storage = window.localStorage): void {
  storage.setItem(NEON_TEXT_COLOR_STORAGE_KEY, color);
}

export function storeNodeAudioUploadEnabled(value: boolean, storage: Storage = window.localStorage): void {
  storage.setItem(NODE_AUDIO_UPLOAD_ENABLED_STORAGE_KEY, String(value));
}

export function storeNodeDetailPathVisible(value: boolean, storage: Storage = window.localStorage): void {
  storage.setItem(NODE_DETAIL_PATH_VISIBLE_STORAGE_KEY, String(value));
}

export function storeDropZoneSizePercent(value: number, storage: Storage = window.localStorage): void {
  storage.setItem(DROP_ZONE_SIZE_PERCENT_STORAGE_KEY, String(normalizeDropZoneSizePercent(value)));
}

export function valueForNeonTextColor(color: NeonTextColorName): string {
  return NEON_TEXT_COLORS.find((item) => item.name === color)?.value ?? "#47f5c7";
}

function isNeonTextColorName(value: string | null): value is NeonTextColorName {
  return NEON_TEXT_COLORS.some((item) => item.name === value);
}

function readStoredBoolean(key: string, fallback: boolean, storage: Storage) {
  const storedValue = storage.getItem(key);
  if (storedValue === "true") {
    return true;
  }
  if (storedValue === "false") {
    return false;
  }
  return fallback;
}

export function normalizeDropZoneSizePercent(value: number | string | null): number {
  if (value === null || value === "") {
    return DROP_ZONE_SIZE_DEFAULT_PERCENT;
  }
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return DROP_ZONE_SIZE_DEFAULT_PERCENT;
  }
  return Math.min(DROP_ZONE_SIZE_MAX_PERCENT, Math.max(DROP_ZONE_SIZE_MIN_PERCENT, Math.round(numericValue)));
}
