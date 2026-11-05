import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  admin,
  clienteAnonimo,
  criarProdutoTeste,
  criarUsuario,
  removerProduto,
  removerUsuario,
  type UsuarioTeste,
} from "../helpers/supabase";

/**
 * Permissões garantidas pelo banco (RLS + privilégios), independentemente da
 * interface. Requer o Supabase local rodando.
 */

let proprietario: UsuarioTeste;
let funcionario: UsuarioTeste;
let desativado: UsuarioTeste;
let produtoId: string;

beforeAll(async () => {
  [proprietario, funcionario, desativado] = await Promise.all([
    criarUsuario("proprietario"),
    criarUsuario("funcionario"),
    criarUsuario("funcionario", { ativo: false }),
  ]);
  produtoId = (await criarProdutoTeste()).id;
});

afterAll(async () => {
  if (produtoId) await removerProduto(produtoId);
  await Promise.all(
    [proprietario, funcionario, desativado]
      .filter(Boolean)
      .map((u) => removerUsuario(u.id)),
  );
});

describe("anônimo", () => {
  const tabelas = [
    "perfis",
    "categorias",
    "produtos",
    "produtos_catalogo",
    "vendas",
    "itens_venda",
    "movimentacoes_estoque",
    "alertas_estoque",
    "configuracoes",
  ] as const;

  it.each(tabelas)("não lê %s", async (tabela) => {
    const { data, error } = await clienteAnonimo()
      .from(tabela as "perfis") // laço mistura tabelas e view; o tipo exato não importa aqui
      .select("*");
    // Sem privilégio nenhum: o Postgres nega o acesso.
    expect(error?.code).toBe("42501");
    expect(data).toBeNull();
  });
});

