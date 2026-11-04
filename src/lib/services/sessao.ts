import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import type { Papel } from "@/lib/navegacao";
import { criarClienteServidor } from "@/lib/supabase/server";

export type UsuarioAtual = {
  id: string;
  email: string;
  nome: string;
  papel: Papel;
};

type Sessao =
  | { estado: "anonimo" }
  /** Logado no Auth, mas sem perfil ativo (desativado ou sem perfil). */
  | { estado: "inativo" }
  | { estado: "ativo"; usuario: UsuarioAtual };

/**
 * Lê a sessão e o perfil do usuário. O `cache` do React garante uma única
 * leitura por requisição, mesmo que layout e página chamem esta função.
 */
export const obterSessao = cache(async (): Promise<Sessao> => {
  const supabase = await criarClienteServidor();

  // getClaims valida a assinatura do token; não confie em getSession no servidor.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) {
    return { estado: "anonimo" };
  }

  // O RLS só devolve o perfil se ele estiver ativo.
  const { data: perfil, error } = await supabase
    .from("perfis")
    .select("nome, papel")
    .eq("id", claims.sub)
    .maybeSingle();

  if (error) {
    console.error("[sessao] erro ao carregar perfil", error);
    throw new Error("Não foi possível carregar seu perfil.");
  }

  if (!perfil) {
    return { estado: "inativo" };
  }

  return {
    estado: "ativo",
    usuario: {
      id: claims.sub,
      email: typeof claims.email === "string" ? claims.email : "",
      nome: perfil.nome,
      papel: perfil.papel,
    },
  };
});

export function destinoInicial(papel: Papel): string {
  return papel === "proprietario" ? "/painel" : "/caixa";
}

/** Exige um usuário logado e ativo; senão manda para o login. */
export async function exigirUsuario(): Promise<UsuarioAtual> {
  const sessao = await obterSessao();
  if (sessao.estado === "anonimo") redirect("/login");
  if (sessao.estado === "inativo") redirect("/login?motivo=inativo");
  return sessao.usuario;
}

/** Exige o proprietário; o funcionário é mandado para o caixa. */
export async function exigirProprietario(): Promise<UsuarioAtual> {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "proprietario") redirect("/caixa");
  return usuario;
}
