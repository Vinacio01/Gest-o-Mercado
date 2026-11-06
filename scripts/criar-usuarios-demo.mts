/**
 * Cria (ou atualiza) os dois usuários PÚBLICOS da demonstração: um
 * proprietário e um funcionário. As senhas estão no README de propósito:
 * servem para quem for avaliar a demo entrar sem pedir acesso.
 *
 *   Local:     npm run usuarios:demo
 *   Produção:  npm run usuarios:demo -- --env .env.producao.local --producao
 *
 * NÃO use estes usuários (nem este script) num banco com dados reais de uma
 * loja: qualquer pessoa com o README consegue entrar como proprietário.
 */
import { createClient } from "@supabase/supabase-js";

const USUARIOS_DEMO = [
  {
    email: "dono@demo-iracema.test",
    senha: "demo-iracema-dono",
    nome: "Dono (demonstração)",
    papel: "proprietario",
  },
  {
    email: "caixa@demo-iracema.test",
    senha: "demo-iracema-caixa",
    nome: "Caixa (demonstração)",
    papel: "funcionario",
  },
] as const;

const argumentos = process.argv.slice(2);
const indiceEnv = argumentos.indexOf("--env");
const arquivoEnv = indiceEnv >= 0 ? argumentos[indiceEnv + 1] : ".env.local";
process.loadEnvFile(arquivoEnv);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !service) {
  throw new Error(`Preencha NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em ${arquivoEnv}.`);
}

const host = new URL(url).hostname;
const local = host === "localhost" || host === "127.0.0.1";
if (!local && !argumentos.includes("--producao")) {
  throw new Error(`O destino é ${host}. Para criar os usuários num banco remoto, acrescente --producao.`);
}
console.log(`Destino: ${host}`);

const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: lista, error: erroLista } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (erroLista) throw erroLista;

for (const usuario of USUARIOS_DEMO) {
  const existente = lista.users.find((u) => u.email === usuario.email);
  const { data, error } = existente
    ? await admin.auth.admin.updateUserById(existente.id, { password: usuario.senha })
    : await admin.auth.admin.createUser({
        email: usuario.email,
        password: usuario.senha,
        email_confirm: true,
        user_metadata: { nome: usuario.nome },
      });
  if (error || !data.user) throw error ?? new Error(`Falha em ${usuario.email}`);

  const { error: erroPerfil } = await admin
    .from("perfis")
    .update({ nome: usuario.nome, papel: usuario.papel, ativo: true })
    .eq("id", data.user.id);
  if (erroPerfil) throw erroPerfil;

  console.log(`${existente ? "Atualizado" : "Criado"}: ${usuario.email} (${usuario.papel})`);
}
