import { describe, expect, it } from "vitest";

import { buscarTodas } from "@/lib/services/banco";

/** Simula o PostgREST: no máximo 1.000 linhas por chamada. */
function fonte(total: number) {
  const chamadas: [number, number][] = [];
  const linhas = Array.from({ length: total }, (_, i) => i);
  const pagina = async (de: number, ate: number) => {
    chamadas.push([de, ate]);
    return { data: linhas.slice(de, Math.min(ate + 1, de + 1000)), error: null };
  };
  return { pagina, chamadas };
}

describe("buscarTodas", () => {
  it("junta todas as páginas além do limite de 1.000 linhas", async () => {
    const f = fonte(2_345);
    const todas = await buscarTodas(f.pagina, "teste");
    expect(todas).toHaveLength(2_345);
    expect(todas.at(-1)).toBe(2_344);
    expect(f.chamadas).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("exatamente 1.000 linhas: busca mais uma página (vazia) e para", async () => {
    const f = fonte(1_000);
    expect(await buscarTodas(f.pagina, "teste")).toHaveLength(1_000);
    expect(f.chamadas).toHaveLength(2);
  });

  it("erro do banco vira erro amigável", async () => {
    await expect(
      buscarTodas(async () => ({ data: null, error: { code: "XX000", message: "falhou" } }), "teste"),
    ).rejects.toThrow("Não foi possível concluir a operação");
  });
});
