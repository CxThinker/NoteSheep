export function formatSelectedFiles(files: File[]) {
  return files.map((file) => file.name).join("、");
}
