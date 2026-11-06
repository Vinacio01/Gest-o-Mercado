import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { clienteAnonimo } from "../tests/helpers/supabase";
import { Cenario, entrar } from "./apoio";

let cenario: Cenario;

test.beforeEach(() => {
  cenario = new Cenario();
});

test.afterEach(async () => {
  await cenario.limpar();
});

test("proprietário cancela uma venda e o estoque volta", async ({ page }) => {
  const dono = await cenario.usuario("proprietario");
  const caixa = await cenario.usuario("funcionario");
  const produto = await cenario.produto({ quantidade: 10 });

  // A venda é feita pelo caixa (como no dia a dia), pela função do banco.
  const sessao = clienteAnonimo();
  await sessao.auth.signInWithPassword({ email: caixa.email, password: caixa.senha });
  const { data, error } = await sessao.rpc("registrar_venda", {
    p_chave_idempotencia: randomUUID(),
    p_forma_pagamento: "debito",
    p_itens: [{ produto_id: produto.id, quantidade: 3 }],
  });
  expect(error).toBeNull();
  const vendaId = (data as { venda_id: string }).venda_id;
  expect(await cenario.quantidade(produto.id)).toBe(7);

  await entrar(page, dono.email, dono.senha);
  await page.goto(`/vendas/${vendaId}`);
  await page.getByRole("button", { name: "Cancelar venda" }).click();

  const dialogo = page.getByRole("dialog");
  // Sem motivo, não cancela.
  await dialogo.getByRole("button", { name: "Cancelar venda" }).click();
  await expect(dialogo.getByText("Informe o motivo do cancelamento.")).toBeVisible();

  await dialogo.getByLabel("Motivo").fill("Cliente desistiu (teste E2E)");
  await dialogo.getByRole("button", { name: "Cancelar venda" }).click();

  await expect(page.getByText("Venda cancelada. O estoque foi devolvido.")).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Cliente desistiu (teste E2E)");
  await expect(page.getByRole("button", { name: "Cancelar venda" })).toHaveCount(0);
  expect(await cenario.quantidade(produto.id)).toBe(10);
});
