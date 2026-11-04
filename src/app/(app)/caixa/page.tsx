import type { Metadata } from "next";

import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { listarProdutosParaCaixa } from "@/lib/services/produtos";
import { exigirUsuario } from "@/lib/services/sessao";

import { Caixa } from "./caixa";

export const metadata: Metadata = { title: "Caixa" };

export default async function PaginaCaixa() {
  await exigirUsuario();
  const produtos = await listarProdutosParaCaixa();

  return (
    <>
      <CabecalhoPagina
        titulo="Caixa"
        descricao="Enter adiciona o produto · F2 finaliza · Esc cancela. O pagamento continua na maquininha."
      />
      <Caixa produtos={produtos} />
    </>
  );
}
