import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  define: {
    global: "globalThis"
  },
  plugins: [reactRouter(), tsconfigPaths()],
  optimizeDeps: {
    include: ["react-pdf", "pdfjs-dist", "konva", "react-konva"]
  },
  ssr: {
    external: ["better-sqlite3"]
  }
});
