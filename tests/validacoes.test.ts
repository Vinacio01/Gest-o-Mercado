import { describe, expect, it } from "vitest";

import { diaEmSaoPaulo, diaSeguinte, inicioDoDiaEmSaoPaulo } from "@/lib/format";
import { contemTermos } from "@/lib/texto";
import { normalizarDinheiro } from "@/lib/validations/comum";
import { esquemaMovimentacao } from "@/lib/validations/estoque";
import { esquemaFiltrosProdutos, esquemaNovoProduto } from "@/lib/validations/produtos";

describe("normalizarDinheiro", () => {
  it.each([
    ["12,50", "12.50"],
    ["12.5", "12.50"],
    ["1.234,56", "1234.56"],
    ["R$ 3,9", "3.90"],
    ["0", "0.00"],
    ["007,10", "7.10"],
  ])("%s -> %s", (entrada, esperado) => {
    expect(normalizarDinheiro(entrada)).toBe(esperado);
  });

  it.each(["", "abc", "12,345", "-5", "1,2,3", "123456789"])("recusa %j", (entrada) => {
    expect(normalizarDinheiro(entrada)).toBeNull();
  });
});

describe("esquemaNovoProduto", () => {
  const base = {
    nome: "Arroz",
    descricao: "",
    categoria_id: "",
    codigo_barras: "",
    unidade: "un",
    preco_custo: "0",
    preco_venda: "24,90",
    estoque_minimo: "10",
    estoque_inicial: "0",
  };

  it("converte os campos do formulário", () => {
    const r = esquemaNovoProduto.parse(base);
    expect(r).toMatchObject({
      descricao: null,
      categoria_id: null,
      codigo_barras: null,
      preco_custo: "0.00",
      preco_venda: "24.90",
      estoque_minimo: 10,
      estoque_inicial: 0,
    });
  });

  it("recusa preço de venda zero e estoque negativo ou fracionado", () => {
    const r = esquemaNovoProduto.safeParse({
      ...base,
      preco_venda: "0,00",
      estoque_inicial: "-1",
      estoque_minimo: "2,5",
    });
    expect(r.success).toBe(false);
    const campos = r.error!.issues.map((i) => i.path[0]);
    expect(campos).toEqual(expect.arrayContaining(["preco_venda", "estoque_inicial", "estoque_minimo"]));
  });
});

describe("esquemaMovimentacao", () => {
  const produto_id = crypto.randomUUID();

  it("entrada aceita motivo vazio", () => {
    const r = esquemaMovimentacao.parse({ tipo: "entrada", produto_id, quantidade: "5", motivo: "" });
    expect(r).toEqual({ tipo: "entrada", produto_id, quantidade: 5, motivo: null });
  });

  it("saída exige motivo e quantidade positiva", () => {
    const r = esquemaMovimentacao.safeParse({ tipo: "saida_manual", produto_id, quantidade: "0", motivo: " " });
    expect(r.success).toBe(false);
  });

  it("ajuste aceita zero", () => {
    const r = esquemaMovimentacao.parse({ tipo: "ajuste", produto_id, quantidade: "0", motivo: "Contagem" });
    expect(r.quantidade).toBe(0);
  });

  it("recusa tipos que só o sistema registra", () => {
    const r = esquemaMovimentacao.safeParse({ tipo: "venda", produto_id, quantidade: "1", motivo: "" });
    expect(r.success).toBe(false);
  });
});

describe("esquemaFiltrosProdutos", () => {
  it("valores inválidos na URL voltam ao padrão", () => {
    expect(
      esquemaFiltrosProdutos.parse({ estoque: "xyz", ordem: "1;drop", pagina: "-3", categoria: "abc" }),
    ).toEqual({ busca: "", categoria: undefined, estoque: "todos", ordem: "nome", inativos: false, pagina: 1 });
  });
});

describe("dias em São Paulo", () => {
  it("o dia começa às 03:00 UTC", () => {
    expect(inicioDoDiaEmSaoPaulo("2026-10-31").toISOString()).toBe("2026-10-31T03:00:00.000Z");
  });

  it("22h do dia 31 em São Paulo ainda é dia 31", () => {
    expect(diaEmSaoPaulo(new Date("2026-11-01T01:00:00Z"))).toBe("2026-10-31");
  });

  it("dia seguinte vira o mês e o ano", () => {
    expect(diaSeguinte("2026-10-31")).toBe("2026-11-01");
    expect(diaSeguinte("2026-12-31")).toBe("2027-01-01");
  });
});

describe("contemTermos", () => {
  it("ignora acentos e ordem das palavras", () => {
    expect(contemTermos("Feijão Carioca 1 kg", "carioca feijao")).toBe(true);
    expect(contemTermos("Feijão Carioca 1 kg", "preto")).toBe(false);
  });
});
