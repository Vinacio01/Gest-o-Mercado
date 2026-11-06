import { expect, test, type Page } from "@playwright/test";

import { Cenario, entrar } from "./apoio";

let cenario: Cenario;

test.beforeEach(() => {
  cenario = new Cenario();
});

test.afterEach(async () => {
  await cenario.limpar();
});

/** Lê o código como o leitor de código de barras faz: digita e aperta Enter. */
async function lerCodigo(page: Page, codigo: string) {
  const busca = page.getByRole("textbox", { name: "Buscar produto" });
  await busca.fill(codigo);
  await busca.press("Enter");
}

const itensDaVenda = (page: Page) => page.getByRole("list", { name: "Itens da venda" }).getByRole("listitem");

test("funcionário vende pelo código de barras e o estoque baixa", async ({ page }) => {
  const caixa = await cenario.usuario("funcionario");
  const produto = await cenario.produto({ quantidade: 10, preco_venda: 7.5 });

  await entrar(page, caixa.email, caixa.senha);
  await expect(page).toHaveURL(/\/caixa/);

  await lerCodigo(page, produto.codigo);
  await lerCodigo(page, produto.codigo); // mesmo produto de novo: vira 2 unidades
  await expect(itensDaVenda(page)).toHaveCount(1);
  await expect(page.getByText("R$ 15,00").first()).toBeVisible();

  await page.getByRole("radio", { name: "Pix" }).click();
  await page.keyboard.press("F2");

  await expect(page.getByText("Venda registrada: R$ 15,00")).toBeVisible();
  await expect(itensDaVenda(page)).toHaveCount(0); // tela limpa para a próxima venda
  expect(await cenario.quantidade(produto.id)).toBe(8);
  expect(await cenario.vendasDoProduto(produto.id)).toHaveLength(1);
});

test("sem internet, a venda não se perde nem é duplicada", async ({ page, context }) => {
  const caixa = await cenario.usuario("funcionario");
  const produto = await cenario.produto({ quantidade: 10 });

  await entrar(page, caixa.email, caixa.senha);
  await lerCodigo(page, produto.codigo);
  await page.getByRole("radio", { name: "Dinheiro" }).click();

  // A internet cai bem na hora de finalizar.
  await context.setOffline(true);
  await page.keyboard.press("F2");
  await expect(page.getByText(/Sem resposta do servidor/)).toBeVisible();
  await expect(itensDaVenda(page)).toHaveCount(1); // o carrinho continua na tela

  // Volta a internet: o operador aperta F2 de novo.
  await context.setOffline(false);
  await page.keyboard.press("F2");
  await expect(page.getByText(/Venda registrada/)).toBeVisible();

  expect(await cenario.vendasDoProduto(produto.id)).toHaveLength(1);
  expect(await cenario.quantidade(produto.id)).toBe(9);
});

test("produto sem estoque aparece na busca, mas não entra na venda", async ({ page }) => {
  const caixa = await cenario.usuario("funcionario");
  const produto = await cenario.produto({ quantidade: 0 });

  await entrar(page, caixa.email, caixa.senha);
  await lerCodigo(page, produto.codigo);

  await expect(page.getByText(`${produto.nome} está sem estoque.`)).toBeVisible();
  await expect(itensDaVenda(page)).toHaveCount(0);
});

test("funcionário não abre as telas do proprietário", async ({ page }) => {
  const caixa = await cenario.usuario("funcionario");
  await entrar(page, caixa.email, caixa.senha);

  for (const tela of ["/painel", "/estoque", "/vendas", "/configuracoes"]) {
    await page.goto(tela);
    await expect(page, tela).toHaveURL(/\/caixa/);
  }
  await expect(page.getByRole("link", { name: "Painel" })).toHaveCount(0);
});
