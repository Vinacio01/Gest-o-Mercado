import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
import { z } from "zod";

import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { IndicadorEstoque } from "@/components/indicador-estoque";
import { Button } from "@/components/ui/button";
import { formatarCentavos, paraCentavos } from "@/lib/format";
import { listarCategorias, obterProduto } from "@/lib/services/produtos";
import { exigirProprietario } from "@/lib/services/sessao";

import { atualizarProdutoAcao } from "../actions";
import { FormularioProduto } from "../formulario-produto";
import { SituacaoProduto } from "./situacao-produto";

export const metadata: Metadata = { title: "Editar produto" };

/** "R$ 12,50" -> "12,50" para o campo do formulário. */
function paraCampo(valor: number): string {
  return formatarCentavos(paraCentavos(valor)).replace(/^R\$\s*/, "");
}

export default async function PaginaEditarProduto({ params }: PageProps<"/produtos/[id]">) {
  await exigirProprietario();

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [produto, categorias] = await Promise.all([obterProduto(id), listarCategorias()]);
  if (!produto) notFound();

  return (
    <>
      <CabecalhoPagina
        titulo={produto.nome}
        descricao="Edite os dados do produto. A quantidade muda só por movimentação de estoque."
        acoes={
          <Button variant="outline" asChild>
            <Link href={`/estoque?movimentar=${produto.id}&produto=${produto.id}`}>
              <ArrowLeftRight /> Movimentar estoque
            </Link>
          </Button>
        }
      />

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        Estoque atual:
        <IndicadorEstoque
          quantidade={produto.quantidade}
          estoqueMinimo={produto.estoque_minimo}
          unidade={produto.unidade}
        />
      </div>

      <FormularioProduto
        modo="edicao"
        acao={atualizarProdutoAcao.bind(null, produto.id)}
        // A categoria atual aparece mesmo se estiver desativada.
        categorias={categorias.filter((c) => c.ativo || c.id === produto.categoria_id)}
        valores={{
          nome: produto.nome,
          descricao: produto.descricao ?? "",
          categoria_id: produto.categoria_id ?? "",
          codigo_barras: produto.codigo_barras ?? "",
          unidade: produto.unidade,
          preco_custo: paraCampo(produto.preco_custo),
          preco_venda: paraCampo(produto.preco_venda),
          estoque_minimo: String(produto.estoque_minimo),
        }}
      />

      <SituacaoProduto id={produto.id} nome={produto.nome} ativo={produto.ativo} />
    </>
  );
}
