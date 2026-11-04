import type { Metadata } from "next";

import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { EmConstrucao } from "@/components/em-construcao";
import { exigirProprietario } from "@/lib/services/sessao";

export const metadata: Metadata = { title: "Estoque" };

export default async function PaginaEstoque() {
  await exigirProprietario();

  return (
    <>
      <CabecalhoPagina
        titulo="Estoque"
        descricao="Entradas, saídas manuais, ajustes e histórico."
      />
      <EmConstrucao
        fase={3}
        descricao="Registro de movimentações e histórico com filtros."
      />
    </>
  );
}
