import type { Metadata } from "next";

import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { EmConstrucao } from "@/components/em-construcao";

export const metadata: Metadata = { title: "Produtos" };

export default function PaginaProdutos() {
  return (
    <>
      <CabecalhoPagina
        titulo="Produtos"
        descricao="Catálogo de produtos e quantidades em estoque."
      />
      <EmConstrucao
        fase={3}
        descricao="Tabela com busca e filtros, cadastro, edição e categorias."
      />
    </>
  );
}
