import { z } from "zod";

export const FORMAS_PAGAMENTO = ["dinheiro", "pix", "debito", "credito"] as const;
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number];

export const ROTULO_FORMA: Record<FormaPagamento, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  debito: "Débito",
  credito: "Crédito",
};

/**
 * Venda enviada pelo caixa. Só vão o produto e a quantidade: preço e custo
 * são lidos do banco dentro de registrar_venda.
 */
export const esquemaVenda = z.object({
  chave_idempotencia: z.uuid(),
  forma_pagamento: z.enum(FORMAS_PAGAMENTO, "Escolha a forma de pagamento."),
  itens: z
    .array(
      z.object({
        produto_id: z.uuid(),
        quantidade: z.number().int().min(1).max(10_000),
      }),
    )
    .min(1, "Adicione ao menos um produto.")
    .max(200, "A venda tem itens demais."),
});

export type DadosVenda = z.infer<typeof esquemaVenda>;

/** Resposta de registrar_venda (jsonb), conferida antes de usar. */
export const esquemaResultadoVenda = z.object({
  venda_id: z.uuid(),
  total: z.union([z.number(), z.string()]),
  ja_registrada: z.boolean(),
  alertas: z.array(z.uuid()),
});

export type ResultadoVenda = z.infer<typeof esquemaResultadoVenda>;
