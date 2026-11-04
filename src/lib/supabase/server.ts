import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { lerEnvPublico } from "@/lib/env";

/**
 * Cliente do Supabase para Server Components, Server Actions e Route Handlers.
 * Crie um novo cliente a cada requisição (nunca guarde em variável global):
 * ele carrega a sessão do usuário a partir dos cookies daquela requisição.
 */
export async function criarClienteServidor() {
  const env = lerEnvPublico();
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesParaGravar) {
          try {
            cookiesParaGravar.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components não podem gravar cookies. Isso é esperado:
            // a renovação da sessão acontece no proxy (src/proxy.ts).
          }
        },
      },
    },
  );
}
