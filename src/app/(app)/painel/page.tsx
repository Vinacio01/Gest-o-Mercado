import type { Metadata } from "next";

import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { EmConstrucao } from "@/components/em-construcao";

export const metadata: Metadata = { title: "Painel" };

export default function PaginaPainel() {
  return (
    <>
      <CabecalhoPagina
        titulo="Painel"
        descricao="Faturamento, lucro bruto estimado e comparação com o período anterior."
      />
      <EmConstrucao
        fase={6}
        descricao="Indicadores, comparativo, bloco financeiro e gráficos."
      />
    </>
  );
}
