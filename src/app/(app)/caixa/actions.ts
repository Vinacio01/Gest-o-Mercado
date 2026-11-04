"use server";

import { revalidatePath } from "next/cache";

import { formatarMoeda } from "@/lib/format";
import { ErroAmigavel } from "@/lib/services/banco";
import { exigirUsuario } from "@/lib/services/sessao";
import { registrarVenda } from "@/lib/services/vendas";
import { esquemaVenda } from "@/lib/validations/vendas";

export type RespostaVenda =
  | { ok: true; total: string; jaRegistrada: boolean }
  | { ok: false; erro: string };

/**
 * Finaliza a venda do caixa. Proprietário e funcionário podem vender.
 * A chave de idempotência vem do navegador: se a mesma venda chegar duas vezes
 * (duplo clique, rede instável), o banco devolve a primeira sem duplicar.
 */
export async function finalizarVendaAcao(entrada: unknown): Promise<RespostaVenda> {
  await exigirUsuario();

  const dados = esquemaVenda.safeParse(entrada);
  if (!dados.success) {
    console.warn("[finalizarVendaAcao] dados inválidos", dados.error.issues);
    return {
      ok: false,
      erro: dados.error.issues[0]?.message ?? "Venda inválida. Recarregue a página.",
    };
  }

  try {
    const resultado = await registrarVenda(dados.data);

    // Os alertas de estoque baixo criados pela venda (resultado.alertas) serão
    // enviados por e-mail na Fase 5, sem bloquear esta resposta.

    revalidatePath("/caixa");
    revalidatePath("/produtos");
    revalidatePath("/estoque");

    return {
      ok: true,
      total: formatarMoeda(resultado.total),
      jaRegistrada: resultado.ja_registrada,
    };
  } catch (erro) {
    if (erro instanceof ErroAmigavel) return { ok: false, erro: erro.message };
    console.error("[finalizarVendaAcao] erro inesperado", erro);
    return {
      ok: false,
      erro: "Não foi possível confirmar a venda. Tente de novo: ela não será duplicada.",
    };
  }
}
