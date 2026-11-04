import { z } from "zod";

import { diaIso, inteiro } from "./comum";

/** Movimentações que o proprietário registra à mão. */
export const TIPOS_MANUAIS = ["entrada", "saida_manual", "ajuste"] as const;
export type TipoManual = (typeof TIPOS_MANUAIS)[number];

export const TIPOS_MOVIMENTACAO = [
  "entrada",
  "saida_manual",
  "venda",
  "cancelamento_venda",
  "ajuste",
] as const;
export type TipoMovimentacao = (typeof TIPOS_MOVIMENTACAO)[number];

export const ROTULO_TIPO: Record<TipoMovimentacao, string> = {
  entrada: "Entrada",
  saida_manual: "Saída manual",
  venda: "Venda",
  cancelamento_venda: "Cancelamento de venda",
  ajuste: "Ajuste",
};

const produtoId = z.uuid("Escolha um produto.");
const motivoObrigatorio = z
  .string()
  .trim()
  .min(1, "Informe o motivo.")
  .max(300, "O motivo pode ter no máximo 300 caracteres.");

export const esquemaMovimentacao = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("entrada"),
    produto_id: produtoId,
    quantidade: inteiro("A quantidade", { minimo: 1 }),
    motivo: z
      .string()
      .trim()
      .max(300, "O motivo pode ter no máximo 300 caracteres.")
      .transform((v) => (v === "" ? null : v)),
  }),
  z.object({
    tipo: z.literal("saida_manual"),
    produto_id: produtoId,
    quantidade: inteiro("A quantidade", { minimo: 1 }),
    motivo: motivoObrigatorio,
  }),
  z.object({
    tipo: z.literal("ajuste"),
    produto_id: produtoId,
    quantidade: inteiro("A nova quantidade"),
    motivo: motivoObrigatorio,
  }),
]);

export type DadosMovimentacao = z.infer<typeof esquemaMovimentacao>;

export const esquemaFiltrosMovimentacoes = z
  .object({
    produto: z.uuid().optional().catch(undefined),
    tipo: z.enum(TIPOS_MOVIMENTACAO).optional().catch(undefined),
    de: diaIso.optional().catch(undefined),
    ate: diaIso.optional().catch(undefined),
    pagina: z.coerce.number().int().min(1).max(10_000).catch(1),
    // Produto já escolhido no formulário (link "Movimentar" da lista de produtos).
    movimentar: z.uuid().optional().catch(undefined),
  });

export type FiltrosMovimentacoes = z.infer<typeof esquemaFiltrosMovimentacoes>;
