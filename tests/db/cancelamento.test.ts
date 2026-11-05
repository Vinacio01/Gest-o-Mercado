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
  type UsuarioTeste,
} from "../helpers/supabase";

/**
 * cancelar_venda: devolve o estoque, registra movimentações, não cancela duas
 * vezes, só o proprietário cancela e a venda sai dos indicadores.
 * Requer o Supabase local rodando.
 */

let proprietario: UsuarioTeste;
let funcionario: UsuarioTeste;
const produtos: string[] = [];
const vendas: string[] = [];

async function novoProduto(campos: Parameters<typeof criarProdutoTeste>[0] = {}) {
  const p = await criarProdutoTeste(campos);
  produtos.push(p.id);
  return p;
}

async function vender(itens: { produto_id: string; quantidade: number }[]) {
  const { data, error } = await funcionario.cliente.rpc("registrar_venda", {
    p_chave_idempotencia: randomUUID(),
    p_forma_pagamento: "pix",
    p_itens: itens as Json,
  });
  if (error) throw error;
  const r = esquemaResultadoVenda.parse(data);
  vendas.push(r.venda_id);
  return r.venda_id;
}

const cancelar = (cliente: UsuarioTeste["cliente"], vendaId: string, motivo = "Cliente desistiu") =>
  cliente.rpc("cancelar_venda", { p_venda_id: vendaId, p_motivo: motivo });

beforeAll(async () => {
  [proprietario, funcionario] = await Promise.all([
    criarUsuario("proprietario"),
    criarUsuario("funcionario"),
  ]);
});

afterAll(async () => {
  await removerVendas(vendas);
  for (const id of produtos) await removerProduto(id);
  await Promise.all([proprietario, funcionario].filter(Boolean).map((u) => removerUsuario(u.id)));
});

