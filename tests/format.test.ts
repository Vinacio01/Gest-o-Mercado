import { describe, expect, it } from "vitest";

import {
  formatarCentavos,
  formatarData,
  formatarDataHora,
  formatarMoeda,
  paraCentavos,
} from "@/lib/format";

// O Intl usa espaço não separável entre "R$" e o número.
const semNbsp = (texto: string) => texto.replace(/ /g, " ");

describe("paraCentavos", () => {
  it("converte strings do banco sem erro de ponto flutuante", () => {
    expect(paraCentavos("12.5")).toBe(1250);
    expect(paraCentavos("0.10")).toBe(10);
    expect(paraCentavos("1234")).toBe(123400);
    expect(paraCentavos("0.29")).toBe(29); // 0.29 * 100 em float dá 28.999...
  });

  it("converte números com até duas casas", () => {
    expect(paraCentavos(3.99)).toBe(399);
    expect(paraCentavos(0.1 + 0.2)).toBe(30);
  });

  it("rejeita valores inválidos ou com mais de duas casas", () => {
    expect(() => paraCentavos("abc")).toThrow();
    expect(() => paraCentavos("1.234")).toThrow();
    expect(() => paraCentavos("1,50")).toThrow();
  });
});

describe("formatação de moeda", () => {
  it("usa o padrão R$ 1.234,56", () => {
    expect(semNbsp(formatarCentavos(123456))).toBe("R$ 1.234,56");
    expect(semNbsp(formatarMoeda("0.5"))).toBe("R$ 0,50");
  });

  it("recusa centavos fracionados", () => {
    expect(() => formatarCentavos(10.5)).toThrow();
  });
});

describe("formatação de data no fuso de São Paulo", () => {
  it("venda às 22h do dia 31 (horário local) pertence ao dia 31", () => {
    // 22h em São Paulo (UTC-3) = 01h do dia seguinte em UTC.
    expect(formatarData("2026-10-01T01:00:00Z")).toBe("30/09/2026");
    expect(formatarData("2026-11-01T01:00:00Z")).toBe("31/10/2026");
  });

  it("formata data e hora em dd/mm/aaaa", () => {
    expect(formatarDataHora("2026-11-01T01:30:00Z")).toBe("31/10/2026, 22:30");
  });
});
