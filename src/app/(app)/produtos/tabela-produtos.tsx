import Link from "next/link";
import { ArrowLeftRight, PackageSearch, Pencil } from "lucide-react";

import { IndicadorEstoque } from "@/components/indicador-estoque";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarMoeda } from "@/lib/format";
import type { ProdutoLista } from "@/lib/services/produtos";

type Props = {
  produtos: ProdutoLista[];
  ehProprietario: boolean;
};

/** Tabela de produtos. As colunas de custo só existem para o proprietário. */
export function TabelaProdutos({ produtos, ehProprietario }: Props) {
  if (produtos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center">
        <PackageSearch className="size-8 text-muted-foreground" />
        <p className="font-medium">Nenhum produto encontrado</p>
        <p className="text-sm text-muted-foreground">Tente mudar a busca ou os filtros.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead className="hidden md:table-cell">Categoria</TableHead>
            {ehProprietario ? <TableHead className="text-right">Custo</TableHead> : null}
            <TableHead className="text-right">Preço</TableHead>
            <TableHead className="text-right">Estoque</TableHead>
            <TableHead className="hidden text-right lg:table-cell">Mínimo</TableHead>
            {ehProprietario ? <TableHead className="w-0" /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {produtos.map((p) => (
            <TableRow key={p.id} className={p.ativo ? undefined : "text-muted-foreground"}>
              <TableCell className="max-w-72">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{p.nome}</span>
                  {!p.ativo ? <Badge variant="outline">Desativado</Badge> : null}
                </div>
                {p.codigo_barras ? (
                  <span className="font-mono text-xs text-muted-foreground">{p.codigo_barras}</span>
                ) : null}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {p.categoria_nome ?? <span className="text-muted-foreground">—</span>}
              </TableCell>
              {ehProprietario ? (
                <TableCell className="text-right tabular-nums">
                  {p.preco_custo !== null ? formatarMoeda(p.preco_custo) : "—"}
                </TableCell>
              ) : null}
              <TableCell className="text-right tabular-nums">{formatarMoeda(p.preco_venda)}</TableCell>
              <TableCell className="text-right">
                <IndicadorEstoque
                  quantidade={p.quantidade}
                  estoqueMinimo={p.estoque_minimo}
                  unidade={p.unidade}
                />
              </TableCell>
              <TableCell className="hidden text-right tabular-nums lg:table-cell">
                {p.estoque_minimo}
              </TableCell>
              {ehProprietario ? (
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" asChild>
                      <Link
                        href={`/estoque?movimentar=${p.id}&produto=${p.id}`}
                        aria-label={`Movimentar estoque de ${p.nome}`}
                        title="Movimentar estoque"
                      >
                        <ArrowLeftRight />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon-sm" asChild>
                      <Link
                        href={`/produtos/${p.id}`}
                        aria-label={`Editar ${p.nome}`}
                        title="Editar"
                      >
                        <Pencil />
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
