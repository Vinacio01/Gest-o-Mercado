/**
 * Cria (ou atualiza) dois usuários de DESENVOLVIMENTO no Supabase LOCAL:
 * um proprietário e um funcionário.
 *
 *   npm run usuarios:dev
 *
 * Só roda contra localhost. Em produção, os usuários são criados pelo painel
 * do Supabase (Authentication > Users) e o papel é definido na tabela perfis.
 *
 * As senhas abaixo são exclusivas do banco local de desenvolvimento.
 */
import { createClient } from "@supabase/supabase-js";

const USUARIOS_DEV = [
  {
    email: "proprietario@mercadinho.test",
    senha: "dev-proprietario-2026",
    nome: "Dono (dev)",
    papel: "proprietario",
  },
  {
    email: "funcionario@mercadinho.test",
    senha: "dev-funcionario-2026",
    nome: "Funcionário (dev)",
    papel: "funcionario",
  },
] as const;

process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !service) {
  throw new Error("Preencha NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local.");
}

const host = new URL(url).hostname;
if (host !== "localhost" && host !== "127.0.0.1") {
  throw new Error(`Este script só roda no Supabase local. URL atual: ${url}`);
}

const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: lista, error: erroLista } = await admin.auth.admin.listUsers();
if (erroLista) throw erroLista;

for (const usuario of USUARIOS_DEV) {
  const existente = lista.users.find((u) => u.email === usuario.email);

  const { data, error } = existente
    ? await admin.auth.admin.updateUserById(existente.id, { password: usuario.senha })
    : await admin.auth.admin.createUser({
        email: usuario.email,
        password: usuario.senha,
        email_confirm: true,
        user_metadata: { nome: usuario.nome },
      });
  if (error || !data.user) throw error ?? new Error(`Falha ao criar ${usuario.email}`);

  const { error: erroPerfil } = await admin
    .from("perfis")
    .update({ nome: usuario.nome, papel: usuario.papel, ativo: true })
    .eq("id", data.user.id);
  if (erroPerfil) throw erroPerfil;

  console.log(`${existente ? "Atualizado" : "Criado"}: ${usuario.email} (${usuario.papel})`);
}
