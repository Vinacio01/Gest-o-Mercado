/**
 * Formatação de moeda, data e fuso horário.
 *
 * Regras do projeto:
 * - Todo dia/mês é calculado no fuso de São Paulo.
 * - Dinheiro nunca é somado com ponto flutuante: trabalhe em centavos (inteiros)
 *   ou deixe o banco somar (numeric).
 */

export const LOCALE = "pt-BR";
export const FUSO_HORARIO = "America/Sao_Paulo";

const formatadorMoeda = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "BRL",
});

const formatadorData = new Intl.DateTimeFormat(LOCALE, {
  timeZone: FUSO_HORARIO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const formatadorDataHora = new Intl.DateTimeFormat(LOCALE, {
  timeZone: FUSO_HORARIO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const PADRAO_DECIMAL = /^(-)?(\d+)(?:\.(\d{1,2}))?$/;

/**
 * Converte um valor monetário vindo do banco (numeric chega como string ou
 * number com até 2 casas) para centavos inteiros, sem conta de ponto flutuante.
 * Ex.: "12.5" -> 1250, 3.99 -> 399.
 */
export function paraCentavos(valor: string | number): number {
  const texto = typeof valor === "number" ? valor.toFixed(2) : valor.trim();
  const partes = PADRAO_DECIMAL.exec(texto);

  if (!partes) {
    throw new Error(`Valor monetário inválido: ${valor}`);
  }

  const [, sinal, inteiro, decimais = ""] = partes;
  const centavos =
    Number(inteiro) * 100 + Number(decimais.padEnd(2, "0"));

  return sinal ? -centavos : centavos;
}

/** Formata centavos inteiros como "R$ 1.234,56". */
export function formatarCentavos(centavos: number): string {
  if (!Number.isInteger(centavos)) {
    throw new Error(`Centavos precisam ser inteiros: ${centavos}`);
  }
  // A divisão aqui é só para exibição; nenhum valor calculado volta ao sistema.
  return formatadorMoeda.format(centavos / 100);
}

/** Formata um valor do banco (numeric) como "R$ 1.234,56". */
export function formatarMoeda(valor: string | number): string {
  return formatarCentavos(paraCentavos(valor));
}

/** Formata uma data como "dd/mm/aaaa" no fuso de São Paulo. */
export function formatarData(data: Date | string): string {
  return formatadorData.format(new Date(data));
}

/** Formata data e hora como "dd/mm/aaaa, hh:mm" no fuso de São Paulo. */
export function formatarDataHora(data: Date | string): string {
  return formatadorDataHora.format(new Date(data));
}

// -----------------------------------------------------------------------------
// Dias no fuso de São Paulo
// -----------------------------------------------------------------------------

const formatadorDiaIso = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO_HORARIO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const formatadorPartes = new Intl.DateTimeFormat("en-US", {
  timeZone: FUSO_HORARIO,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Dia de um instante no fuso de São Paulo, como "aaaa-mm-dd". */
export function diaEmSaoPaulo(instante: Date = new Date()): string {
  return formatadorDiaIso.format(instante);
}

/** Diferença, em minutos, entre o relógio de São Paulo e o UTC naquele instante. */
function deslocamentoSaoPaulo(instante: Date): number {
  const partes = formatadorPartes.formatToParts(instante);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    Number(partes.find((p) => p.type === tipo)?.value);
  const relogioComoUtc = Date.UTC(
    valor("year"),
    valor("month") - 1,
    valor("day"),
    valor("hour"),
    valor("minute"),
    valor("second"),
  );
  return Math.round((relogioComoUtc - instante.getTime()) / 60_000);
}

/**
 * Instante em que começa o dia "aaaa-mm-dd" em São Paulo.
 * Ex.: "2026-10-31" -> 2026-10-31T03:00:00.000Z.
 * Usa o deslocamento real do fuso (funciona mesmo se o horário de verão voltar).
 */
export function inicioDoDiaEmSaoPaulo(dia: string): Date {
  const [ano, mes, d] = dia.split("-").map(Number);
  const meiaNoiteUtc = Date.UTC(ano, mes - 1, d);
  const deslocamento = deslocamentoSaoPaulo(new Date(meiaNoiteUtc));
  return new Date(meiaNoiteUtc - deslocamento * 60_000);
}

/** Dia seguinte a "aaaa-mm-dd" (útil para intervalos com fim exclusivo). */
export function diaSeguinte(dia: string): string {
  const [ano, mes, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, d + 1)).toISOString().slice(0, 10);
}

/** Soma (ou subtrai) dias a "aaaa-mm-dd". */
export function somarDias(dia: string, dias: number): string {
  const [ano, mes, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, d + dias)).toISOString().slice(0, 10);
}

const formatadorHora = new Intl.DateTimeFormat(LOCALE, {
  timeZone: FUSO_HORARIO,
  hour: "2-digit",
  minute: "2-digit",
});

/** Hora "hh:mm" no fuso de São Paulo. */
export function formatarHora(data: Date | string): string {
  return formatadorHora.format(new Date(data));
}
