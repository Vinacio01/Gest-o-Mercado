import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Store } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { destinoInicial, obterSessao } from "@/lib/services/sessao";

import { FormularioLogin } from "./formulario-login";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaLogin({
  searchParams,
}: PageProps<"/login">) {
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
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Store className="size-5" />
          </div>
          <CardTitle className="text-xl">Estoque Mercadinho</CardTitle>
          <CardDescription>Entre com seu e-mail e senha.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormularioLogin aviso={aviso} />
        </CardContent>
      </Card>
    </main>
  );
}
