import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  admin,
  alertasDoProduto,
  clienteAnonimo,
  criarProdutoTeste,
  criarUsuario,
  quantidadeDoProduto,
  removerProduto,
  removerUsuario,
  type UsuarioTeste,
} from "../helpers/supabase";

/**
 * Movimentações de estoque, cadastro com estoque inicial e ciclo de alertas,
 * testados direto nas funções do banco. Requer o Supabase local rodando.
 */

let proprietario: UsuarioTeste;
let funcionario: UsuarioTeste;
const produtosCriados: string[] = [];

async function novoProduto(campos: Parameters<typeof criarProdutoTeste>[0] = {}) {
  const produto = await criarProdutoTeste(campos);
  produtosCriados.push(produto.id);
  return produto;
}

async function movimentacoesDo(produtoId: string) {
  const { data, error } = await admin
    .from("movimentacoes_estoque")
    .select("*")
    .eq("produto_id", produtoId)
    .order("created_at");
  if (error) throw error;
  return data;
}

beforeAll(async () => {
  [proprietario, funcionario] = await Promise.all([
    criarUsuario("proprietario"),
    criarUsuario("funcionario"),
  ]);
});

afterAll(async () => {
  // Produtos (e suas movimentações) antes dos usuários: a movimentação
  // referencia o usuário e impediria a exclusão.
  for (const id of produtosCriados) await removerProduto(id);
  await Promise.all([proprietario, funcionario].filter(Boolean).map((u) => removerUsuario(u.id)));
});

