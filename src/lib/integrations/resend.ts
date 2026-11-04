import "server-only";

import { Resend } from "resend";

/**
 * Envio de e-mail pelo Resend. Sem simulação: se a chave ou o remetente não
 * estiverem configurados, o envio falha com uma mensagem clara, que fica
 * registrada no alerta e aparece na tela de configurações.
 */

export type MensagemEmail = {
  para: string;
  assunto: string;
  texto: string;
  /** O Resend descarta um segundo envio com a mesma chave (24 h). */
  chaveIdempotencia: string;
};

export type ResultadoEnvio = { ok: true } | { ok: false; erro: string };

export type EnviarEmail = (mensagem: MensagemEmail) => Promise<ResultadoEnvio>;

export const ERRO_SEM_CHAVE =
  "RESEND_API_KEY não configurada no servidor. Nenhum e-mail foi enviado.";
export const ERRO_SEM_REMETENTE =
  "ALERTA_EMAIL_REMETENTE não configurado no servidor. Nenhum e-mail foi enviado.";

/** Só diz se está configurado; nunca expõe os valores. */
export function statusIntegracaoEmail() {
  return {
    chaveConfigurada: Boolean(process.env.RESEND_API_KEY?.trim()),
    remetenteConfigurado: Boolean(process.env.ALERTA_EMAIL_REMETENTE?.trim()),
  };
}

export const enviarEmailResend: EnviarEmail = async (mensagem) => {
  const chave = process.env.RESEND_API_KEY?.trim();
  const remetente = process.env.ALERTA_EMAIL_REMETENTE?.trim();
  if (!chave) return { ok: false, erro: ERRO_SEM_CHAVE };
  if (!remetente) return { ok: false, erro: ERRO_SEM_REMETENTE };

  try {
    const { error } = await new Resend(chave).emails.send(
      {
        from: remetente,
        to: mensagem.para,
        subject: mensagem.assunto,
        text: mensagem.texto,
      },
      { idempotencyKey: mensagem.chaveIdempotencia },
    );
    if (error) {
      console.error("[resend] envio recusado", error);
      return { ok: false, erro: `Resend recusou o envio: ${error.message}` };
    }
    return { ok: true };
  } catch (erro) {
    console.error("[resend] falha de comunicação", erro);
    return { ok: false, erro: "Não foi possível falar com o Resend (rede ou serviço fora do ar)." };
  }
};
