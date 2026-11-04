import "server-only";

import { after } from "next/server";

import { enviarEmailResend, type EnviarEmail } from "@/lib/integrations/resend";
import { criarClienteAdmin } from "@/lib/supabase/admin";

/** Depois de 5 tentativas, o cron para de tentar; o botão "Reenviar" ainda tenta. */
export const LIMITE_TENTATIVAS = 5;

export type DadosAlertaEmail = {
  nome: string;
  quantidade: number;
  estoqueMinimo: number;
  unidade: string;
};

/** Assunto e corpo do e-mail, exatamente como na especificação. */
export function montarEmailAlerta(p: DadosAlertaEmail) {
  return {
    assunto: `Alerta de estoque baixo: ${p.nome}`,
    texto: [
      "ALERTA DE ESTOQUE BAIXO",
      "",
      `Produto: ${p.nome}`,
      `Estoque atual: ${p.quantidade} ${p.unidade}`,
      `Estoque mínimo: ${p.estoqueMinimo} ${p.unidade}`,
      "",
      "Recomendamos realizar a reposição deste produto.",
    ].join("\n"),
  };
}

export type ResumoEnvio =
  | { situacao: "desativados"; pendentes: number }
  | { situacao: "sem_email"; pendentes: number }
  | { situacao: "processado"; enviados: number; falhas: number };

type Opcoes = {
  /** Só estes alertas (ex.: os criados pela venda). Sem ids: toda a fila. */
  ids?: string[];
  /** O botão "Reenviar" do proprietário tenta mesmo depois de 5 falhas. */
  ignorarLimiteTentativas?: boolean;
  /** Troca o envio real (usado nos testes). */
  enviar?: EnviarEmail;
};

/**
 * Processa a fila de alertas: reserva no banco, envia um e-mail por alerta e
 * grava o resultado. Se os alertas estiverem desligados ou sem e-mail de
 * destino, nada é enviado e os alertas continuam 'pendente'.
 */
export async function processarAlertas(opcoes: Opcoes = {}): Promise<ResumoEnvio> {
  const admin = criarClienteAdmin();
  const enviar = opcoes.enviar ?? enviarEmailResend;

  const { data: config, error: erroConfig } = await admin
    .from("configuracoes")
    .select("alertas_ativos, email_alerta")
    .eq("id", 1)
    .single();
  if (erroConfig) throw erroConfig;

  if (!config.alertas_ativos || !config.email_alerta) {
    const { count } = await admin
      .from("alertas_estoque")
      .select("id", { count: "exact", head: true })
      .is("resolvido_em", null)
      .in("status", ["pendente", "falhou"]);
    return {
      situacao: config.alertas_ativos ? "sem_email" : "desativados",
      pendentes: count ?? 0,
    };
  }

  const { data: reservados, error } = await admin.rpc("reservar_alertas_para_envio", {
    p_ids: opcoes.ids,
    // null = sem limite. (undefined não serve: o parâmetro seria omitido e o
    // banco usaria o padrão de 5.) O tipo gerado não prevê null, daí a conversão.
    p_limite_tentativas: opcoes.ignorarLimiteTentativas
      ? (null as unknown as number)
      : LIMITE_TENTATIVAS,
  });
  if (error) throw error;

  let enviados = 0;
  let falhas = 0;

  for (const alerta of reservados) {
    const email = montarEmailAlerta({
      nome: alerta.produto_nome,
      quantidade: alerta.produto_quantidade,
      estoqueMinimo: alerta.produto_estoque_minimo,
      unidade: alerta.produto_unidade,
    });

    const resultado = await enviar({
      para: config.email_alerta,
      ...email,
      // Muda a cada tentativa registrada: uma falha não bloqueia o reenvio,
      // mas um envio repetido da mesma tentativa é descartado pelo Resend.
      chaveIdempotencia: `alerta-${alerta.alerta_id}-${alerta.tentativas_anteriores}`,
    });

    const { error: erroGravar } = await admin
      .from("alertas_estoque")
      .update(
        resultado.ok
          ? {
              status: "enviado",
              enviado_em: new Date().toISOString(),
              ultimo_erro: null,
              processando_desde: null,
            }
          : {
              status: "falhou",
              tentativas: alerta.tentativas_anteriores + 1,
              ultimo_erro: resultado.erro.slice(0, 500),
              processando_desde: null,
            },
      )
      .eq("id", alerta.alerta_id);
    if (erroGravar) console.error("[alertas] não gravou o resultado do envio", erroGravar);

    if (resultado.ok) enviados++;
    else falhas++;
  }

  return { situacao: "processado", enviados, falhas };
}

/**
 * Agenda o processamento para DEPOIS da resposta ao usuário (after do Next):
 * a venda ou a movimentação não esperam o e-mail, e uma falha no envio não
 * desfaz nada.
 */
export function enviarAlertasDepoisDaResposta(ids?: string[]) {
  if (ids && ids.length === 0) return;
  after(async () => {
    try {
      const resumo = await processarAlertas({ ids });
      if (resumo.situacao === "processado" && resumo.falhas > 0) {
        console.warn("[alertas] envio com falhas", resumo);
      }
    } catch (erro) {
      console.error("[alertas] erro ao processar a fila", erro);
    }
  });
}
