import "server-only";

import { diaSeguinte, inicioDoDiaEmSaoPaulo } from "@/lib/format";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { DadosMovimentacao, FiltrosMovimentacoes } from "@/lib/validations/estoque";

import { buscarTodas, erroDoBanco } from "./banco";

export const MOVIMENTACOES_POR_PAGINA = 50;

/**
 * Registra entrada, saída manual ou ajuste pela função do banco, que trava o
 * produto, confere o papel e grava a movimentação na mesma transação.
 */
export async function registrarMovimentacao(dados: DadosMovimentacao) {
  const supabase = await criarClienteServidor();

  const { error } =
    dados.tipo === "entrada"
      ? await supabase.rpc("registrar_entrada", {
          p_produto_id: dados.produto_id,
          p_quantidade: dados.quantidade,
          p_motivo: dados.motivo ?? undefined,
        })
      : dados.tipo === "saida_manual"
        ? await supabase.rpc("registrar_saida_manual", {
            p_produto_id: dados.produto_id,
            p_quantidade: dados.quantidade,
            p_motivo: dados.motivo,
          })
        : await supabase.rpc("registrar_ajuste", {
            p_produto_id: dados.produto_id,
            p_nova_quantidade: dados.quantidade,
            p_motivo: dados.motivo,
          });

  if (error) throw erroDoBanco(error, `registrarMovimentacao.${dados.tipo}`);
}

export type ProdutoSelecao = {
  id: string;
  nome: string;
  codigo_barras: string | null;
  unidade: string;
  quantidade: number;
  estoque_minimo: number;
};

/** Produtos ativos para os seletores (sem custo). */
export async function listarProdutosParaSelecao(): Promise<ProdutoSelecao[]> {
  const supabase = await criarClienteServidor();
  return buscarTodas(
    (de, ate) =>
      supabase
        .from("produtos_catalogo")
        .select("id, nome, codigo_barras, unidade, quantidade, estoque_minimo")
        .eq("ativo", true)
        .order("nome")
        .order("id")
        .range(de, ate),
    "listarProdutosParaSelecao",
  );
}

export type Movimentacao = {
  id: string;
  tipo: DadosMovimentacao["tipo"] | "venda" | "cancelamento_venda";
  quantidade: number;
  quantidade_anterior: number;
  quantidade_posterior: number;
  motivo: string | null;
  created_at: string;
  produto_nome: string;
  unidade: string;
  usuario_nome: string;
};

/** Histórico de movimentações filtrado e paginado no banco (só proprietário). */
export async function listarMovimentacoes(filtros: FiltrosMovimentacoes) {
  const supabase = await criarClienteServidor();

  const consultar = (pagina: number) => {
    let consulta = supabase
      .from("movimentacoes_estoque")
      .select(
        "id, tipo, quantidade, quantidade_anterior, quantidade_posterior, motivo, created_at, usuario_id, produtos(nome, unidade)",
        { count: "exact" },
      );

    if (filtros.produto) consulta = consulta.eq("produto_id", filtros.produto);
    if (filtros.tipo) consulta = consulta.eq("tipo", filtros.tipo);
    // Dias interpretados no fuso de São Paulo; o fim é exclusivo (início do dia seguinte).
    if (filtros.de) {
      consulta = consulta.gte("created_at", inicioDoDiaEmSaoPaulo(filtros.de).toISOString());
    }
    if (filtros.ate) {
      consulta = consulta.lt(
        "created_at",
        inicioDoDiaEmSaoPaulo(diaSeguinte(filtros.ate)).toISOString(),
      );
    }

    const inicio = (pagina - 1) * MOVIMENTACOES_POR_PAGINA;
    return consulta
      .order("created_at", { ascending: false })
      .order("id")
      .range(inicio, inicio + MOVIMENTACOES_POR_PAGINA - 1);
  };

  let pagina = filtros.pagina;
  let resposta = await consultar(pagina);
  if (resposta.error?.code === "PGRST103" && pagina > 1) {
    pagina = 1;
    resposta = await consultar(pagina);
  }
  if (resposta.error) throw erroDoBanco(resposta.error, "listarMovimentacoes");

  const linhas = resposta.data ?? [];

  // usuario_id aponta para auth.users; o nome está em perfis.
  const ids = [...new Set(linhas.map((l) => l.usuario_id))];
  const nomes = new Map<string, string>();
  if (ids.length > 0) {
    const { data, error } = await supabase.from("perfis").select("id, nome").in("id", ids);
    if (error) throw erroDoBanco(error, "listarMovimentacoes.perfis");
    for (const perfil of data) nomes.set(perfil.id, perfil.nome);
  }

  const movimentacoes: Movimentacao[] = linhas.map((l) => ({
    id: l.id,
    tipo: l.tipo,
    quantidade: l.quantidade,
    quantidade_anterior: l.quantidade_anterior,
    quantidade_posterior: l.quantidade_posterior,
    motivo: l.motivo,
    created_at: l.created_at,
    produto_nome: l.produtos?.nome ?? "Produto removido",
    unidade: l.produtos?.unidade ?? "",
    usuario_nome: nomes.get(l.usuario_id) ?? "Usuário removido",
  }));

  return { movimentacoes, total: resposta.count ?? 0, pagina };
}
