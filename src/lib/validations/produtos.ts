import { z } from "zod";

import { dinheiro, inteiro, textoOpcional, uuidOpcional } from "./comum";

export const UNIDADES = ["un", "kg", "L", "cx"] as const;
export type Unidade = (typeof UNIDADES)[number];

export const ROTULO_UNIDADE: Record<Unidade, string> = {
  un: "Unidade (un)",
  kg: "Quilo (kg)",
  L: "Litro (L)",
  cx: "Caixa (cx)",
};

const camposProduto = {
  nome: z
    .string()
    .trim()
    .min(1, "Informe o nome do produto.")
    .max(120, "O nome pode ter no máximo 120 caracteres."),
  descricao: textoOpcional(500, "A descrição"),
  categoria_id: uuidOpcional,
  codigo_barras: textoOpcional(50, "O código de barras").refine(
    (v) => v === null || /^[\w-]+$/.test(v),
    "O código de barras só pode ter letras, números e hífen.",
  ),
  unidade: z.enum(UNIDADES, "Escolha uma unidade."),
  preco_custo: dinheiro("Preço de custo"),
  preco_venda: dinheiro("Preço de venda", { positivo: true }),
  estoque_minimo: inteiro("O estoque mínimo"),
};

export const esquemaNovoProduto = z.object({
  ...camposProduto,
  estoque_inicial: inteiro("O estoque inicial"),
});

export const esquemaEdicaoProduto = z.object(camposProduto);

export type DadosNovoProduto = z.infer<typeof esquemaNovoProduto>;
export type DadosEdicaoProduto = z.infer<typeof esquemaEdicaoProduto>;

export const esquemaCategoria = z.object({
  nome: z
    .string()
    .trim()
    .min(1, "Informe o nome da categoria.")
    .max(60, "O nome pode ter no máximo 60 caracteres."),
});

// -----------------------------------------------------------------------------
// Filtros da lista (vêm da URL). Valores inválidos voltam ao padrão em vez de
// gerar erro: a URL pode ter sido editada à mão.
// -----------------------------------------------------------------------------
export const SITUACOES_ESTOQUE = ["todos", "baixo", "sem"] as const;
export const ORDENS_PRODUTO = ["nome", "quantidade_asc", "quantidade_desc"] as const;

export const esquemaFiltrosProdutos = z.object({
  busca: z.string().trim().max(100).catch(""),
  categoria: z.uuid().optional().catch(undefined),
  estoque: z.enum(SITUACOES_ESTOQUE).catch("todos"),
  ordem: z.enum(ORDENS_PRODUTO).catch("nome"),
  inativos: z
    .enum(["1"])
    .optional()
    .catch(undefined)
    .transform((v) => v === "1"),
  pagina: z.coerce.number().int().min(1).max(10_000).catch(1),
});

export type FiltrosProdutos = z.infer<typeof esquemaFiltrosProdutos>;
