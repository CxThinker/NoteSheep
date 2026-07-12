import { describe, expect, it } from "vitest";

import {
  applyNeonTextColor,
  NEON_TEXT_COLORS,
  readStoredDropZoneSizePercent,
  readStoredLanguage,
  readStoredNeonTextColor,
  readStoredNodeAudioUploadEnabled,
  readStoredNodeDetailPathVisible,
  storeDropZoneSizePercent,
  storeLanguage,
  storeNeonTextColor,
  storeNodeAudioUploadEnabled,
  storeNodeDetailPathVisible,
} from "./index";

describe("UI settings", () => {
  it("defaults to Chinese UI language", () => {
    expect(readStoredLanguage(new MemoryStorage())).toBe("zh-CN");
  });

  it("stores supported UI languages", () => {
    const storage = new MemoryStorage();

    storeLanguage("en-US", storage);

    expect(readStoredLanguage(storage)).toBe("en-US");
  });

  it("falls back when stored UI language is unknown", () => {
    const storage = new MemoryStorage();
    storage.setItem("notesheep-language", "fr-FR");

    expect(readStoredLanguage(storage)).toBe("zh-CN");
  });

  it("allows only the six approved neon text colors", () => {
    expect(NEON_TEXT_COLORS.map((item) => item.name)).toEqual(["red", "cyan", "blue", "green", "yellow", "orange"]);
    expect(NEON_TEXT_COLORS.map((item) => item.value)).toEqual(["#ff4d4d", "#47f5c7", "#4da3ff", "#57e389", "#ffd166", "#ff9f1c"]);
  });

  it("stores approved neon text colors and rejects purple-family values", () => {
    const storage = new MemoryStorage();

    storeNeonTextColor("orange", storage);
    storage.setItem("notesheep-neon-text-color", "purple");

    expect(readStoredNeonTextColor(storage)).toBe("cyan");
  });

  it("applies neon text color as a root attribute and CSS variable", () => {
    const root = document.createElement("html");

    applyNeonTextColor("green", root);

    expect(root).toHaveAttribute("data-neon-text-color", "green");
    expect(root.style.getPropertyValue("--neon-text-color")).toBe("#57e389");
  });

  it("defaults feature switches to enabled", () => {
    const storage = new MemoryStorage();

    expect(readStoredNodeAudioUploadEnabled(storage)).toBe(true);
    expect(readStoredNodeDetailPathVisible(storage)).toBe(true);
    expect(readStoredDropZoneSizePercent(storage)).toBe(100);
  });

  it("stores feature switches and falls back on unknown values", () => {
    const storage = new MemoryStorage();

    storeNodeAudioUploadEnabled(false, storage);
    storeNodeDetailPathVisible(false, storage);

    expect(readStoredNodeAudioUploadEnabled(storage)).toBe(false);
    expect(readStoredNodeDetailPathVisible(storage)).toBe(false);

    storage.setItem("notesheep-node-audio-upload-enabled", "maybe");
    storage.setItem("notesheep-node-detail-path-visible", "maybe");

    expect(readStoredNodeAudioUploadEnabled(storage)).toBe(true);
    expect(readStoredNodeDetailPathVisible(storage)).toBe(true);
  });

  it("stores drop zone size as a bounded percent", () => {
    const storage = new MemoryStorage();

    storeDropZoneSizePercent(150, storage);
    expect(readStoredDropZoneSizePercent(storage)).toBe(150);

    storeDropZoneSizePercent(20, storage);
    expect(readStoredDropZoneSizePercent(storage)).toBe(50);

    storeDropZoneSizePercent(260, storage);
    expect(readStoredDropZoneSizePercent(storage)).toBe(200);

    storage.setItem("notesheep-drop-zone-size-percent", "large");
    expect(readStoredDropZoneSizePercent(storage)).toBe(100);
  });
});

class MemoryStorage implements Storage {
  private readonly items = new Map<string, string>();

  get length() {
    return this.items.size;
  }

  clear() {
    this.items.clear();
  }

  getItem(key: string) {
    return this.items.get(key) ?? null;
  }

  key(index: number) {
    return [...this.items.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.items.delete(key);
  }

  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
}
