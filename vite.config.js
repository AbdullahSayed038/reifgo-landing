import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// REIFGO landing page — Vite + React
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // bind all interfaces (127.0.0.1 + LAN) so the browser can always reach it
    port: 5173,
    open: true,
  },
});
