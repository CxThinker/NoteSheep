import { LanguageCode } from "@notesheep/ui";

import { enUSMessages } from "./messages.en";
import { zhCNMessages } from "./messages.zh";

type DeepString<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepString<T[K]>;
};

export type Messages = DeepString<typeof zhCNMessages>;

export const messagesByLanguage: Record<LanguageCode, Messages> = {
  "en-US": enUSMessages,
  "zh-CN": zhCNMessages,
};

let currentLanguage: LanguageCode = "zh-CN";

export const messages = new Proxy({} as Messages, {
  get(_target, key: keyof Messages) {
    return messagesByLanguage[currentLanguage][key];
  },
});

export function setMessagesLanguage(language: LanguageCode) {
  currentLanguage = language;
}

export function getMessagesLanguage() {
  return currentLanguage;
}

export function formatMessage(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, String(value)), template);
}
