import "server-only";

import { paraCentavos } from "@/lib/format";
import type { PeriodosPainel } from "@/lib/periodos";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { FormaPagamento } from "@/lib/validations/vendas";

import { erroDoBanco } from "./banco";

/**
 * Indicadores do painel. Toda soma e agrupamento acontece no banco (funções
 * de 20261104000700_indicadores.sql); aqui só chegam os totais, já sem as
 * vendas canceladas. Valores em dinheiro viram centavos inteiros.
 */

export type Resumo = {
  faturamento: number;
  custo: number;
  lucroBruto: number;
  vendas: number;
  ticketMedio: number;
};

export type Indicadores = {
  hoje: Resumo;
  atual: Resumo;
  anterior: Resumo;
  porDia: { dia: string; faturamento: number; vendas: number }[];
  porMes: { mes: string; faturamento: number; vendas: number }[];
  topProdutos: { id: string; nome: string; unidade: string; quantidade: number; faturamento: number }[];
  porForma: { forma: FormaPagamento; vendas: number; faturamento: number }[];
  produtosEstoqueBaixo: number;
};

type LinhaResumo = {
  faturamento: number;
  custo: number;
  lucro_bruto: number;
  quantidade_vendas: number;
  ticket_medio: number;
};

function paraResumo(linhas: LinhaResumo[] | null): Resumo {
  const l = linhas?.[0];
  return {
    faturamento: paraCentavos(l?.faturamento ?? 0),
    custo: paraCentavos(l?.custo ?? 0),
    lucroBruto: paraCentavos(l?.lucro_bruto ?? 0),
    vendas: l?.quantidade_vendas ?? 0,
    ticketMedio: paraCentavos(l?.ticket_medio ?? 0),
  };
}

const iso = (d: Date) => d.toISOString();

export async function obterIndicadores(periodos: PeriodosPainel): Promise<Indicadores> {
  const supabase = await criarClienteServidor();
  const { atual, anterior, hoje } = periodos;

  const [rHoje, rAtual, rAnterior, porDia, porMes, top, porForma, baixo] = await Promise.all([
    supabase.rpc("resumo_vendas", { p_inicio: iso(hoje.inicio), p_fim: iso(hoje.fim) }),
    supabase.rpc("resumo_vendas", { p_inicio: iso(atual.inicio), p_fim: iso(atual.fim) }),
    supabase.rpc("resumo_vendas", { p_inicio: iso(anterior.inicio), p_fim: iso(anterior.fim) }),
    supabase.rpc("faturamento_por_dia", { p_inicio: iso(atual.inicio), p_fim: iso(atual.fim) }),
    supabase.rpc("faturamento_por_mes", { p_referencia: iso(hoje.fim), p_meses: 6 }),
    supabase.rpc("top_produtos", { p_inicio: iso(atual.inicio), p_fim: iso(atual.fim), p_limite: 10 }),
    supabase.rpc("vendas_por_forma", { p_inicio: iso(atual.inicio), p_fim: iso(atual.fim) }),
    supabase
      .from("produtos_catalogo")
      .select("id", { count: "exact", head: true })
      .eq("ativo", true)
      .eq("estoque_baixo", true),
  ]);

  for (const [nome, r] of Object.entries({ rHoje, rAtual, rAnterior, porDia, porMes, top, porForma, baixo })) {
    if (r.error) throw erroDoBanco(r.error, `obterIndicadores.${nome}`);
  }

  return {
    hoje: paraResumo(rHoje.data),
    atual: paraResumo(rAtual.data),
    anterior: paraResumo(rAnterior.data),
    porDia: (porDia.data ?? []).map((l) => ({
      dia: l.dia,
      faturamento: paraCentavos(l.faturamento),
      vendas: l.quantidade_vendas,
    })),
    porMes: (porMes.data ?? []).map((l) => ({
      mes: l.mes,
      faturamento: paraCentavos(l.faturamento),
      vendas: l.quantidade_vendas,
    })),
    topProdutos: (top.data ?? []).map((l) => ({
      id: l.produto_id,
      nome: l.nome,
      unidade: l.unidade,
      quantidade: l.quantidade,
      faturamento: paraCentavos(l.faturamento),
    })),
    porForma: (porForma.data ?? []).map((l) => ({
      forma: l.forma_pagamento,
      vendas: l.quantidade_vendas,
      faturamento: paraCentavos(l.faturamento),
    })),
    produtosEstoqueBaixo: baixo.count ?? 0,
  };
}
