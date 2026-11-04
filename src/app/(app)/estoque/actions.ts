"use server";

import { revalidatePath } from "next/cache";

import { executarAcao } from "@/lib/acao";
import type { EstadoFormulario } from "@/lib/estado-formulario";
import { enviarAlertasDepoisDaResposta } from "@/lib/services/alertas";
import { registrarMovimentacao } from "@/lib/services/estoque";
import { exigirProprietario } from "@/lib/services/sessao";
import { errosPorCampo } from "@/lib/validations/comum";
import { esquemaMovimentacao } from "@/lib/validations/estoque";

const MENSAGEM_SUCESSO = {
  entrada: "Entrada registrada.",
  saida_manual: "Saída registrada.",
  ajuste: "Ajuste registrado.",
} as const;

export async function registrarMovimentacaoAcao(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirProprietario();

  const dados = esquemaMovimentacao.safeParse({
    tipo: formData.get("tipo"),
    produto_id: String(formData.get("produto_id") ?? ""),
    quantidade: String(formData.get("quantidade") ?? ""),
    motivo: String(formData.get("motivo") ?? ""),
  });

  if (!dados.success) {
    return {
      ok: false,
      erro: "Confira os campos destacados.",
      campos: errosPorCampo(dados.error),
      versao: Date.now(),
    };
  }

  return executarAcao(async () => {
    await registrarMovimentacao(dados.data);
    // Saída ou ajuste podem ter aberto um alerta (decisão C).
    if (dados.data.tipo !== "entrada") enviarAlertasDepoisDaResposta();
    revalidatePath("/estoque");
    revalidatePath("/produtos");
    return MENSAGEM_SUCESSO[dados.data.tipo];
  }, "registrarMovimentacaoAcao");
}
