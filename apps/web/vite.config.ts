import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // @tinjau/core ships TypeScript sources behind the `development` condition, the same way the
  // scout and the API consume it, so the web build type-checks against the contract clients.
  resolve: { conditions: ["development"] },
  build: { target: "es2022", sourcemap: true },
  server: { port: 5173 },
});
