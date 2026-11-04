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
