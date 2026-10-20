import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev: proxy the keep-api routes so the UI talks to the same origin it will be served from.
const keep = "http://127.0.0.1:8787";
const routes = ["memories", "drafts", "usage", "credits", "gate", "events", "health", "cost", "remember", "recall", "forget", "improve"];

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: Object.fromEntries(routes.map((r) => [`/${r}`, keep])) },
  build: { outDir: "dist", sourcemap: false },
});
