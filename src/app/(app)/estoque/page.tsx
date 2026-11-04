import type { Metadata } from "next";

import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { Paginacao } from "@/components/paginacao";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listarMovimentacoes,
  listarProdutosParaSelecao,
  MOVIMENTACOES_POR_PAGINA,
} from "@/lib/services/estoque";
import { exigirProprietario } from "@/lib/services/sessao";
import { esquemaFiltrosMovimentacoes } from "@/lib/validations/estoque";

import { FiltrosMovimentacoesForm } from "./filtros-movimentacoes";
import { FormularioMovimentacao } from "./formulario-movimentacao";
import { TabelaMovimentacoes } from "./tabela-movimentacoes";

export const metadata: Metadata = { title: "Estoque" };

export default async function PaginaEstoque({ searchParams }: PageProps<"/estoque">) {
  await exigirProprietario();

  const parametros = await searchParams;
  const filtros = esquemaFiltrosMovimentacoes.parse(
    Object.fromEntries(
      Object.entries(parametros).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
    ),
  );

  const [produtos, { movimentacoes, total, pagina }] = await Promise.all([
    listarProdutosParaSelecao(),
    listarMovimentacoes(filtros),
  ]);

  return (
    <>
      <CabecalhoPagina
        titulo="Estoque"
        descricao="Registre entradas, saídas e ajustes. Toda alteração fica no histórico."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Nova movimentação</CardTitle>
          </CardHeader>
          <CardContent>
            {/* key: escolher outro produto pela lista recria o formulário já preenchido. */}
            <FormularioMovimentacao
              key={filtros.movimentar ?? "novo"}
              produtos={produtos}
              produtoInicial={filtros.movimentar}
            />
          </CardContent>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <h2 className="text-lg font-semibold">Histórico</h2>
          <FiltrosMovimentacoesForm filtros={filtros} produtos={produtos} />
          <TabelaMovimentacoes movimentacoes={movimentacoes} />
          <Paginacao
            caminho="/estoque"
            parametros={{
              produto: filtros.produto,
              tipo: filtros.tipo,
              de: filtros.de,
              ate: filtros.ate,
              movimentar: filtros.movimentar,
            }}
            pagina={pagina}
            total={total}
            porPagina={MOVIMENTACOES_POR_PAGINA}
            rotuloItens={total === 1 ? "movimentação" : "movimentações"}
          />
        </div>
      </div>
    </>
  );
}
