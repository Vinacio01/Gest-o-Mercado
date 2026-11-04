import type { Metadata } from "next";

import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { EmConstrucao } from "@/components/em-construcao";

export const metadata: Metadata = { title: "Configurações" };

export default function PaginaConfiguracoes() {
  return (
    <>
      <CabecalhoPagina
        titulo="Configurações"
        descricao="Alertas de estoque baixo por e-mail."
      />
      <EmConstrucao
        fase={5}
        descricao="Ativar alertas, e-mail de destino, status da integração e reenvio."
      />
    </>
  );
}
