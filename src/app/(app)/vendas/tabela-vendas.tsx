import Link from "next/link";
import { ChevronRight, Receipt } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarDataHora, formatarMoeda } from "@/lib/format";
import type { VendaLista } from "@/lib/services/vendas";
import { ROTULO_FORMA } from "@/lib/validations/vendas";
import { cn } from "@/lib/utils";

/** Código curto da venda para mostrar e ditar ao telefone (ex.: "3F9A2C1B"). */
export function codigoVenda(id: string) {
  return id.slice(0, 8).toUpperCase();
}

export function TabelaVendas({ vendas }: { vendas: VendaLista[] }) {
  if (vendas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center">
        <Receipt className="size-8 text-muted-foreground" />
        <p className="font-medium">Nenhuma venda encontrada</p>
        <p className="text-sm text-muted-foreground">Mude o período ou os filtros.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead className="hidden sm:table-cell">Venda</TableHead>
            <TableHead className="hidden md:table-cell">Operador</TableHead>
            <TableHead className="hidden text-right lg:table-cell">Itens</TableHead>
            <TableHead>Forma</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendas.map((v) => {
            const cancelada = v.status === "cancelada";
            return (
              <TableRow key={v.id} className={cn("relative", cancelada && "text-muted-foreground")}>
                <TableCell className="whitespace-nowrap tabular-nums">
                  {/* O link cobre a linha inteira: clicar em qualquer lugar abre o detalhe. */}
                  <Link
                    href={`/vendas/${v.id}`}
                    className="after:absolute after:inset-0 focus-visible:outline-none"
                    aria-label={`Abrir venda ${codigoVenda(v.id)}`}
                  >
                    {formatarDataHora(v.created_at)}
                  </Link>
                </TableCell>
                <TableCell className="hidden tabular-nums sm:table-cell">{codigoVenda(v.id)}</TableCell>
                <TableCell className="hidden md:table-cell">{v.operador_nome}</TableCell>
                <TableCell className="hidden text-right tabular-nums lg:table-cell">{v.itens}</TableCell>
                <TableCell>{ROTULO_FORMA[v.forma_pagamento]}</TableCell>
                <TableCell className={cn("text-right font-medium tabular-nums", cancelada && "line-through")}>
                  {formatarMoeda(v.total)}
                </TableCell>
                <TableCell>
                  {cancelada ? (
                    <Badge variant="destructive">Cancelada</Badge>
                  ) : (
                    <Badge variant="outline">Concluída</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
