import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  admin,
  clienteAnonimo,
  criarProdutoTeste,
  criarUsuario,
  removerProduto,
  removerUsuario,
  removerVendas,
  type UsuarioTeste,
} from "../helpers/supabase";

/**
 * Funções SQL do painel. As vendas de teste ficam em 2020, longe dos dados
 * reais e da demonstração, e os intervalos consultados cobrem só esse ano.
 * Requer o Supabase local rodando.
 */

let proprietario: UsuarioTeste;
let funcionario: UsuarioTeste;
let produtoA: string;
let produtoB: string;
const vendas: string[] = [];

const INICIO = "2020-03-01T03:00:00.000Z"; // 01/03/2020 00h em São Paulo
const FIM = "2020-04-01T03:00:00.000Z"; // 01/04/2020 00h em São Paulo

/** Insere uma venda já pronta (como o histórico da demonstração). */
async function venda(opcoes: {
  em: string;
  itens: { produto: string; quantidade: number; preco: number; custo: number }[];
  forma?: "dinheiro" | "pix" | "debito" | "credito";
  cancelada?: boolean;
}) {
  const total = opcoes.itens.reduce((s, i) => s + Math.round(i.preco * 100) * i.quantidade, 0) / 100;
  const custo = opcoes.itens.reduce((s, i) => s + Math.round(i.custo * 100) * i.quantidade, 0) / 100;
  const { data, error } = await admin
    .from("vendas")
    .insert({
      chave_idempotencia: randomUUID(),
      forma_pagamento: opcoes.forma ?? "pix",
      total,
      custo_total: custo,
      operador_id: proprietario.id,
      created_at: opcoes.em,
      ...(opcoes.cancelada
        ? {
            status: "cancelada" as const,
            cancelada_por: proprietario.id,
            cancelada_em: opcoes.em,
            motivo_cancelamento: "teste",
          }
        : {}),
    })
    .select("id")
    .single();
  if (error) throw error;
  vendas.push(data.id);

  const { error: erroItens } = await admin.from("itens_venda").insert(
    opcoes.itens.map((i) => ({
      venda_id: data.id,
      produto_id: i.produto,
      quantidade: i.quantidade,
      preco_unitario: i.preco,
      custo_unitario: i.custo,
      subtotal: Math.round(i.preco * 100 * i.quantidade) / 100,
    })),
  );
  if (erroItens) throw erroItens;
}

beforeAll(async () => {
  [proprietario, funcionario] = await Promise.all([
    criarUsuario("proprietario"),
    criarUsuario("funcionario"),
  ]);
  produtoA = (await criarProdutoTeste({ nome: "Indicador A" })).id;
  produtoB = (await criarProdutoTeste({ nome: "Indicador B" })).id;

  // 05/03: duas vendas válidas e uma cancelada.
  await venda({
    em: "2020-03-05T13:00:00.000Z",
    forma: "pix",
    itens: [{ produto: produtoA, quantidade: 2, preco: 10, custo: 6 }],
  });
  await venda({
    em: "2020-03-05T15:00:00.000Z",
    forma: "dinheiro",
    itens: [
      { produto: produtoA, quantidade: 1, preco: 10, custo: 6 },
      { produto: produtoB, quantidade: 3, preco: 2.5, custo: 1 },
    ],
  });
  await venda({
    em: "2020-03-05T16:00:00.000Z",
    forma: "credito",
    cancelada: true,
    itens: [{ produto: produtoB, quantidade: 100, preco: 2.5, custo: 1 }],
  });
  // 31/03 às 22h em São Paulo (= 01/04 01h UTC): pertence ao dia 31 e a março.
  await venda({
    em: "2020-04-01T01:00:00.000Z",
    forma: "debito",
    itens: [{ produto: produtoB, quantidade: 4, preco: 2.5, custo: 1 }],
  });
});

afterAll(async () => {
  await removerVendas(vendas);
  for (const id of [produtoA, produtoB].filter(Boolean)) await removerProduto(id);
  await Promise.all([proprietario, funcionario].filter(Boolean).map((u) => removerUsuario(u.id)));
});

