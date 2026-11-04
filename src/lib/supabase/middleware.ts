import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { lerEnvPublico } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Renova a sessão do Supabase a cada requisição e devolve a resposta
 * com os cookies atualizados, junto com o id do usuário logado (ou null).
 *
 * Chamado pelo proxy (src/proxy.ts) em toda requisição.
 */
export async function atualizarSessao(request: NextRequest) {
  const env = lerEnvPublico();
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesParaGravar, cabecalhos) {
          cookiesParaGravar.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          resposta = NextResponse.next({ request });
          cookiesParaGravar.forEach(({ name, value, options }) =>
            resposta.cookies.set(name, value, options),
          );
          // Impede que CDNs guardem em cache uma resposta com cookie de sessão.
          Object.entries(cabecalhos).forEach(([chave, valor]) =>
            resposta.headers.set(chave, valor),
          );
        },
      },
    },
  );

  // Não coloque código entre a criação do cliente e esta chamada:
  // é ela que valida o token e, se preciso, o renova.
  const { data } = await supabase.auth.getClaims();
  const usuarioId = data?.claims?.sub ?? null;

  return { resposta, usuarioId };
}
