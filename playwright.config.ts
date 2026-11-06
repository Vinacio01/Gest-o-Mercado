import { defineConfig } from "@playwright/test";

/**
 * Testes de ponta a ponta (navegador de verdade) contra o Supabase LOCAL.
 *
 *   npx supabase start
 *   npm run test:e2e
 *
 * Usa o Chrome instalado na máquina (channel "chrome"), sem baixar navegadores.
 * Roda contra o BUILD DE PRODUÇÃO (next start), igual ao site no ar: o
 * "next dev" compila cada tela no primeiro acesso e deixaria os testes lentos e
 * instáveis. Localmente o build é feito antes; no CI ele já foi feito.
 */
process.loadEnvFile(".env.local");

const CI = Boolean(process.env.CI);
const PORTA = 3200;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: CI ? [["list"], ["github"]] : "list",
  use: {
    baseURL: `http://localhost:${PORTA}`,
    channel: "chrome",
    headless: true,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
  },
  webServer: {
    command: CI ? `npm run start -- -p ${PORTA}` : `npm run build && npm run start -- -p ${PORTA}`,
    url: `http://localhost:${PORTA}/login`,
    reuseExistingServer: !CI,
    timeout: 300_000,
  },
});
