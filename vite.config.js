// vite.config.js - settings for Vite.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react"; // lets Vite understand JSX
import tailwindcss from "@tailwindcss/vite"; // lets Vite process Tailwind

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Any request starting with /api is forwarded to the Next.js backend.
    // So in React we can simply write fetch("/api/doubts").
    proxy: { "/api": "http://localhost:3000" },
  },
});
