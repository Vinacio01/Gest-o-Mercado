import { describe, expect, it } from "vitest";

import { calcularPeriodos, variacaoPercentual } from "@/lib/periodos";

/** Instante em São Paulo (UTC−3, sem horário de verão desde 2019). */
const sp = (dataHora: string) => new Date(`${dataHora}-03:00`);
const iso = (d: Date) => d.toISOString();

describe("Este mês x mês anterior até o mesmo dia", () => {
  it("1 a 3 de novembro (até 15h) contra 1 a 3 de outubro (até 15h)", () => {
    const p = calcularPeriodos("mes", sp("2026-11-03T15:00:00"));
    expect(iso(p.atual.inicio)).toBe(iso(sp("2026-11-01T00:00:00")));
    expect(iso(p.atual.fim)).toBe(iso(sp("2026-11-03T15:00:00")));
    expect(iso(p.anterior.inicio)).toBe(iso(sp("2026-10-01T00:00:00")));
    expect(iso(p.anterior.fim)).toBe(iso(sp("2026-10-03T15:00:00")));
    expect(p.descricaoAnterior).toBe("01/10/2026 a 03/10/2026, até 15:00");
  });

  it("31 de março contra fevereiro inteiro (fevereiro não tem dia 31)", () => {
    const p = calcularPeriodos("mes", sp("2027-03-31T10:00:00"));
    expect(iso(p.anterior.inicio)).toBe(iso(sp("2027-02-01T00:00:00")));
    expect(iso(p.anterior.fim)).toBe(iso(sp("2027-03-01T00:00:00")));
    expect(p.descricaoAnterior).toBe("01/02/2027 a 28/02/2027");
  });

  it("janeiro compara com dezembro do ano anterior", () => {
    const p = calcularPeriodos("mes", sp("2027-01-05T09:30:00"));
    expect(iso(p.anterior.inicio)).toBe(iso(sp("2026-12-01T00:00:00")));
    expect(iso(p.anterior.fim)).toBe(iso(sp("2026-12-05T09:30:00")));
  });
});

describe("virada de mês no fuso de São Paulo", () => {
  it("22h do dia 31 (01h UTC do dia 1) ainda é o mês do dia 31", () => {
    // 31/10 22h em São Paulo = 01/11 01h em UTC.
    const p = calcularPeriodos("mes", new Date("2026-11-01T01:00:00Z"));
    expect(iso(p.atual.inicio)).toBe(iso(sp("2026-10-01T00:00:00")));
    expect(iso(p.hoje.inicio)).toBe(iso(sp("2026-10-31T00:00:00")));
  });

  it("o dia de hoje começa à meia-noite de São Paulo (03h UTC)", () => {
    const p = calcularPeriodos("hoje", sp("2026-11-03T00:30:00"));
    expect(p.atual.inicio.toISOString()).toBe("2026-11-03T03:00:00.000Z");
  });
});

describe("demais períodos", () => {
  it("Hoje x ontem até a mesma hora", () => {
    const p = calcularPeriodos("hoje", sp("2026-11-03T15:20:00"));
    expect(iso(p.anterior.inicio)).toBe(iso(sp("2026-11-02T00:00:00")));
    expect(iso(p.anterior.fim)).toBe(iso(sp("2026-11-02T15:20:00")));
    expect(p.descricaoAnterior).toBe("02/11/2026, até 15:20");
  });

  it("Últimos 7 dias x os 7 dias anteriores (mesmo tamanho)", () => {
    const p = calcularPeriodos("7d", sp("2026-11-10T12:00:00"));
    expect(iso(p.atual.inicio)).toBe(iso(sp("2026-11-04T00:00:00")));
    expect(iso(p.anterior.inicio)).toBe(iso(sp("2026-10-28T00:00:00")));
    expect(iso(p.anterior.fim)).toBe(iso(sp("2026-11-03T12:00:00")));
    const duracao = (i: { inicio: Date; fim: Date }) => i.fim.getTime() - i.inicio.getTime();
    expect(duracao(p.anterior)).toBe(duracao(p.atual));
  });

  it("Últimos 30 dias x os 30 anteriores (mesmo tamanho)", () => {
    const p = calcularPeriodos("30d", sp("2026-11-10T12:00:00"));
    const duracao = (i: { inicio: Date; fim: Date }) => i.fim.getTime() - i.inicio.getTime();
    expect(duracao(p.anterior)).toBe(duracao(p.atual));
    expect(iso(p.atual.inicio)).toBe(iso(sp("2026-10-12T00:00:00")));
  });

  it("Mês anterior inteiro x o mês antes dele inteiro", () => {
    const p = calcularPeriodos("mes_anterior", sp("2026-11-03T15:00:00"));
    expect(iso(p.atual.inicio)).toBe(iso(sp("2026-10-01T00:00:00")));
    expect(iso(p.atual.fim)).toBe(iso(sp("2026-11-01T00:00:00")));
    expect(iso(p.anterior.inicio)).toBe(iso(sp("2026-09-01T00:00:00")));
    expect(iso(p.anterior.fim)).toBe(iso(sp("2026-10-01T00:00:00")));
    expect(p.descricaoAnterior).toBe("01/09/2026 a 30/09/2026");
  });

  it("Faturamento do dia é sempre hoje até agora, qualquer que seja o período", () => {
    const agora = sp("2026-11-03T15:00:00");
    const p = calcularPeriodos("mes_anterior", agora);
    expect(iso(p.hoje.inicio)).toBe(iso(sp("2026-11-03T00:00:00")));
    expect(iso(p.hoje.fim)).toBe(iso(agora));
  });
});

describe("variacaoPercentual", () => {
  it("calcula subida, queda e ausência de base", () => {
    expect(variacaoPercentual(12_000, 10_000)).toBe(20);
    expect(variacaoPercentual(7_500, 10_000)).toBe(-25);
    expect(variacaoPercentual(5_000, 0)).toBeNull();
  });
});
