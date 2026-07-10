export type ThemeName = "cartoon" | "neon";

export const THEME_STORAGE_KEY = "notesheep-theme";

export const THEMES: Array<{ name: ThemeName; label: string }> = [
  { name: "cartoon", label: "Cartoon 卡通" },
  { name: "neon", label: "Neon 霓虹" },
];

export function readStoredTheme(storage: Storage = window.localStorage): ThemeName {
  const storedTheme = storage.getItem(THEME_STORAGE_KEY);
  return storedTheme === "neon" ? "neon" : "cartoon";
}

export function applyTheme(theme: ThemeName, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = theme;
}

export function storeTheme(theme: ThemeName, storage: Storage = window.localStorage): void {
  storage.setItem(THEME_STORAGE_KEY, theme);
}