describe("movimentações manuais", () => {
  it("entrada soma ao estoque e registra a movimentação", async () => {
    const produto = await novoProduto({ quantidade: 20 });

    const { data: movId, error } = await proprietario.cliente.rpc("registrar_entrada", {
      p_produto_id: produto.id,
      p_quantidade: 15,
      p_motivo: "NF 123",
    });

    expect(error).toBeNull();
    expect(await quantidadeDoProduto(produto.id)).toBe(35);

    const [mov] = await movimentacoesDo(produto.id);
    expect(mov).toMatchObject({
      id: movId,
      tipo: "entrada",
      quantidade: 15,
      quantidade_anterior: 20,
      quantidade_posterior: 35,
      usuario_id: proprietario.id,
      motivo: "NF 123",
    });
  });

  it("saída manual subtrai e exige motivo", async () => {
    const produto = await novoProduto({ quantidade: 20 });

    const semMotivo = await proprietario.cliente.rpc("registrar_saida_manual", {
      p_produto_id: produto.id,
      p_quantidade: 2,
      p_motivo: "   ",
    });
    expect(semMotivo.error?.code).toBe("P0001");
    expect(semMotivo.error?.message).toBe("Informe o motivo da saída.");

    const { error } = await proprietario.cliente.rpc("registrar_saida_manual", {
      p_produto_id: produto.id,
      p_quantidade: 2,
      p_motivo: "Vencido",
    });
    expect(error).toBeNull();
    expect(await quantidadeDoProduto(produto.id)).toBe(18);

    const movs = await movimentacoesDo(produto.id);
    expect(movs).toHaveLength(1);
    expect(movs[0]).toMatchObject({ tipo: "saida_manual", quantidade: 2, motivo: "Vencido" });
  });

  it("saída nunca deixa o estoque negativo (e nada é gravado)", async () => {
    const produto = await novoProduto({ nome: "Leite Integral teste", quantidade: 3, unidade: "un" });

    const { error } = await proprietario.cliente.rpc("registrar_saida_manual", {
      p_produto_id: produto.id,
      p_quantidade: 4,
      p_motivo: "Quebra",
    });

    expect(error?.code).toBe("P0001");
    expect(error?.message).toBe("Estoque insuficiente de Leite Integral teste: há 3 un em estoque.");
    expect(await quantidadeDoProduto(produto.id)).toBe(3);
    expect(await movimentacoesDo(produto.id)).toHaveLength(0);
  });

  it("ajuste define o novo total, exige motivo e recusa total igual ao atual", async () => {
    const produto = await novoProduto({ quantidade: 20 });

    const semMotivo = await proprietario.cliente.rpc("registrar_ajuste", {
      p_produto_id: produto.id,
      p_nova_quantidade: 17,
      p_motivo: "",
    });
    expect(semMotivo.error?.code).toBe("P0001");

    const igual = await proprietario.cliente.rpc("registrar_ajuste", {
      p_produto_id: produto.id,
      p_nova_quantidade: 20,
      p_motivo: "Contagem",
    });
    expect(igual.error?.code).toBe("P0001");

    const { error } = await proprietario.cliente.rpc("registrar_ajuste", {
      p_produto_id: produto.id,
      p_nova_quantidade: 17,
      p_motivo: "Contagem do mês",
    });
    expect(error).toBeNull();
    expect(await quantidadeDoProduto(produto.id)).toBe(17);

    const movs = await movimentacoesDo(produto.id);
    expect(movs).toHaveLength(1);
    expect(movs[0]).toMatchObject({
      tipo: "ajuste",
      quantidade: 17,
      quantidade_anterior: 20,
      quantidade_posterior: 17,
    });
  });

  it("recusa quantidade zero ou negativa na entrada", async () => {
    const produto = await novoProduto();
    const { error } = await proprietario.cliente.rpc("registrar_entrada", {
      p_produto_id: produto.id,
      p_quantidade: 0,
    });
    expect(error?.code).toBe("P0001");
  });

  it("produto inexistente gera erro amigável", async () => {
    const { error } = await proprietario.cliente.rpc("registrar_entrada", {
      p_produto_id: crypto.randomUUID(),
      p_quantidade: 1,
    });
    expect(error?.code).toBe("P0001");
    expect(error?.message).toBe("Produto não encontrado.");
  });

  it("toda alteração de estoque gera movimentação com saldo encadeado", async () => {
    const produto = await novoProduto({ quantidade: 20 });
    const rpc = proprietario.cliente.rpc.bind(proprietario.cliente);

    await rpc("registrar_entrada", { p_produto_id: produto.id, p_quantidade: 5 });
    await rpc("registrar_saida_manual", { p_produto_id: produto.id, p_quantidade: 3, p_motivo: "Perda" });
    await rpc("registrar_ajuste", { p_produto_id: produto.id, p_nova_quantidade: 30, p_motivo: "Contagem" });

    const movs = await movimentacoesDo(produto.id);
    expect(movs.map((m) => [m.quantidade_anterior, m.quantidade_posterior])).toEqual([
      [20, 25],
      [25, 22],
      [22, 30],
    ]);
    expect(await quantidadeDoProduto(produto.id)).toBe(30);
  });
});

describe("permissões das movimentações", () => {
  it("funcionário não registra entrada, saída nem ajuste", async () => {
    const produto = await novoProduto({ quantidade: 20 });

    const chamadas = [
      funcionario.cliente.rpc("registrar_entrada", { p_produto_id: produto.id, p_quantidade: 5 }),
      funcionario.cliente.rpc("registrar_saida_manual", {
        p_produto_id: produto.id,
        p_quantidade: 5,
        p_motivo: "x",
      }),
      funcionario.cliente.rpc("registrar_ajuste", {
        p_produto_id: produto.id,
        p_nova_quantidade: 0,
        p_motivo: "x",
      }),
    ];

    for (const { error } of await Promise.all(chamadas)) {
      expect(error?.code).toBe("42501");
    }
    expect(await quantidadeDoProduto(produto.id)).toBe(20);
    expect(await movimentacoesDo(produto.id)).toHaveLength(0);
  });

  it("anônimo não executa as funções", async () => {
    const produto = await novoProduto({ quantidade: 20 });
    const { error } = await clienteAnonimo().rpc("registrar_entrada", {
      p_produto_id: produto.id,
      p_quantidade: 5,
    });
    expect(error?.code).toBe("42501");
    expect(await quantidadeDoProduto(produto.id)).toBe(20);
  });

  it("funções internas não podem ser chamadas pela API", async () => {
    const produto = await novoProduto({ quantidade: 20 });
    const { error } = await proprietario.cliente.rpc(
      "aplicar_movimentacao" as "registrar_entrada",
      { p_produto_id: produto.id, p_tipo: "entrada", p_quantidade: 1000 } as never,
    );
    expect(error).not.toBeNull();
    expect(await quantidadeDoProduto(produto.id)).toBe(20);
  });
});

