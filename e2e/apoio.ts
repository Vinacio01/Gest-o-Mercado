import { randomUUID } from "node:crypto";

import { expect, type Page } from "@playwright/test";

import { admin, removerProduto, removerUsuario, removerVendas } from "../tests/helpers/supabase";

/**
 * Apoio dos testes de ponta a ponta: cada teste cria os próprios usuários e
 * produtos (com códigos únicos) e apaga tudo no fim, sem tocar nos dados da
 * demonstração.
 */

type Papel = "proprietario" | "funcionario";

export class Cenario {
  private usuarios: string[] = [];
  private produtos: string[] = [];

  /** Usuário com senha conhecida, para entrar pela tela de login. */
  async usuario(papel: Papel) {
    const email = `e2e-${papel}-${randomUUID().slice(0, 8)}@mercadinho.test`;
    const senha = randomUUID();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome: `E2E ${papel}` },
    });
    if (error || !data.user) throw error ?? new Error("usuário não criado");
    await admin.from("perfis").update({ papel }).eq("id", data.user.id);
    this.usuarios.push(data.user.id);
    return { id: data.user.id, email, senha };
  }

  /** Produto com código de barras único. */
  async produto(campos: { nome?: string; quantidade?: number; preco_venda?: number } = {}) {
    const codigo = `9${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 13);
    const { data, error } = await admin
      .from("produtos")
      .insert({
        nome: campos.nome ?? `Produto E2E ${codigo.slice(-4)}`,
        codigo_barras: codigo,
        preco_custo: 2,
        preco_venda: campos.preco_venda ?? 5,
        quantidade: campos.quantidade ?? 10,
      })
      .select("id, nome, codigo_barras")
      .single();
    if (error) throw error;
    this.produtos.push(data.id);
    return { id: data.id, nome: data.nome, codigo: data.codigo_barras as string };
  }

  async quantidade(produtoId: string) {
    const { data } = await admin.from("produtos").select("quantidade").eq("id", produtoId).single();
    return data?.quantidade;
  }

  /** Vendas que contêm o produto (para conferir que não duplicou). */
  async vendasDoProduto(produtoId: string) {
    const { data } = await admin.from("itens_venda").select("venda_id").eq("produto_id", produtoId);
    return [...new Set((data ?? []).map((i) => i.venda_id))];
  }

  async limpar() {
    const vendas = (await Promise.all(this.produtos.map((p) => this.vendasDoProduto(p)))).flat();
    await removerVendas(vendas);
    for (const id of this.produtos) await removerProduto(id);
    for (const id of this.usuarios) await removerUsuario(id);
  }
}

/** Entra pela tela de login, como um usuário faria. */
export async function entrar(page: Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