describe("cancelamento", () => {
  it("marca como cancelada, devolve o estoque e registra as movimentações", async () => {
    const a = await novoProduto({ quantidade: 20 });
    const b = await novoProduto({ quantidade: 30 });
    const venda = await vender([
      { produto_id: a.id, quantidade: 3 },
      { produto_id: b.id, quantidade: 5 },
    ]);
    expect(await quantidadeDoProduto(a.id)).toBe(17);

    const { data, error } = await cancelar(proprietario.cliente, venda, "  Produto registrado errado  ");
    expect(error).toBeNull();
    expect(data).toEqual({ venda_id: venda, itens_devolvidos: 2 });

    expect(await quantidadeDoProduto(a.id)).toBe(20);
    expect(await quantidadeDoProduto(b.id)).toBe(30);

    const { data: v } = await admin.from("vendas").select("*").eq("id", venda).single();
    expect(v).toMatchObject({
      status: "cancelada",
      cancelada_por: proprietario.id,
      motivo_cancelamento: "Produto registrado errado",
    });
    expect(v?.cancelada_em).not.toBeNull();

    const { data: movs } = await admin
      .from("movimentacoes_estoque")
      .select("produto_id, tipo, quantidade, quantidade_anterior, quantidade_posterior, usuario_id")
      .eq("venda_id", venda)
      .eq("tipo", "cancelamento_venda");
    expect(movs).toHaveLength(2);
    expect(movs!.find((m) => m.produto_id === a.id)).toMatchObject({
      quantidade: 3,
      quantidade_anterior: 17,
      quantidade_posterior: 20,
      usuario_id: proprietario.id,
    });
  });

  it("não cancela duas vezes (nem em dois cliques simultâneos)", async () => {
    const p = await novoProduto({ quantidade: 20 });
    const venda = await vender([{ produto_id: p.id, quantidade: 4 }]);

    const [x, y] = await Promise.all([
      cancelar(proprietario.cliente, venda),
      cancelar(proprietario.cliente, venda),
    ]);
    const erros = [x.error, y.error].filter(Boolean);
    expect(erros).toHaveLength(1);
    expect(erros[0]?.message).toBe("Esta venda já foi cancelada.");
    // Devolveu uma vez só: 20 - 4 + 4.
    expect(await quantidadeDoProduto(p.id)).toBe(20);
  });

  it("exige motivo", async () => {
    const p = await novoProduto({ quantidade: 20 });
    const venda = await vender([{ produto_id: p.id, quantidade: 1 }]);
    const { error } = await cancelar(proprietario.cliente, venda, "   ");
    expect(error?.code).toBe("P0001");
    expect(await quantidadeDoProduto(p.id)).toBe(19);
  });

  it("venda inexistente dá erro amigável", async () => {
    const { error } = await cancelar(proprietario.cliente, randomUUID());
    expect(error?.message).toBe("Venda não encontrada.");
  });

  it("funcionário não cancela", async () => {
    const p = await novoProduto({ quantidade: 20 });
    const venda = await vender([{ produto_id: p.id, quantidade: 2 }]);
    const { error } = await cancelar(funcionario.cliente, venda);
    expect(error?.code).toBe("42501");
    expect(await quantidadeDoProduto(p.id)).toBe(18);
    const { data } = await admin.from("vendas").select("status").eq("id", venda).single();
    expect(data?.status).toBe("concluida");
  });

  it("estoque devolvido acima do mínimo resolve o alerta aberto (decisão D)", async () => {
    const p = await novoProduto({ quantidade: 12, estoque_minimo: 10 });
    const venda = await vender([{ produto_id: p.id, quantidade: 5 }]); // 7: abre alerta
    expect((await alertasDoProduto(p.id))[0]?.resolvido_em).toBeNull();

    const { error } = await cancelar(proprietario.cliente, venda); // volta a 12
    expect(error).toBeNull();
    expect((await alertasDoProduto(p.id))[0]?.resolvido_em).not.toBeNull();
  });

  it("venda cancelada sai dos indicadores (resumo, formas e top 10)", async () => {
    const p = await novoProduto({ quantidade: 50, preco_venda: 7, preco_custo: 3 });
    const venda = await vender([{ produto_id: p.id, quantidade: 2 }]);

    // Janela de 1 ms em volta do horário gravado PELO BANCO: não depende do
    // relógio do Node, e outros testes em paralelo não caem nela.
    const { data: v } = await admin.from("vendas").select("created_at").eq("id", venda).single();
    const inicio = new Date(v!.created_at);
    const janela = { p_inicio: inicio.toISOString(), p_fim: new Date(inicio.getTime() + 1).toISOString() };
    const medir = async () => {
      const [resumo, formas, top] = await Promise.all([
        proprietario.cliente.rpc("resumo_vendas", janela),
        proprietario.cliente.rpc("vendas_por_forma", janela),
        proprietario.cliente.rpc("top_produtos", { ...janela, p_limite: 50 }),
      ]);
      return {
        faturamento: resumo.data?.[0]?.faturamento,
        vendas: resumo.data?.[0]?.quantidade_vendas,
        custo: resumo.data?.[0]?.custo,
        pix: formas.data?.find((f) => f.forma_pagamento === "pix")?.quantidade_vendas,
        noTop: top.data?.some((t) => t.produto_id === p.id),
      };
    };

    expect(await medir()).toEqual({ faturamento: 14, vendas: 1, custo: 6, pix: 1, noTop: true });
    await cancelar(proprietario.cliente, venda);
    expect(await medir()).toEqual({ faturamento: 0, vendas: 0, custo: 0, pix: 0, noTop: false });
  });

  it("anônimo não cancela", async () => {
    const p = await novoProduto({ quantidade: 20 });
    const venda = await vender([{ produto_id: p.id, quantidade: 1 }]);
    const { error } = await clienteAnonimo().rpc("cancelar_venda", { p_venda_id: venda, p_motivo: "x" });
    expect(error?.code).toBe("42501");
    expect(await quantidadeDoProduto(p.id)).toBe(19);
  });

  it("produto desativado depois da venda: estoque volta e não abre alerta", async () => {
    const p = await novoProduto({ quantidade: 12, estoque_minimo: 10 });
    const venda = await vender([{ produto_id: p.id, quantidade: 1 }]); // 11: acima do mínimo
    await admin.from("produtos").update({ ativo: false }).eq("id", p.id);

    const { error } = await cancelar(proprietario.cliente, venda);
    expect(error).toBeNull();
    expect(await quantidadeDoProduto(p.id)).toBe(12);
    expect(await alertasDoProduto(p.id)).toHaveLength(0);
  });
});