describe("cadastro de produto", () => {
  it("com estoque inicial registra uma entrada 'Estoque inicial'", async () => {
    const { data: id, error } = await proprietario.cliente.rpc("cadastrar_produto", {
      p_nome: "  Café Torrado 500 g teste  ",
      p_preco_venda: "18.90" as unknown as number,
      p_preco_custo: "12.35" as unknown as number,
      p_codigo_barras: "",
      p_estoque_inicial: 24,
    });
    expect(error).toBeNull();
    produtosCriados.push(id!);

    const { data: produto } = await admin.from("produtos").select("*").eq("id", id!).single();
    expect(produto).toMatchObject({
      nome: "Café Torrado 500 g teste",
      quantidade: 24,
      preco_venda: 18.9,
      preco_custo: 12.35,
      codigo_barras: null,
      estoque_minimo: 10,
    });

    const movs = await movimentacoesDo(id!);
    expect(movs).toHaveLength(1);
    expect(movs[0]).toMatchObject({
      tipo: "entrada",
      quantidade: 24,
      quantidade_anterior: 0,
      quantidade_posterior: 24,
      motivo: "Estoque inicial",
      usuario_id: proprietario.id,
    });
    expect(await alertasDoProduto(id!)).toHaveLength(0);
  });

  it("sem estoque inicial nasce com zero, sem movimentação e com alerta aberto", async () => {
    const { data: id, error } = await proprietario.cliente.rpc("cadastrar_produto", {
      p_nome: "Produto zerado teste",
      p_preco_venda: 5,
    });
    expect(error).toBeNull();
    produtosCriados.push(id!);

    expect(await quantidadeDoProduto(id!)).toBe(0);
    expect(await movimentacoesDo(id!)).toHaveLength(0);
    const alertas = await alertasDoProduto(id!);
    expect(alertas).toHaveLength(1);
    expect(alertas[0]).toMatchObject({ quantidade_no_alerta: 0, status: "pendente" });
  });

  it("funcionário não cadastra produto", async () => {
    const { error } = await funcionario.cliente.rpc("cadastrar_produto", {
      p_nome: "Invasor",
      p_preco_venda: 1,
    });
    expect(error?.code).toBe("42501");
  });

  it("código de barras repetido é recusado", async () => {
    const codigo = `789${Date.now()}`;
    await novoProduto({ codigo_barras: codigo });
    const { error } = await proprietario.cliente.rpc("cadastrar_produto", {
      p_nome: "Duplicado",
      p_preco_venda: 1,
      p_codigo_barras: codigo,
    });
    expect(error?.code).toBe("23505");
    expect(error?.message).toContain("produtos_codigo_barras_unico");
  });

  it("busca ignora acentos e maiúsculas, e acompanha a edição do nome", async () => {
    const produto = await novoProduto({ nome: "Feijão Preto teste", codigo_barras: `11${Date.now()}` });

    const { data } = await proprietario.cliente
      .from("produtos_catalogo")
      .select("id")
      .like("busca", "%feijao preto%");
    expect(data?.map((p) => p.id)).toContain(produto.id);

    const { error } = await proprietario.cliente
      .from("produtos")
      .update({ nome: "Açúcar Cristal teste" })
      .eq("id", produto.id);
    expect(error).toBeNull();

    const { data: depois } = await proprietario.cliente
      .from("produtos_catalogo")
      .select("busca")
      .eq("id", produto.id)
      .single();
    expect(depois?.busca).toContain("acucar cristal teste");
  });
});

