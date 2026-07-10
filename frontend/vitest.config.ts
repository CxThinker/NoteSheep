import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./test/setup.ts",
    include: ["apps/**/*.test.{ts,tsx}", "packages/**/*.test.{ts,tsx}"]
  },
  resolve: {
    alias: {
      "@notesheep/api-client": new URL("./packages/api-client/src/index.ts", import.meta.url).pathname,
      "@notesheep/ui": new URL("./packages/ui/src/index.ts", import.meta.url).pathname
    }
  }
});
