import { BellOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarDataHora } from "@/lib/format";
import type { AlertaRecente } from "@/lib/services/configuracoes";

function SituacaoAlerta({ alerta }: { alerta: AlertaRecente }) {
  if (alerta.status === "enviado") return <Badge className="bg-broto text-sobre-broto">Enviado</Badge>;
  if (alerta.resolvido_em) return <Badge variant="outline">Resolvido sem envio</Badge>;
  if (alerta.status === "falhou") return <Badge variant="destructive">Falhou</Badge>;
  return <Badge variant="secondary">Pendente</Badge>;
}

export function TabelaAlertas({ alertas }: { alertas: AlertaRecente[] }) {
  if (alertas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center">
        <BellOff className="size-8 text-muted-foreground" />
        <p className="font-medium">Nenhum alerta ainda</p>
        <p className="text-sm text-muted-foreground">
          Quando um produto chegar ao estoque mínimo, o alerta aparece aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Criado em</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Qtd. / mínimo</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead className="hidden text-right md:table-cell">Tentativas</TableHead>
            <TableHead className="hidden lg:table-cell">Detalhe</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alertas.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="whitespace-nowrap tabular-nums">
                {formatarDataHora(a.created_at)}
              </TableCell>
              <TableCell className="max-w-48 truncate font-medium">{a.produto_nome}</TableCell>
              <TableCell className="hidden text-right tabular-nums sm:table-cell">
                {a.quantidade_no_alerta} / {a.estoque_minimo_no_alerta} {a.unidade}
              </TableCell>
              <TableCell>
                <SituacaoAlerta alerta={a} />
              </TableCell>
              <TableCell className="hidden text-right tabular-nums md:table-cell">
                {a.tentativas}
              </TableCell>
              <TableCell className="hidden max-w-80 text-sm text-muted-foreground lg:table-cell">
                {a.status === "enviado" && a.enviado_em
                  ? `Enviado em ${formatarDataHora(a.enviado_em)}`
                  : a.ultimo_erro
                    ? <span className="text-destructive">{a.ultimo_erro}</span>
                    : a.resolvido_em
                      ? "Estoque reposto antes do envio"
                      : "Aguardando envio"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
