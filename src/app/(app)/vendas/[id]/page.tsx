import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban } from "lucide-react";
import { z } from "zod";

import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarCentavos, formatarDataHora, formatarMoeda, paraCentavos } from "@/lib/format";
import { exigirProprietario } from "@/lib/services/sessao";
import { obterVenda } from "@/lib/services/vendas";
import { ROTULO_FORMA } from "@/lib/validations/vendas";

import { codigoVenda } from "../tabela-vendas";
import { CancelarVenda } from "./cancelar-venda";

export const metadata: Metadata = { title: "Venda" };

function Dado({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

export default async function PaginaVenda({ params }: PageProps<"/vendas/[id]">) {
  await exigirProprietario();

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const venda = await obterVenda(id);
  if (!venda) notFound();

  const codigo = codigoVenda(venda.id);
  const cancelada = venda.status === "cancelada";
  // Lucro bruto da venda em centavos (sem ponto flutuante).
  const lucro = paraCentavos(venda.total) - paraCentavos(venda.custo_total);
  const unidades = venda.itens.reduce((s, i) => s + i.quantidade, 0);

  return (
    <>
      <CabecalhoPagina
        titulo={`Venda ${codigo}`}
        descricao={formatarDataHora(venda.created_at)}
        acoes={
          <>
            <Button variant="outline" asChild>
              <Link href="/vendas">
                <ArrowLeft /> Vendas
              </Link>
            </Button>
            {!cancelada ? (
              <CancelarVenda
                vendaId={venda.id}
                codigo={codigo}
                total={formatarMoeda(venda.total)}
                itens={venda.itens.length}
              />
            ) : null}
          </>
        }
      />

      {cancelada ? (
        <div
          role="status"
          className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          <Ban className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p>
            <strong>Venda cancelada</strong>
            {venda.cancelada_em ? ` em ${formatarDataHora(venda.cancelada_em)}` : ""}
            {venda.cancelada_por_nome ? ` por ${venda.cancelada_por_nome}` : ""}. Motivo:{" "}
            {venda.motivo_cancelamento}. O estoque foi devolvido e ela não entra no painel.
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Itens</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {venda.itens.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.produto_nome}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {i.quantidade} {i.unidade}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatarMoeda(i.preco_unitario)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatarMoeda(i.subtotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right tabular-nums">{unidades}</TableCell>
                  <TableCell />
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatarMoeda(venda.total)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
            <p className="mt-3 text-xs text-muted-foreground">
              Preços e custos registrados no momento da venda.
            </p>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4">
              <Dado rotulo="Situação">
                {cancelada ? (
                  <Badge variant="destructive">Cancelada</Badge>
                ) : (
                  <Badge variant="outline">Concluída</Badge>
                )}
              </Dado>
              <Dado rotulo="Forma de pagamento">{ROTULO_FORMA[venda.forma_pagamento]}</Dado>
              <Dado rotulo="Operador">{venda.operador_nome}</Dado>
              <Dado rotulo="Faturamento">
                <span className="numero">{formatarMoeda(venda.total)}</span>
              </Dado>
              <Dado rotulo="Custo das mercadorias vendidas">
                <span className="tabular-nums">{formatarMoeda(venda.custo_total)}</span>
              </Dado>
              <Dado rotulo="Lucro bruto estimado">
                <span className="tabular-nums">{formatarCentavos(lucro)}</span>
              </Dado>
            </dl>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
