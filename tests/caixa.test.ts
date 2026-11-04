import { describe, expect, it } from "vitest";

import {
  adicionarItem,
  buscarProdutos,
  definirQuantidade,
  produtoPorCodigo,
  totalCentavos,
  trocoCentavos,
  type ItemCarrinho,
  type ProdutoCaixa,
} from "@/lib/caixa";

function produto(campos: Partial<ProdutoCaixa> = {}): ProdutoCaixa {
  return {
    id: crypto.randomUUID(),
    nome: "Produto",
    codigo_barras: null,
    unidade: "un",
    preco_venda: 1,
    quantidade: 10,
    ...campos,
  };
}

describe("carrinho", () => {
  it("adiciona e incrementa o mesmo produto", () => {
    const p = produto();
    const a = adicionarItem([], p);
    expect(a.ok && a.itens).toEqual([{ produto: p, quantidade: 1 }]);
    const b = adicionarItem((a as { itens: ItemCarrinho[] }).itens, p);
    expect(b.ok && b.itens[0].quantidade).toBe(2);
  });

  it("não adiciona produto sem estoque", () => {
    const r = adicionarItem([], produto({ nome: "Pão", quantidade: 0 }));
    expect(r).toEqual({ ok: false, motivo: "Pão está sem estoque." });
  });

  it("não passa do estoque conhecido", () => {
    const p = produto({ nome: "Leite", quantidade: 1 });
    const a = adicionarItem([], p);
    const b = adicionarItem((a as { itens: ItemCarrinho[] }).itens, p);
    expect(b).toEqual({ ok: false, motivo: "Só há 1 un de Leite em estoque." });
  });

  it("definirQuantidade limita ao estoque e remove com zero", () => {
    const p = produto({ quantidade: 5 });
    const itens = [{ produto: p, quantidade: 1 }];
    expect(definirQuantidade(itens, p.id, 99)[0].quantidade).toBe(5);
    expect(definirQuantidade(itens, p.id, 0)).toEqual([]);
  });

  it("total em centavos sem erro de ponto flutuante", () => {
    // 0,10 + 0,20 em ponto flutuante dá 0,30000000000000004
    const itens = [
      { produto: produto({ preco_venda: 0.1 }), quantidade: 1 },
      { produto: produto({ preco_venda: 0.2 }), quantidade: 1 },
      { produto: produto({ preco_venda: 5.49 }), quantidade: 3 },
    ];
    expect(totalCentavos(itens)).toBe(30 + 1647);
  });

  it("troco", () => {
    expect(trocoCentavos(5000, 3290)).toBe(1710);
    expect(trocoCentavos(3290, 3290)).toBe(0);
    expect(trocoCentavos(2000, 3290)).toBeNull();
  });
});

describe("busca do caixa", () => {
  const produtos = [
    produto({ nome: "Feijão Preto 1 kg", codigo_barras: "7891" }),
    produto({ nome: "Arroz com Feijão pronto", codigo_barras: "7892" }),
    produto({ nome: "Feijão Carioca 1 kg", codigo_barras: "7893", quantidade: 0 }),
  ];

  it("encontra por código exato", () => {
    expect(produtoPorCodigo(produtos, " 7892 ")?.nome).toBe("Arroz com Feijão pronto");
    expect(produtoPorCodigo(produtos, "789")).toBeUndefined();
  });

  it("ignora acentos e põe primeiro quem começa com a busca e tem estoque", () => {
    expect(buscarProdutos(produtos, "feijao").map((p) => p.nome)).toEqual([
      "Feijão Preto 1 kg",
      "Arroz com Feijão pronto",
      "Feijão Carioca 1 kg", // sem estoque vai para o fim, mas aparece
    ]);
  });

  it("busca vazia não lista nada", () => {
    expect(buscarProdutos(produtos, "  ")).toEqual([]);
  });
});
