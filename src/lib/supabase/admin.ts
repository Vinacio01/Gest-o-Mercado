import "server-only";

import { createClient } from "@supabase/supabase-js";

import { lerEnvPublico } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente com a SERVICE ROLE: ignora o RLS. Use só onde for indispensável.
 * Hoje: processar a fila de alertas (lib/services/alertas.ts), porque o
 * envio é disparado também pela venda do funcionário, que não pode alterar
 * alertas, e pelo cron, que não tem usuário logado.
 *
 * O "server-only" faz o build falhar se este arquivo for importado no navegador.
 */
export function criarClienteAdmin() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.");
  }
  return createClient<Database>(lerEnvPublico().NEXT_PUBLIC_SUPABASE_URL, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
