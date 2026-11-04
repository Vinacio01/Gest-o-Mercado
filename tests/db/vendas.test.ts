import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { esquemaResultadoVenda } from "@/lib/validations/vendas";
import type { Json } from "@/types/database";

import {
  admin,
  alertasDoProduto,
  clienteAnonimo,
  criarProdutoTeste,
  criarUsuario,
  quantidadeDoProduto,
  removerProduto,
  removerUsuario,
  removerVendas,
  type Cliente,
  type UsuarioTeste,
} from "../helpers/supabase";

/**
 * registrar_venda: venda normal, estoque insuficiente, idempotência, preço do
 * banco, concorrência, alertas e permissões. Requer o Supabase local rodando.
 */

let proprietario: UsuarioTeste;
let funcionario: UsuarioTeste;
let desativado: UsuarioTeste;
const produtosCriados: string[] = [];
const vendasCriadas: string[] = [];

async function novoProduto(campos: Parameters<typeof criarProdutoTeste>[0] = {}) {
  const produto = await criarProdutoTeste(campos);
  produtosCriados.push(produto.id);
  return produto;
}

type Item = { produto_id: string; quantidade: number; [extra: string]: unknown };

async function vender(
  cliente: Cliente,
  itens: Item[],
  opcoes: { chave?: string; forma?: "dinheiro" | "pix" | "debito" | "credito" } = {},
) {
  const { data, error } = await cliente.rpc("registrar_venda", {
    p_chave_idempotencia: opcoes.chave ?? randomUUID(),
    p_forma_pagamento: opcoes.forma ?? "pix",
    p_itens: itens as Json,
  });
  if (error) return { error, resultado: null };
  const resultado = esquemaResultadoVenda.parse(data);
  if (!vendasCriadas.includes(resultado.venda_id)) vendasCriadas.push(resultado.venda_id);
  return { error: null, resultado };
}

async function contarVendasComChave(chave: string) {
  const { count } = await admin
    .from("vendas")
    .select("id", { count: "exact", head: true })
    .eq("chave_idempotencia", chave);
  return count;
}

beforeAll(async () => {
  [proprietario, funcionario, desativado] = await Promise.all([
    criarUsuario("proprietario"),
    criarUsuario("funcionario"),
    criarUsuario("funcionario", { ativo: false }),
  ]);
});

afterAll(async () => {
  await removerVendas(vendasCriadas);
  for (const id of produtosCriados) await removerProduto(id);
  await Promise.all(
    [proprietario, funcionario, desativado].filter(Boolean).map((u) => removerUsuario(u.id)),
  );
});

