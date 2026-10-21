import { defineConfig } from "vite";

// Library build: bundles the framework-free label core (src/lib.ts) into one
// self-contained ES module at lib/platetags-core.js. Separate from the app's
// vite.config.ts and its dist/ output, which it does not touch.
export default defineConfig({
  publicDir: false, // do not copy public/ (Browser Print client etc.) into lib/
  build: {
    outDir: "lib",
    emptyOutDir: false,
    lib: {
      entry: "src/lib.ts",
      formats: ["es"],
      fileName: () => "platetags-core.js",
    },
    target: "es2022",
  },
});
