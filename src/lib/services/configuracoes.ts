import "server-only";

import { criarClienteServidor } from "@/lib/supabase/server";
import type { DadosConfiguracoes } from "@/lib/validations/configuracoes";

import { ErroAmigavel, erroDoBanco } from "./banco";

/** Configuração de linha única (o RLS só libera para o proprietário). */
export async function obterConfiguracoes() {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("configuracoes")
    .select("alertas_ativos, email_alerta")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw erroDoBanco(error, "obterConfiguracoes");
  if (!data) throw new ErroAmigavel("Configurações não encontradas.");
  return data;
}

export async function salvarConfiguracoes(dados: DadosConfiguracoes) {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("configuracoes")
    .update(dados)
    .eq("id", 1)
    .select("id");
  if (error) throw erroDoBanco(error, "salvarConfiguracoes");
  if (data.length === 0) throw new ErroAmigavel("Você não tem permissão para fazer isso.");
}

export type AlertaRecente = {
  id: string;
  produto_nome: string;
  quantidade_no_alerta: number;
  estoque_minimo_no_alerta: number;
  unidade: string;
  status: "pendente" | "enviado" | "falhou";
  tentativas: number;
  ultimo_erro: string | null;
  enviado_em: string | null;
  resolvido_em: string | null;
  created_at: string;
};

/** Últimos alertas e quantos estão aguardando envio. */
export async function listarAlertasRecentes(limite = 20) {
  const supabase = await criarClienteServidor();
  const [recentes, aguardando] = await Promise.all([
    supabase
      .from("alertas_estoque")
      .select(
        "id, quantidade_no_alerta, estoque_minimo_no_alerta, status, tentativas, ultimo_erro, enviado_em, resolvido_em, created_at, produtos(nome, unidade)",
      )
      .order("created_at", { ascending: false })
      .limit(limite),
    supabase
      .from("alertas_estoque")
      .select("id", { count: "exact", head: true })
      .is("resolvido_em", null)
      .in("status", ["pendente", "falhou"]),
  ]);
  if (recentes.error) throw erroDoBanco(recentes.error, "listarAlertasRecentes");
  if (aguardando.error) throw erroDoBanco(aguardando.error, "listarAlertasRecentes.contagem");

  const alertas: AlertaRecente[] = recentes.data.map(({ produtos, ...a }) => ({
    ...a,
    produto_nome: produtos?.nome ?? "Produto removido",
    unidade: produtos?.unidade ?? "",
  }));

  return { alertas, aguardandoEnvio: aguardando.count ?? 0 };
}
