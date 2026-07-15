import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@gastronomica/shared": path.resolve(
        __dirname,
        "../../packages/shared/src/index.ts",
      ),
    },
  },
  optimizeDeps: {
    exclude: ["@gastronomica/shared"],
  },
  server: {
    port: 5174,
    host: true,
    headers: {
      "Content-Security-Policy": "frame-ancestors *",
    },
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:3001",
        ws: true,
      },
    },
  },
  preview: {
    port: 5174,
    headers: {
      "Content-Security-Policy": "frame-ancestors *",
    },
  },
});
