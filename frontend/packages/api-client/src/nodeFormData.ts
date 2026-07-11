import { CreateNodeRequest } from "./types";

export function createNodeFormData(payload: CreateNodeRequest): FormData {
  const formData = new FormData();
  formData.append("title", payload.title);
  if (payload.parentId) {
    formData.append("parentId", payload.parentId);
  }
  if (payload.textContent) {
    formData.append("textContent", payload.textContent);
  }
  for (const image of payload.images ?? []) {
    formData.append("images", image);
  }
  for (const voice of payload.voices ?? []) {
    formData.append("voices", voice);
  }
  return formData;
}
