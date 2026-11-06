import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SeloIracema } from "@/components/selo-iracema";
import { destinoInicial, obterSessao } from "@/lib/services/sessao";

import { FormularioLogin } from "./formulario-login";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaLogin({ searchParams }: PageProps<"/login">) {
  const sessao = await obterSessao();
  if (sessao.estado === "ativo") {
    redirect(destinoInicial(sessao.usuario.papel));
  }

  const { motivo } = await searchParams;
  const aviso =
    sessao.estado === "inativo" || motivo === "inativo"
      ? "Seu usuário está desativado. Fale com o proprietário."
      : undefined;

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-folha p-4">
      <SeloIracema tamanho="grande" />
      <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-lg">
        <h1 className="font-display text-2xl font-bold text-titulo">Entrar</h1>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">
          Use o e-mail e a senha que o proprietário cadastrou para você.
        </p>
        <FormularioLogin aviso={aviso} />
      </div>
    </main>
  );
}
