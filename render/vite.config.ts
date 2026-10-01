import { defineConfig } from "vite";

// Separate root for the offline product render bench; not part of the catalogue build.
export default defineConfig({
  root: import.meta.dirname,
  server: { host: "127.0.0.1", port: 5391 },
});
