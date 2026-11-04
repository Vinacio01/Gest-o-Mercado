import type { Metadata } from "next";

import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { EmConstrucao } from "@/components/em-construcao";

export const metadata: Metadata = { title: "Vendas" };

export default function PaginaVendas() {
  return (
    <>
      <CabecalhoPagina
        titulo="Vendas"
        descricao="Histórico de vendas e cancelamentos."
      />
      <EmConstrucao
        fase={8}
        descricao="Histórico com filtros, detalhe da venda e cancelamento com estorno."
      />
    </>
  );
}
