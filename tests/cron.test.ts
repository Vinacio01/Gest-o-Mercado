import { describe, expect, it } from "vitest";

import { autorizadoParaCron } from "@/lib/autorizacao-cron";
import { esquemaConfiguracoes } from "@/lib/validations/configuracoes";

describe("autorização do cron", () => {
  const segredo = "segredo-de-teste";

  it("aceita só o Bearer com o segredo exato", () => {
    expect(autorizadoParaCron(`Bearer ${segredo}`, segredo)).toBe(true);
    expect(autorizadoParaCron(`Bearer ${segredo}x`, segredo)).toBe(false);
    expect(autorizadoParaCron(segredo, segredo)).toBe(false);
    expect(autorizadoParaCron(null, segredo)).toBe(false);
  });

  it("sem CRON_SECRET configurado recusa sempre", () => {
    expect(autorizadoParaCron("Bearer ", undefined)).toBe(false);
    expect(autorizadoParaCron("Bearer ", "")).toBe(false);
    expect(autorizadoParaCron("Bearer undefined", undefined)).toBe(false);
  });
});

describe("esquemaConfiguracoes", () => {
  it("switch marcado chega como 'on'; e-mail vazio vira null", () => {
    expect(esquemaConfiguracoes.parse({ alertas_ativos: "on", email_alerta: " Dono@Exemplo.com " })).toEqual({
      alertas_ativos: true,
      email_alerta: "dono@exemplo.com",
    });
    expect(esquemaConfiguracoes.parse({ email_alerta: "" })).toEqual({
      alertas_ativos: false,
      email_alerta: null,
    });
  });

  it("recusa e-mail inválido", () => {
    expect(esquemaConfiguracoes.safeParse({ email_alerta: "dono@" }).success).toBe(false);
  });
});
