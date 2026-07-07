import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Dev-only bridge: serves the Vercel serverless function in api/ under the
// same /api/chat path during `npm run dev`, with a minimal req/res adapter
// matching Vercel's Node runtime (parsed JSON body, res.status().json()).
// In production Vercel serves api/chat.js natively; this plugin never ships.
function vercelApiDev() {
  return {
    name: "vercel-api-dev",
    configureServer(server) {
      server.middlewares.use("/api/chat", async (req, res) => {
        const { default: handler } = await server.ssrLoadModule("/api/chat.js");

        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        try {
          req.body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
        } catch {
          req.body = {};
        }

        res.status = (code) => ((res.statusCode = code), res);
        res.json = (data) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(data));
        };

        try {
          await handler(req, res);
        } catch (err) {
          console.error(err);
          res.status(500).json({ error: "Internal error" });
        }
      });
    },
  };
}

// REIFGO landing page — Vite + React
export default defineConfig(({ mode }) => {
  // Make .env.local vars (ANTHROPIC_API_KEY etc.) visible to the dev API bridge.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
    plugins: [react(), vercelApiDev()],
    server: {
      host: true, // bind all interfaces (127.0.0.1 + LAN) so the browser can always reach it
      port: 5173,
      open: true,
      proxy: {
        // CMS dashboard -> NestJS backend (REIFGO app API) during dev.
        // In production the dashboard calls VITE_API_URL directly instead.
        "/cms-api": {
          target: "http://localhost:3000",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/cms-api/, ""),
        },
      },
    },
  };
});