describe("resumo_vendas", () => {
  it("soma faturamento, custo e lucro sem as canceladas", async () => {
    const { data, error } = await proprietario.cliente.rpc("resumo_vendas", {
      p_inicio: INICIO,
      p_fim: FIM,
    });
    expect(error).toBeNull();
    // Válidas: 20,00 + 17,50 + 10,00 = 47,50. Custo: 12 + 9 + 4 = 25. Cancelada fora.
    expect(data).toEqual([
      { faturamento: 47.5, custo: 25, lucro_bruto: 22.5, quantidade_vendas: 3, ticket_medio: 15.83 },
    ]);
  });

  it("período sem vendas devolve zeros (sem divisão por zero)", async () => {
    const { data } = await proprietario.cliente.rpc("resumo_vendas", {
      p_inicio: "2019-01-01T03:00:00.000Z",
      p_fim: "2019-01-02T03:00:00.000Z",
    });
    expect(data).toEqual([
      { faturamento: 0, custo: 0, lucro_bruto: 0, quantidade_vendas: 0, ticket_medio: 0 },
    ]);
  });
});

describe("faturamento_por_dia", () => {
  it("um registro por dia do mês, agrupado no fuso de São Paulo", async () => {
    const { data } = await proprietario.cliente.rpc("faturamento_por_dia", {
      p_inicio: INICIO,
      p_fim: FIM,
    });
    expect(data).toHaveLength(31);
    expect(data!.find((d) => d.dia === "2020-03-05")).toMatchObject({
      faturamento: 37.5,
      quantidade_vendas: 2,
    });
    // A venda das 22h do dia 31 está no dia 31, não em 01/04.
    expect(data!.at(-1)).toEqual({ dia: "2020-03-31", faturamento: 10, quantidade_vendas: 1 });
    expect(data!.find((d) => d.dia === "2020-03-06")?.faturamento).toBe(0);
  });
});

describe("faturamento_por_mes", () => {
  it("6 meses até o mês de referência, março com a venda do dia 31 às 22h", async () => {
    const { data } = await proprietario.cliente.rpc("faturamento_por_mes", {
      p_referencia: "2020-04-15T12:00:00.000Z",
      p_meses: 6,
    });
    expect(data!.map((m) => m.mes)).toEqual([
      "2019-11-01",
      "2019-12-01",
      "2020-01-01",
      "2020-02-01",
      "2020-03-01",
      "2020-04-01",
    ]);
    expect(data!.find((m) => m.mes === "2020-03-01")).toMatchObject({ faturamento: 47.5, quantidade_vendas: 3 });
    expect(data!.find((m) => m.mes === "2020-04-01")?.faturamento).toBe(0);
  });
});

describe("top_produtos e vendas_por_forma", () => {
  it("ordena por quantidade vendida e ignora a cancelada", async () => {
    const { data } = await proprietario.cliente.rpc("top_produtos", {
      p_inicio: INICIO,
      p_fim: FIM,
      p_limite: 10,
    });
    expect(data!.map((p) => [p.nome, p.quantidade, p.faturamento])).toEqual([
      ["Indicador B", 7, 17.5], // 3 + 4 (os 100 da cancelada não contam)
      ["Indicador A", 3, 30],
    ]);
  });

  it("lista as 4 formas, inclusive sem venda", async () => {
    const { data } = await proprietario.cliente.rpc("vendas_por_forma", {
      p_inicio: INICIO,
      p_fim: FIM,
    });
    expect(data).toEqual([
      { forma_pagamento: "dinheiro", quantidade_vendas: 1, faturamento: 17.5 },
      { forma_pagamento: "pix", quantidade_vendas: 1, faturamento: 20 },
      { forma_pagamento: "debito", quantidade_vendas: 1, faturamento: 10 },
      { forma_pagamento: "credito", quantidade_vendas: 0, faturamento: 0 },
    ]);
  });
});

describe("permissões", () => {
  it.each(["resumo_vendas", "faturamento_por_dia", "top_produtos", "vendas_por_forma"] as const)(
    "funcionário não executa %s",
    async (funcao) => {
      const { error } = await funcionario.cliente.rpc(funcao, { p_inicio: INICIO, p_fim: FIM });
      expect(error?.code).toBe("42501");
    },
  );

  it("anônimo não executa", async () => {
    const { error } = await clienteAnonimo().rpc("resumo_vendas", { p_inicio: INICIO, p_fim: FIM });
    expect(error?.code).toBe("42501");
  });
});
