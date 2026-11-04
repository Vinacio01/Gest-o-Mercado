import "server-only";

import { criarClienteServidor } from "@/lib/supabase/server";
import {
  esquemaResultadoVenda,
  type DadosVenda,
  type ResultadoVenda,
} from "@/lib/validations/vendas";

import { erroDoBanco } from "./banco";

/**
 * Registra a venda pela função do banco, que faz tudo numa transação:
 * idempotência, trava dos produtos, conferência de estoque, preços do banco,
 * baixa do estoque, movimentações e alertas.
 */
export async function registrarVenda(dados: DadosVenda): Promise<ResultadoVenda> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("registrar_venda", {
    p_chave_idempotencia: dados.chave_idempotencia,
    p_forma_pagamento: dados.forma_pagamento,
    p_itens: dados.itens,
  });
  if (error) throw erroDoBanco(error, "registrarVenda");

  const resultado = esquemaResultadoVenda.safeParse(data);
  if (!resultado.success) {
    // A venda foi gravada; só a resposta veio num formato inesperado.
    console.error("[registrarVenda] resposta inesperada do banco", data, resultado.error);
    throw new Error("Resposta inesperada de registrar_venda");
  }
  return resultado.data;
}
