import { z } from "zod";

/**
 * Peças de validação reutilizadas pelos formulários.
 * Os dados chegam do FormData como texto; cada schema converte para o tipo certo.
 */

/** Texto opcional: vazio vira null. */
export function textoOpcional(maximo: number, rotulo: string) {
  return z
    .string()
    .trim()
    .max(maximo, `${rotulo} pode ter no máximo ${maximo} caracteres.`)
    .transform((v) => (v === "" ? null : v));
}

/** Uuid opcional vindo de um <select>: vazio vira null. */
export const uuidOpcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.uuid("Opção inválida.").nullable());

/** Inteiro não negativo digitado num campo de texto. */
export function inteiro(rotulo: string, { minimo = 0, maximo = 1_000_000 } = {}) {
  return z
    .string()
    .trim()
    .regex(/^\d+$/, `${rotulo} precisa ser um número inteiro.`)
    .transform(Number)
    .pipe(
      z
        .number()
        .int()
        .min(minimo, `${rotulo} precisa ser no mínimo ${minimo}.`)
        .max(maximo, `${rotulo} precisa ser no máximo ${maximo.toLocaleString("pt-BR")}.`),
    );
}

const PADRAO_DINHEIRO = /^\d{1,8}(\.\d{1,2})?$/;

/**
 * Normaliza um valor em reais digitado pelo usuário para o formato decimal do
 * banco, SEM passar por número de ponto flutuante.
 * Aceita "12,50", "12.50", "1.234,56" e "R$ 3,9". Devolve "12.50" ou null.
 */
export function normalizarDinheiro(entrada: string): string | null {
  let texto = entrada.replace(/R\$/i, "").replace(/\s/g, "");
  if (texto.includes(",")) {
    // Formato brasileiro: ponto separa milhar, vírgula separa centavos.
    texto = texto.replace(/\./g, "").replace(",", ".");
  }
  if (!PADRAO_DINHEIRO.test(texto)) return null;

  const [inteiros, centavos = ""] = texto.split(".");
  return `${BigInt(inteiros).toString()}.${centavos.padEnd(2, "0")}`;
}

/** Valor em reais; devolve texto decimal ("12.50") para o banco somar em numeric. */
export function dinheiro(rotulo: string, { positivo = false } = {}) {
  return z
    .string()
    .trim()
    .min(1, `Informe ${rotulo.toLowerCase()}.`)
    .transform((v, ctx) => {
      const valor = normalizarDinheiro(v);
      if (valor === null) {
        ctx.addIssue({ code: "custom", message: `${rotulo} inválido. Use o formato 12,50.` });
        return z.NEVER;
      }
      if (positivo && /^0+\.00$/.test(valor)) {
        ctx.addIssue({ code: "custom", message: `${rotulo} precisa ser maior que zero.` });
        return z.NEVER;
      }
      return valor;
    });
}

/** Dia no formato do <input type="date"> ("aaaa-mm-dd"). */
export const diaIso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "Data inválida.");

/** Transforma os erros do Zod em { campo: primeira mensagem }. */
export function errosPorCampo(erro: z.ZodError): Record<string, string> {
  const campos: Record<string, string> = {};
  for (const issue of erro.issues) {
    const campo = String(issue.path[0] ?? "formulario");
    campos[campo] ??= issue.message;
  }
  return campos;
}
