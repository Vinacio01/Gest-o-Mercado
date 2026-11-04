import { createBrowserClient } from "@supabase/ssr";

import { lerEnvPublico } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente do Supabase para Client Components (roda no navegador).
 * Usa apenas a chave anônima: o que o usuário pode ver é decidido pelo RLS.
 */
export function criarClienteNavegador() {
  const env = lerEnvPublico();
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
