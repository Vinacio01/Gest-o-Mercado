import type { Metadata } from "next";

import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { EmConstrucao } from "@/components/em-construcao";

export const metadata: Metadata = { title: "Estoque" };

export default function PaginaEstoque() {
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
