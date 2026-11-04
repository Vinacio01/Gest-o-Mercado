"use server";

import { revalidatePath } from "next/cache";

import { executarAcao } from "@/lib/acao";
import type { EstadoFormulario } from "@/lib/estado-formulario";
import { processarAlertas } from "@/lib/services/alertas";
import { salvarConfiguracoes } from "@/lib/services/configuracoes";
import { exigirProprietario } from "@/lib/services/sessao";
import { errosPorCampo } from "@/lib/validations/comum";
import { esquemaConfiguracoes } from "@/lib/validations/configuracoes";

export async function salvarConfiguracoesAcao(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirProprietario();

  const dados = esquemaConfiguracoes.safeParse({
    alertas_ativos: formData.get("alertas_ativos") ?? undefined,
    email_alerta: String(formData.get("email_alerta") ?? ""),
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
    await salvarConfiguracoes(dados.data);
    revalidatePath("/configuracoes");
    return "Configurações salvas.";
  }, "salvarConfiguracoesAcao");
}

/** Botão "Reenviar alertas pendentes": tenta mesmo os que já falharam 5 vezes. */
export async function reenviarAlertasAcao(): Promise<EstadoFormulario> {
  await exigirProprietario();

  return executarAcao(async () => {
    const resumo = await processarAlertas({ ignorarLimiteTentativas: true });
    revalidatePath("/configuracoes");

    if (resumo.situacao === "desativados") {
      return "Os alertas estão desativados: nada foi enviado.";
    }
    if (resumo.situacao === "sem_email") {
      return "Defina o e-mail de destino para enviar os alertas.";
    }
    if (resumo.enviados === 0 && resumo.falhas === 0) {
      return "Nenhum alerta aguardando envio.";
    }
    const partes = [
      resumo.enviados === 1 ? "1 e-mail enviado" : `${resumo.enviados} e-mails enviados`,
    ];
    if (resumo.falhas > 0) partes.push(resumo.falhas === 1 ? "1 falha" : `${resumo.falhas} falhas`);
    return `${partes.join(", ")}.`;
  }, "reenviarAlertasAcao");
}
