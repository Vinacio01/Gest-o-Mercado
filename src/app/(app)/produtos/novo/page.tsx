import type { Metadata } from "next";

import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { listarCategorias } from "@/lib/services/produtos";
import { exigirProprietario } from "@/lib/services/sessao";

import { cadastrarProdutoAcao } from "../actions";
import { FormularioProduto } from "../formulario-produto";

export const metadata: Metadata = { title: "Novo produto" };

export default async function PaginaNovoProduto() {
  await exigirProprietario();
  const categorias = (await listarCategorias()).filter((c) => c.ativo);

  return (
    <>
      <CabecalhoPagina titulo="Novo produto" descricao="Cadastre um produto no catálogo." />
      <FormularioProduto modo="novo" acao={cadastrarProdutoAcao} categorias={categorias} />
    </>
  );
}
