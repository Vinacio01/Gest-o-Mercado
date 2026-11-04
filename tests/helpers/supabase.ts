import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Ajudantes para testes que rodam contra o Supabase LOCAL (`npx supabase start`).
 * Por segurança, recusam qualquer URL que não seja localhost.
 */

type Papel = Database["public"]["Enums"]["papel_usuario"];
export type Cliente = SupabaseClient<Database>;

function lerEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon || !service) {
    throw new Error(
      "Testes de banco precisam de NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY no .env.local (valores do `npx supabase status`).",
    );
  }

  const host = new URL(url).hostname;
  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error(`Testes de banco só rodam no Supabase local. URL recebida: ${url}`);
  }

  return { url, anon, service };
}

const env = lerEnv();
const semSessao = { auth: { persistSession: false, autoRefreshToken: false } };

/** Cliente com a service role: ignora o RLS. Usar só para preparar e limpar dados. */
export const admin: Cliente = createClient<Database>(env.url, env.service, semSessao);

export function clienteAnonimo(): Cliente {
  return createClient<Database>(env.url, env.anon, semSessao);
}

export type UsuarioTeste = { id: string; cliente: Cliente };

/** Cria um usuário com o papel pedido e devolve um cliente já logado como ele. */
export async function criarUsuario(
  papel: Papel,
  opcoes: { ativo?: boolean } = {},
): Promise<UsuarioTeste> {
  const email = `teste-${randomUUID()}@mercadinho.test`;
  const senha = randomUUID();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome: `Teste ${papel}` },
  });
  if (error || !data.user) throw error ?? new Error("Usuário não criado");

  const { error: erroPerfil } = await admin
    .from("perfis")
    .update({ papel, ativo: opcoes.ativo ?? true })
    .eq("id", data.user.id);
  if (erroPerfil) throw erroPerfil;

  const cliente = clienteAnonimo();
  const { error: erroLogin } = await cliente.auth.signInWithPassword({ email, password: senha });
  if (erroLogin) throw erroLogin;

  return { id: data.user.id, cliente };
}

export async function removerUsuario(id: string) {
  await admin.auth.admin.deleteUser(id);
}

/** Cria um produto direto pelo admin (com quantidade inicial) para os testes. */
export async function criarProdutoTeste(
  campos: Partial<Database["public"]["Tables"]["produtos"]["Insert"]> = {},
) {
  const { data, error } = await admin
    .from("produtos")
    .insert({
      nome: `Produto teste ${randomUUID().slice(0, 8)}`,
      preco_custo: 2.5,
      preco_venda: 4.99,
      quantidade: 20,
      ...campos,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Remove o produto e o que depende dele (movimentações e alertas). */
export async function removerProduto(id: string) {
  await admin.from("movimentacoes_estoque").delete().eq("produto_id", id);
  await admin.from("alertas_estoque").delete().eq("produto_id", id);
  const { error } = await admin.from("produtos").delete().eq("id", id);
  if (error) throw error;
}

/** Alertas do produto, do mais antigo para o mais novo. */
export async function alertasDoProduto(id: string) {
  const { data, error } = await admin
    .from("alertas_estoque")
    .select("*")
    .eq("produto_id", id)
    .order("created_at")
    .order("id");
  if (error) throw error;
  return data;
}

export async function quantidadeDoProduto(id: string) {
  const { data, error } = await admin.from("produtos").select("quantidade").eq("id", id).single();
  if (error) throw error;
  return data.quantidade;
}