describe("funcionário", () => {
  it("não lê a tabela produtos (que tem preço de custo)", async () => {
    const { data, error } = await funcionario.cliente.from("produtos").select("*");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("lê o catálogo, que não tem coluna de custo", async () => {
    const { data, error } = await funcionario.cliente
      .from("produtos_catalogo")
      .select("*")
      .eq("id", produtoId)
      .single();
    expect(error).toBeNull();
    expect(data?.preco_venda).toBe(4.99);
    expect(data).not.toHaveProperty("preco_custo");
  });

  it("não consegue pedir preco_custo ao catálogo", async () => {
    const { error } = await funcionario.cliente
      .from("produtos_catalogo")
      .select("preco_custo" as "id");
    expect(error).not.toBeNull();
  });

  it("não cria produto", async () => {
    const { error } = await funcionario.cliente
      .from("produtos")
      .insert({ nome: "Invasor", preco_venda: 1 });
    expect(error?.code).toBe("42501");
  });

  it("não altera produto", async () => {
    const { data } = await funcionario.cliente
      .from("produtos")
      .update({ preco_venda: 0.01 })
      .eq("id", produtoId)
      .select();
    expect(data ?? []).toEqual([]);

    const { data: produto } = await admin
      .from("produtos")
      .select("preco_venda")
      .eq("id", produtoId)
      .single();
    expect(produto?.preco_venda).toBe(4.99);
  });

  it("não cria categoria", async () => {
    const { error } = await funcionario.cliente.from("categorias").insert({ nome: "Invasora" });
    expect(error?.code).toBe("42501");
  });

  it("não lê vendas, movimentações, alertas nem configurações", async () => {
    for (const tabela of [
      "vendas",
      "itens_venda",
      "movimentacoes_estoque",
      "alertas_estoque",
      "configuracoes",
    ] as const) {
      const { data, error } = await funcionario.cliente.from(tabela).select("*");
      expect(error, tabela).toBeNull();
      expect(data, tabela).toEqual([]);
    }
  });

  it("não consegue se promover a proprietário", async () => {
    const { error } = await funcionario.cliente
      .from("perfis")
      .update({ papel: "proprietario" })
      .eq("id", funcionario.id);
    expect(error?.code).toBe("42501");

    const { data } = await admin.from("perfis").select("papel").eq("id", funcionario.id).single();
    expect(data?.papel).toBe("funcionario");
  });

  it("lê apenas o próprio perfil", async () => {
    const { data } = await funcionario.cliente.from("perfis").select("id");
    expect(data).toEqual([{ id: funcionario.id }]);
  });
});

describe("proprietário", () => {
  it("lê a tabela produtos com preço de custo", async () => {
    const { data, error } = await proprietario.cliente
      .from("produtos")
      .select("preco_custo")
      .eq("id", produtoId)
      .single();
    expect(error).toBeNull();
    expect(data?.preco_custo).toBe(2.5);
  });

  it("altera dados do produto", async () => {
    const { error } = await proprietario.cliente
      .from("produtos")
      .update({ estoque_minimo: 5 })
      .eq("id", produtoId);
    expect(error).toBeNull();
  });

  it("NÃO altera quantidade por update direto", async () => {
    const { error } = await proprietario.cliente
      .from("produtos")
      .update({ quantidade: 999 })
      .eq("id", produtoId);
    expect(error?.code).toBe("42501");

    const { data } = await admin.from("produtos").select("quantidade").eq("id", produtoId).single();
    expect(data?.quantidade).toBe(20);
  });

  it("NÃO define quantidade ao criar produto", async () => {
    const { error } = await proprietario.cliente
      .from("produtos")
      .insert({ nome: "Com estoque", preco_venda: 1, quantidade: 50 });
    expect(error?.code).toBe("42501");
  });

  it("NÃO insere movimentação nem venda diretamente", async () => {
    const { error: erroMov } = await proprietario.cliente.from("movimentacoes_estoque").insert({
      produto_id: produtoId,
      tipo: "entrada",
      quantidade: 1,
      quantidade_anterior: 0,
      quantidade_posterior: 1,
      usuario_id: proprietario.id,
    });
    expect(erroMov?.code).toBe("42501");

    const { error: erroVenda } = await proprietario.cliente.from("vendas").insert({
      chave_idempotencia: crypto.randomUUID(),
      forma_pagamento: "pix",
      total: 1,
      custo_total: 0,
      operador_id: proprietario.id,
    });
    expect(erroVenda?.code).toBe("42501");
  });

  it("lê e altera as configurações", async () => {
    const { data, error } = await proprietario.cliente.from("configuracoes").select("*").single();
    expect(error).toBeNull();
    expect(data?.id).toBe(1);

    const { error: erroUpdate } = await proprietario.cliente
      .from("configuracoes")
      .update({ alertas_ativos: data!.alertas_ativos })
      .eq("id", 1);
    expect(erroUpdate).toBeNull();
  });

  it("lê todos os perfis", async () => {
    const { data } = await proprietario.cliente
      .from("perfis")
      .select("id")
      .in("id", [proprietario.id, funcionario.id]);
    expect(data).toHaveLength(2);
  });
});

describe("usuário desativado", () => {
  it("não lê nada, nem o próprio perfil", async () => {
    for (const tabela of ["perfis", "categorias", "produtos", "produtos_catalogo"] as const) {
      const { data, error } = await desativado.cliente.from(tabela as "perfis").select("*");
      expect(error, tabela).toBeNull();
      expect(data, tabela).toEqual([]);
    }
  });
});

describe("funções nascem fechadas para o anônimo", () => {
  // A recusa tem que vir do PRIVILÉGIO do banco ("permission denied"), e não
  // só da checagem de papel dentro da função: privilégio mínimo.
  it.each([
    ["registrar_venda", { p_chave_idempotencia: crypto.randomUUID(), p_forma_pagamento: "pix", p_itens: [] }],
    ["cancelar_venda", { p_venda_id: crypto.randomUUID(), p_motivo: "x" }],
    ["registrar_entrada", { p_produto_id: crypto.randomUUID(), p_quantidade: 1 }],
    ["cadastrar_produto", { p_nome: "x", p_preco_venda: 1 }],
    ["resumo_vendas", { p_inicio: "2020-01-01T00:00:00Z", p_fim: "2020-01-02T00:00:00Z" }],
    ["eh_proprietario", {}],
  ])("anônimo não executa %s", async (funcao, args) => {
    const { error } = await clienteAnonimo().rpc(funcao as "eh_proprietario", args as never);
    expect(error?.code).toBe("42501");
    expect(error?.message).toMatch(/permission denied for function/);
  });
});
