import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listarCategoriasComContagem } from "@/lib/services/produtos";
import { exigirProprietario } from "@/lib/services/sessao";

import { FormularioNovaCategoria } from "./formulario-categoria";
import { LinhaCategoria } from "./linha-categoria";

export const metadata: Metadata = { title: "Categorias" };

export default async function PaginaCategorias() {
  await exigirProprietario();
  const categorias = await listarCategoriasComContagem();

  return (
    <>
      <CabecalhoPagina
        titulo="Categorias"
        descricao="Organize os produtos por categoria. Categorias desativadas não aparecem no cadastro."
        acoes={
          <Button variant="outline" asChild>
            <Link href="/produtos">
              <ArrowLeft /> Produtos
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Nova categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <FormularioNovaCategoria />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Categorias cadastradas</CardTitle>
          </CardHeader>
          <CardContent>
            {categorias.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma categoria ainda. Crie a primeira ao lado.
              </p>
            ) : (
              <ul className="divide-y">
                {categorias.map((c) => (
                  <LinhaCategoria key={c.id} categoria={c} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