describe("venda normal", () => {
  it("grava venda e itens com preços do banco, baixa o estoque e registra movimentações", async () => {
    const arroz = await novoProduto({ quantidade: 30, preco_venda: 24.9, preco_custo: 18.35 });
    const leite = await novoProduto({ quantidade: 40, preco_venda: 5.49, preco_custo: 3.9 });

    const { error, resultado } = await vender(
      funcionario.cliente,
      [
        { produto_id: arroz.id, quantidade: 2 },
        { produto_id: leite.id, quantidade: 3 },
      ],
      { forma: "dinheiro" },
    );
    expect(error).toBeNull();
    expect(resultado!.ja_registrada).toBe(false);
    // 2 × 24,90 + 3 × 5,49 = 49,80 + 16,47 = 66,27
    expect(Number(resultado!.total)).toBe(66.27);

    const { data: venda } = await admin
      .from("vendas")
      .select("*, itens_venda(*)")
      .eq("id", resultado!.venda_id)
      .single();
    expect(venda).toMatchObject({
      forma_pagamento: "dinheiro",
      status: "concluida",
      total: 66.27,
      // 2 × 18,35 + 3 × 3,90 = 36,70 + 11,70 = 48,40
      custo_total: 48.4,
      operador_id: funcionario.id,
    });
    expect(venda!.itens_venda).toHaveLength(2);
    const itemArroz = venda!.itens_venda.find((i) => i.produto_id === arroz.id);
    expect(itemArroz).toMatchObject({
      quantidade: 2,
      preco_unitario: 24.9,
      custo_unitario: 18.35,
      subtotal: 49.8,
    });

    expect(await quantidadeDoProduto(arroz.id)).toBe(28);
    expect(await quantidadeDoProduto(leite.id)).toBe(37);

    const { data: movs } = await admin
      .from("movimentacoes_estoque")
      .select("*")
      .eq("venda_id", resultado!.venda_id);
    expect(movs).toHaveLength(2);
    expect(movs!.find((m) => m.produto_id === arroz.id)).toMatchObject({
      tipo: "venda",
      quantidade: 2,
      quantidade_anterior: 30,
      quantidade_posterior: 28,
      usuario_id: funcionario.id,
    });
  });

  it("usa o preço do banco e ignora preço enviado pelo navegador", async () => {
    const produto = await novoProduto({ quantidade: 20, preco_venda: 10, preco_custo: 6 });

    const { resultado } = await vender(funcionario.cliente, [
      { produto_id: produto.id, quantidade: 1, preco_unitario: 0.01, preco_venda: 0.01, subtotal: 0.01 },
    ]);
    expect(Number(resultado!.total)).toBe(10);

    const { data: item } = await admin
      .from("itens_venda")
      .select("preco_unitario, custo_unitario")
      .eq("venda_id", resultado!.venda_id)
      .single();
    expect(item).toEqual({ preco_unitario: 10, custo_unitario: 6 });
  });

  it("soma o mesmo produto repetido numa linha só", async () => {
    const produto = await novoProduto({ quantidade: 20 });
    const { resultado } = await vender(proprietario.cliente, [
      { produto_id: produto.id, quantidade: 2 },
      { produto_id: produto.id, quantidade: 3 },
    ]);

    const { data: itens } = await admin
      .from("itens_venda")
      .select("quantidade")
      .eq("venda_id", resultado!.venda_id);
    expect(itens).toEqual([{ quantidade: 5 }]);
    expect(await quantidadeDoProduto(produto.id)).toBe(15);
  });
});

describe("venda recusada (nada é gravado)", () => {
  it("estoque insuficiente cancela a venda inteira e informa o produto", async () => {
    const bom = await novoProduto({ quantidade: 20 });
    const pouco = await novoProduto({ nome: "Café Pilão teste", quantidade: 2, unidade: "un" });
    const chave = randomUUID();

    const { error } = await vender(
      funcionario.cliente,
      [
        { produto_id: bom.id, quantidade: 1 },
        { produto_id: pouco.id, quantidade: 3 },
      ],
      { chave },
    );

    expect(error?.code).toBe("P0001");
    expect(error?.message).toBe("Estoque insuficiente de Café Pilão teste: há 2 un em estoque.");
    expect(await contarVendasComChave(chave)).toBe(0);
    expect(await quantidadeDoProduto(bom.id)).toBe(20);
    expect(await quantidadeDoProduto(pouco.id)).toBe(2);

    const { count } = await admin
      .from("movimentacoes_estoque")
      .select("id", { count: "exact", head: true })
      .in("produto_id", [bom.id, pouco.id]);
    expect(count).toBe(0);
  });

  it("produto desativado não pode ser vendido", async () => {
    const produto = await novoProduto({ nome: "Inativo teste", quantidade: 20, ativo: false });
    const { error } = await vender(funcionario.cliente, [{ produto_id: produto.id, quantidade: 1 }]);
    expect(error?.code).toBe("P0001");
    expect(error?.message).toContain("Inativo teste está desativado");
    expect(await quantidadeDoProduto(produto.id)).toBe(20);
  });

  it.each([
    ["sem itens", []],
    ["quantidade zero", [{ produto_id: randomUUID(), quantidade: 0 }]],
    ["quantidade não numérica", [{ produto_id: randomUUID(), quantidade: "dez" }]],
    ["produto inexistente", [{ produto_id: randomUUID(), quantidade: 1 }]],
  ])("%s", async (_caso, itens) => {
    const chave = randomUUID();
    const { error } = await vender(funcionario.cliente, itens as Item[], { chave });
    expect(error?.code).toBe("P0001");
    expect(await contarVendasComChave(chave)).toBe(0);
  });
});

