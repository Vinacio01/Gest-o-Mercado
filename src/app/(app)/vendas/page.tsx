import type { Metadata } from "next";

import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { Paginacao } from "@/components/paginacao";
import { exigirProprietario } from "@/lib/services/sessao";
import { listarVendas, VENDAS_POR_PAGINA } from "@/lib/services/vendas";
import { esquemaFiltrosVendas } from "@/lib/validations/vendas";

import { FiltrosVendasForm } from "./filtros-vendas";
import { TabelaVendas } from "./tabela-vendas";

export const metadata: Metadata = { title: "Vendas" };

export default async function PaginaVendas({ searchParams }: PageProps<"/vendas">) {
  await exigirProprietario();

  const parametros = await searchParams;
  const filtros = esquemaFiltrosVendas.parse(
    Object.fromEntries(
      Object.entries(parametros).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
    ),
  );

  const { vendas, total, pagina } = await listarVendas(filtros);

  return (
    <>
      <CabecalhoPagina
        titulo="Vendas"
        descricao="Histórico de vendas do caixa. Abra uma venda para ver os itens ou cancelar."
      />
      <FiltrosVendasForm filtros={filtros} />
      <TabelaVendas vendas={vendas} />
      <Paginacao
        caminho="/vendas"
        parametros={{ de: filtros.de, ate: filtros.ate, forma: filtros.forma, status: filtros.status }}
        pagina={pagina}
        total={total}
        porPagina={VENDAS_POR_PAGINA}
        rotuloItens={total === 1 ? "venda" : "vendas"}
      />
    </>
  );
}
