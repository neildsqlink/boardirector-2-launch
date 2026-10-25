import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

/* SITE=1 builds for GitHub Pages, served under /boardirector-2-launch/ */
const site = process.env.SITE === "1";

export default defineConfig({
  plugins: [react()],
  base: site ? "/boardirector-2-launch/" : "/",
  server: { port: 5174, open: false },
  build: { rollupOptions: { input: { v2: resolve(process.cwd(), "v2.html") } } },
});
