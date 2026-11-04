import { NextResponse, type NextRequest } from "next/server";

import { atualizarSessao } from "@/lib/supabase/middleware";

const ROTAS_PUBLICAS = ["/login"];

/**
 * Roda antes de cada página:
 * 1. Renova a sessão do Supabase (cookies).
 * 2. Manda para /login quem não está logado.
 *
 * A checagem de PAPEL (proprietário x funcionário) não fica aqui: ela é feita
 * no servidor de cada página/ação (lib/services/sessao.ts) e, por fim, no
 * próprio banco pelo RLS.
 */
export async function proxy(request: NextRequest) {
  const { resposta, usuarioId } = await atualizarSessao(request);
  const { pathname } = request.nextUrl;

  const ehPublica = ROTAS_PUBLICAS.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`),
  );

  if (!usuarioId && !ehPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    const redirecionamento = NextResponse.redirect(url);
    // Mantém os cookies que o Supabase acabou de ajustar (ex.: sessão expirada).
    resposta.cookies.getAll().forEach((cookie) =>
      redirecionamento.cookies.set(cookie),
    );
    return redirecionamento;
  }

  return resposta;
}

export const config = {
  matcher: [
    /*
     * Tudo, exceto:
     * - arquivos estáticos e imagens do Next
     * - favicon e imagens da pasta public
     * - api/cron, que tem autenticação própria (CRON_SECRET)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