describe("alertas de estoque", () => {
  it("abre ao chegar no mínimo, não duplica e reabre após reposição", async () => {
    const produto = await novoProduto({ quantidade: 12, estoque_minimo: 10 });
    const saida = (q: number) =>
      proprietario.cliente.rpc("registrar_saida_manual", {
        p_produto_id: produto.id,
        p_quantidade: q,
        p_motivo: "Teste",
      });

    await saida(1); // 11: acima do mínimo
    expect(await alertasDoProduto(produto.id)).toHaveLength(0);

    await saida(1); // 10: chegou no mínimo
    let alertas = await alertasDoProduto(produto.id);
    expect(alertas).toHaveLength(1);
    expect(alertas[0]).toMatchObject({
      quantidade_no_alerta: 10,
      estoque_minimo_no_alerta: 10,
      status: "pendente",
      resolvido_em: null,
    });

    await saida(3); // 7: continua baixo, não duplica
    expect(await alertasDoProduto(produto.id)).toHaveLength(1);

    await proprietario.cliente.rpc("registrar_entrada", {
      p_produto_id: produto.id,
      p_quantidade: 20,
    }); // 27: reposto, resolve
    alertas = await alertasDoProduto(produto.id);
    expect(alertas).toHaveLength(1);
    expect(alertas[0].resolvido_em).not.toBeNull();

    await saida(20); // 7: novo ciclo
    alertas = await alertasDoProduto(produto.id);
    expect(alertas).toHaveLength(2);
    expect(alertas[1]).toMatchObject({ quantidade_no_alerta: 7, resolvido_em: null });
  });

  it("ajuste para baixo abre alerta e ajuste para cima resolve", async () => {
    const produto = await novoProduto({ quantidade: 30 });
    const ajuste = (n: number) =>
      proprietario.cliente.rpc("registrar_ajuste", {
        p_produto_id: produto.id,
        p_nova_quantidade: n,
        p_motivo: "Contagem",
      });

    await ajuste(5);
    expect((await alertasDoProduto(produto.id))[0]?.resolvido_em).toBeNull();

    await ajuste(40);
    expect((await alertasDoProduto(produto.id))[0]?.resolvido_em).not.toBeNull();
  });

  it("subir o estoque mínimo acima da quantidade abre alerta na hora", async () => {
    const produto = await novoProduto({ quantidade: 15, estoque_minimo: 10 });

    const { error } = await proprietario.cliente
      .from("produtos")
      .update({ estoque_minimo: 20 })
      .eq("id", produto.id);
    expect(error).toBeNull();

    const alertas = await alertasDoProduto(produto.id);
    expect(alertas).toHaveLength(1);
    expect(alertas[0]).toMatchObject({ quantidade_no_alerta: 15, estoque_minimo_no_alerta: 20 });

    // Baixar o mínimo de novo resolve o alerta.
    await proprietario.cliente.from("produtos").update({ estoque_minimo: 10 }).eq("id", produto.id);
    expect((await alertasDoProduto(produto.id))[0].resolvido_em).not.toBeNull();
  });

  it("editar outros campos não mexe nos alertas", async () => {
    const produto = await novoProduto({ quantidade: 5, estoque_minimo: 10 });
    expect(await alertasDoProduto(produto.id)).toHaveLength(1);

    await proprietario.cliente
      .from("produtos")
      .update({ preco_venda: 9.99, estoque_minimo: 10 })
      .eq("id", produto.id);
    expect(await alertasDoProduto(produto.id)).toHaveLength(1);
  });

  it("produto desativado não abre alerta", async () => {
    const produto = await novoProduto({ quantidade: 20, ativo: false });
    await proprietario.cliente.rpc("registrar_saida_manual", {
      p_produto_id: produto.id,
      p_quantidade: 18,
      p_motivo: "Teste",
    });
    expect(await alertasDoProduto(produto.id)).toHaveLength(0);
  });
});