describe("idempotência", () => {
  it("a mesma chave não duplica a venda nem baixa o estoque duas vezes", async () => {
    const produto = await novoProduto({ quantidade: 20, preco_venda: 3 });
    const chave = randomUUID();
    const itens = [{ produto_id: produto.id, quantidade: 4 }];

    const primeira = await vender(funcionario.cliente, itens, { chave });
    const segunda = await vender(funcionario.cliente, itens, { chave });

    expect(segunda.resultado).toMatchObject({
      venda_id: primeira.resultado!.venda_id,
      ja_registrada: true,
    });
    expect(Number(segunda.resultado!.total)).toBe(12);
    expect(await contarVendasComChave(chave)).toBe(1);
    expect(await quantidadeDoProduto(produto.id)).toBe(16);
  });

  it("dois envios simultâneos com a mesma chave geram uma venda só", async () => {
    const produto = await novoProduto({ quantidade: 20 });
    const chave = randomUUID();
    const itens = [{ produto_id: produto.id, quantidade: 1 }];

    const respostas = await Promise.all([
      vender(funcionario.cliente, itens, { chave }),
      vender(funcionario.cliente, itens, { chave }),
      vender(funcionario.cliente, itens, { chave }),
    ]);

    expect(respostas.every((r) => r.error === null)).toBe(true);
    expect(new Set(respostas.map((r) => r.resultado!.venda_id)).size).toBe(1);
    expect(await contarVendasComChave(chave)).toBe(1);
    expect(await quantidadeDoProduto(produto.id)).toBe(19);
  });
});

describe("concorrência", () => {
  it("duas vendas disputando as últimas unidades: só uma passa", async () => {
    const produto = await novoProduto({ quantidade: 6 });
    const itens = [{ produto_id: produto.id, quantidade: 5 }];

    const [a, b] = await Promise.all([
      vender(funcionario.cliente, itens),
      vender(proprietario.cliente, itens),
    ]);

    expect([a.error, b.error].filter(Boolean)).toHaveLength(1);
    expect(await quantidadeDoProduto(produto.id)).toBe(1);
  });
});

describe("alertas criados pela venda", () => {
  it("abre alerta ao cruzar o mínimo e devolve o id; a próxima venda não duplica", async () => {
    const produto = await novoProduto({ quantidade: 12, estoque_minimo: 10 });
    const outro = await novoProduto({ quantidade: 50 });

    const primeira = await vender(funcionario.cliente, [
      { produto_id: produto.id, quantidade: 3 },
      { produto_id: outro.id, quantidade: 1 },
    ]);
    const alertas = await alertasDoProduto(produto.id);
    expect(alertas).toHaveLength(1);
    expect(alertas[0]).toMatchObject({ quantidade_no_alerta: 9, estoque_minimo_no_alerta: 10 });
    expect(primeira.resultado!.alertas).toEqual([alertas[0].id]);

    const segunda = await vender(funcionario.cliente, [{ produto_id: produto.id, quantidade: 1 }]);
    expect(segunda.resultado!.alertas).toEqual([]);
    expect(await alertasDoProduto(produto.id)).toHaveLength(1);
  });

  it("venda acima do mínimo não cria alerta", async () => {
    const produto = await novoProduto({ quantidade: 30, estoque_minimo: 10 });
    const { resultado } = await vender(funcionario.cliente, [{ produto_id: produto.id, quantidade: 5 }]);
    expect(resultado!.alertas).toEqual([]);
    expect(await alertasDoProduto(produto.id)).toHaveLength(0);
  });
});

describe("permissões", () => {
  it("anônimo não registra venda", async () => {
    const produto = await novoProduto({ quantidade: 20 });
    const { error } = await vender(clienteAnonimo(), [{ produto_id: produto.id, quantidade: 1 }]);
    expect(error?.code).toBe("42501");
    expect(await quantidadeDoProduto(produto.id)).toBe(20);
  });

  it("usuário desativado não registra venda", async () => {
    const produto = await novoProduto({ quantidade: 20 });
    const { error } = await vender(desativado.cliente, [{ produto_id: produto.id, quantidade: 1 }]);
    expect(error?.code).toBe("42501");
    expect(await quantidadeDoProduto(produto.id)).toBe(20);
  });

  it("funcionário vende, mas não lê a venda (ela tem custo)", async () => {
    const produto = await novoProduto({ quantidade: 20 });
    const { resultado } = await vender(funcionario.cliente, [{ produto_id: produto.id, quantidade: 1 }]);

    const { data } = await funcionario.cliente.from("vendas").select("*").eq("id", resultado!.venda_id);
    expect(data).toEqual([]);
  });
});
