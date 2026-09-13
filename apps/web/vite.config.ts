import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // @tinjau/core ships TypeScript sources behind the `development` condition, the same way the
  // scout and the API consume it, so the web build type-checks against the contract clients.
  resolve: { conditions: ["development"] },
  build: {
    target: "es2022",
    sourcemap: true,
    rollupOptions: {
      output: {
        // ethers is the bulk of the download and changes only when the dependency does, so it is
        // cached apart from our own code instead of being re-fetched with every deploy.
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("/.pnpm/ethers@") || id.includes("/@noble/") || id.includes("/@adraffy/")) return "ethers";
          if (id.includes("/.pnpm/motion") || id.includes("/framer-motion/")) return "motion";
          return "vendor";
        },
      },
    },
  },
  server: { port: 5173 },
});
