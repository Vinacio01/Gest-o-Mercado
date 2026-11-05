"use server";

import { revalidatePath } from "next/cache";

import { executarAcao } from "@/lib/acao";
import type { EstadoFormulario } from "@/lib/estado-formulario";
import { exigirProprietario } from "@/lib/services/sessao";
import { cancelarVenda } from "@/lib/services/vendas";
import { errosPorCampo } from "@/lib/validations/comum";
import { esquemaCancelamento } from "@/lib/validations/vendas";

/**
 * Cancela a venda (só proprietário; o banco também confere). O estoque volta
 * e a venda sai de todos os indicadores do painel.
 */
export async function cancelarVendaAcao(
  vendaId: string,
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirProprietario();

  const dados = esquemaCancelamento.safeParse({
    venda_id: vendaId,
    motivo: String(formData.get("motivo") ?? ""),
  });
  if (!dados.success) {
    return {
      ok: false,
      erro: dados.error.issues[0]?.message ?? "Confira os campos.",
      campos: errosPorCampo(dados.error),
      versao: Date.now(),
    };
  }

  return executarAcao(async () => {
    await cancelarVenda(dados.data.venda_id, dados.data.motivo);
    revalidatePath("/vendas", "layout");
    revalidatePath("/painel");
    revalidatePath("/estoque");
    revalidatePath("/produtos");
    revalidatePath("/caixa");
    revalidatePath("/configuracoes"); // o estorno pode ter resolvido um alerta (decisão D)
    return "Venda cancelada. O estoque foi devolvido.";
  }, "cancelarVendaAcao");
}
