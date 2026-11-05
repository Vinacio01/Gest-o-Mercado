import "server-only";

import { diaSeguinte, inicioDoDiaEmSaoPaulo } from "@/lib/format";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  esquemaResultadoVenda,
  type DadosVenda,
  type FiltrosVendas,
  type ResultadoVenda,
} from "@/lib/validations/vendas";

import { erroDoBanco } from "./banco";

/**
 * Registra a venda pela função do banco, que faz tudo numa transação:
 * idempotência, trava dos produtos, conferência de estoque, preços do banco,
 * baixa do estoque, movimentações e alertas.
 */
export async function registrarVenda(dados: DadosVenda): Promise<ResultadoVenda> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("registrar_venda", {
    p_chave_idempotencia: dados.chave_idempotencia,
    p_forma_pagamento: dados.forma_pagamento,
    p_itens: dados.itens,
  });
  if (error) throw erroDoBanco(error, "registrarVenda");

  const resultado = esquemaResultadoVenda.safeParse(data);
  if (!resultado.success) {
    // A venda foi gravada; só a resposta veio num formato inesperado.
    console.error("[registrarVenda] resposta inesperada do banco", data, resultado.error);
    throw new Error("Resposta inesperada de registrar_venda");
  }
  return resultado.data;
}

// -----------------------------------------------------------------------------
// Histórico e cancelamento (só proprietário: o RLS de vendas só libera para ele)
// -----------------------------------------------------------------------------

export const VENDAS_POR_PAGINA = 50;

export type VendaLista = {
  id: string;
  created_at: string;
  forma_pagamento: DadosVenda["forma_pagamento"];
  total: number;
  status: "concluida" | "cancelada";
  itens: number;
  operador_nome: string;
};

/** Nomes dos usuários (perfis), já que as vendas apontam para auth.users. */
async function nomesDosUsuarios(ids: (string | null)[]) {
  const unicos = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  const nomes = new Map<string, string>();
  if (unicos.length === 0) return nomes;
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("perfis").select("id, nome").in("id", unicos);
  if (error) throw erroDoBanco(error, "nomesDosUsuarios");
  for (const p of data) nomes.set(p.id, p.nome);
  return nomes;
}

export async function listarVendas(filtros: FiltrosVendas) {
  const supabase = await criarClienteServidor();

  const consultar = (pagina: number) => {
    let consulta = supabase
      .from("vendas")
      .select("id, created_at, forma_pagamento, total, status, operador_id, itens_venda(count)", {
        count: "exact",
      });
    if (filtros.forma) consulta = consulta.eq("forma_pagamento", filtros.forma);
    if (filtros.status) consulta = consulta.eq("status", filtros.status);
    // Dias no fuso de São Paulo; fim exclusivo (início do dia seguinte).
    if (filtros.de) consulta = consulta.gte("created_at", inicioDoDiaEmSaoPaulo(filtros.de).toISOString());
    if (filtros.ate) {
      consulta = consulta.lt("created_at", inicioDoDiaEmSaoPaulo(diaSeguinte(filtros.ate)).toISOString());
    }
    const inicio = (pagina - 1) * VENDAS_POR_PAGINA;
    return consulta
      .order("created_at", { ascending: false })
      .order("id")
      .range(inicio, inicio + VENDAS_POR_PAGINA - 1);
  };

  let pagina = filtros.pagina;
  let resposta = await consultar(pagina);
  if (resposta.error?.code === "PGRST103" && pagina > 1) {
    pagina = 1;
    resposta = await consultar(pagina);
  }
  if (resposta.error) throw erroDoBanco(resposta.error, "listarVendas");

  const linhas = resposta.data ?? [];
  const nomes = await nomesDosUsuarios(linhas.map((l) => l.operador_id));

  const vendas: VendaLista[] = linhas.map((l) => ({
    id: l.id,
    created_at: l.created_at,
    forma_pagamento: l.forma_pagamento,
    total: l.total,
    status: l.status,
    itens: l.itens_venda[0]?.count ?? 0,
    operador_nome: nomes.get(l.operador_id) ?? "Usuário removido",
  }));

  return { vendas, total: resposta.count ?? 0, pagina };
}

/** Venda completa, com itens, para a tela de detalhe. */
export async function obterVenda(id: string) {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("vendas")
    .select(
      "id, created_at, forma_pagamento, total, custo_total, status, operador_id, cancelada_por, cancelada_em, motivo_cancelamento, itens_venda(id, quantidade, preco_unitario, custo_unitario, subtotal, produtos(nome, unidade))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw erroDoBanco(error, "obterVenda");
  if (!data) return null;

  const nomes = await nomesDosUsuarios([data.operador_id, data.cancelada_por]);
  return {
    ...data,
    operador_nome: nomes.get(data.operador_id) ?? "Usuário removido",
    cancelada_por_nome: data.cancelada_por ? (nomes.get(data.cancelada_por) ?? "Usuário removido") : null,
    itens: data.itens_venda.map((i) => ({
      id: i.id,
      quantidade: i.quantidade,
      preco_unitario: i.preco_unitario,
      custo_unitario: i.custo_unitario,
      subtotal: i.subtotal,
      produto_nome: i.produtos?.nome ?? "Produto removido",
      unidade: i.produtos?.unidade ?? "",
    })),
  };
}

export type VendaDetalhe = NonNullable<Awaited<ReturnType<typeof obterVenda>>>;

/**
 * Cancela a venda pela função do banco: marca como cancelada, devolve o
 * estoque e registra as movimentações, numa transação só.
 */
export async function cancelarVenda(vendaId: string, motivo: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("cancelar_venda", { p_venda_id: vendaId, p_motivo: motivo });
  if (error) throw erroDoBanco(error, "cancelarVenda");
}
