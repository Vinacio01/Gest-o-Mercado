import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Tags } from "lucide-react";

import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { Paginacao } from "@/components/paginacao";
import { Button } from "@/components/ui/button";
import { listarCategorias, listarProdutos, PRODUTOS_POR_PAGINA } from "@/lib/services/produtos";
import { exigirUsuario } from "@/lib/services/sessao";
import { esquemaFiltrosProdutos } from "@/lib/validations/produtos";

import { FiltrosProdutosForm } from "./filtros-produtos";
import { TabelaProdutos } from "./tabela-produtos";

export const metadata: Metadata = { title: "Produtos" };

export default async function PaginaProdutos({ searchParams }: PageProps<"/produtos">) {
  const usuario = await exigirUsuario();
  const ehProprietario = usuario.papel === "proprietario";

  const parametros = await searchParams;
  const filtros = esquemaFiltrosProdutos.parse(
    Object.fromEntries(
      Object.entries(parametros).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
    ),
  );

  const [{ produtos, total, pagina }, categorias] = await Promise.all([
    listarProdutos(filtros, usuario.papel),
    listarCategorias(),
  ]);

  return (
    <>
      <CabecalhoPagina
        titulo="Produtos"
        descricao={
          ehProprietario
            ? "Catálogo, preços e quantidades em estoque."
            : "Consulte preços e quantidades em estoque."
        }
        acoes={
          ehProprietario ? (
            <>
              <Button variant="outline" asChild>
                <Link href="/produtos/categorias">
                  <Tags /> Categorias
                </Link>
              </Button>
              <Button asChild>
                <Link href="/produtos/novo">
                  <Plus /> Novo produto
                </Link>
              </Button>
            </>
          ) : null
        }
      />

      <FiltrosProdutosForm
        filtros={filtros}
        categorias={categorias.filter((c) => c.ativo || c.id === filtros.categoria)}
        ehProprietario={ehProprietario}
      />

      <TabelaProdutos produtos={produtos} ehProprietario={ehProprietario} />

      <Paginacao
        caminho="/produtos"
        parametros={{
          busca: filtros.busca || undefined,
          categoria: filtros.categoria,
          estoque: filtros.estoque === "todos" ? undefined : filtros.estoque,
          ordem: filtros.ordem === "nome" ? undefined : filtros.ordem,
          inativos: filtros.inativos ? "1" : undefined,
        }}
        pagina={pagina}
        total={total}
        porPagina={PRODUTOS_POR_PAGINA}
        rotuloItens={total === 1 ? "produto" : "produtos"}
      />
    </>
  );
}
