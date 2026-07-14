import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Static SPA — no backend. Builds to dist/ for hosting on any static server.
export default defineConfig({
  plugins: [react()],
  base: "/PlateTagsWebApp/",
});
