"use server";

import { redirect } from "next/navigation";

import { destinoInicial } from "@/lib/services/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { esquemaLogin } from "@/lib/validations/auth";

export type EstadoLogin = {
  erro?: string;
  email?: string;
};

export async function entrar(
  _estadoAnterior: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "");
  const dados = esquemaLogin.safeParse({
    email,
    senha: formData.get("senha"),
  });

  if (!dados.success) {
    return { erro: dados.error.issues[0]?.message, email };
  }

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: dados.data.email,
    password: dados.data.senha,
  });

  if (error || !data.user) {
    if (error && error.code !== "invalid_credentials") {
      console.error("[login] erro inesperado do Supabase Auth", error);
      return { erro: "Não foi possível entrar agora. Tente novamente.", email };
    }
    return { erro: "E-mail ou senha incorretos.", email };
  }

  // O RLS só devolve o perfil se ele estiver ativo.
  const { data: perfil } = await supabase
    .from("perfis")
    .select("papel")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!perfil) {
    await supabase.auth.signOut();
    return {
      erro: "Seu usuário está desativado. Fale com o proprietário.",
      email,
    };
  }

  redirect(destinoInicial(perfil.papel));
}

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
