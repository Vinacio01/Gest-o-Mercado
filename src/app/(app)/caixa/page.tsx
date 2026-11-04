import type { Metadata } from "next";

import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { EmConstrucao } from "@/components/em-construcao";

export const metadata: Metadata = { title: "Caixa" };

export default function PaginaCaixa() {
  return (
    <>
      <CabecalhoPagina
        titulo="Caixa"
        descricao="Registre as vendas do balcão."
      />
      <EmConstrucao
        fase={4}
        descricao="Busca por nome ou código de barras, lista da venda e finalização com baixa no estoque."
      />
    </>
  );
}
