import type { Metadata } from "next";

import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { EmConstrucao } from "@/components/em-construcao";
import { exigirProprietario } from "@/lib/services/sessao";

export const metadata: Metadata = { title: "Vendas" };

export default async function PaginaVendas() {
  await exigirProprietario();

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
