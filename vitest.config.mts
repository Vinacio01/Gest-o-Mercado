import { fileURLToPath } from "node:url";

import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // Carrega .env.local (URL e chaves do Supabase LOCAL) para os testes de banco.
    env: loadEnv(mode, process.cwd(), ""),
    // Testes de banco fazem várias chamadas HTTP ao Supabase local.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
}));
