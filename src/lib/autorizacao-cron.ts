import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Confere o cabeçalho "Authorization: Bearer <CRON_SECRET>" enviado pela Vercel.
 * Sem CRON_SECRET configurado, recusa sempre (nunca deixa a rota aberta).
 * A comparação é em tempo constante para não vazar o segredo por tempo de resposta.
 */
export function autorizadoParaCron(cabecalho: string | null, segredo: string | undefined): boolean {
  if (!segredo?.trim() || !cabecalho) return false;
  const esperado = createHash("sha256").update(`Bearer ${segredo.trim()}`).digest();
  const recebido = createHash("sha256").update(cabecalho).digest();
  return timingSafeEqual(esperado, recebido);
}
