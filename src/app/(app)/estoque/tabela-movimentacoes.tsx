import { History } from "lucide-react";

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
import type { Movimentacao } from "@/lib/services/estoque";
import { ROTULO_TIPO } from "@/lib/validations/estoque";

// Cor pelo sentido: entra estoque = verde (Broto), sai = vermelho, venda e
// ajuste neutros. Vermelho no sistema sempre quer dizer redução ou problema.
const ESTILO_TIPO: Record<Movimentacao["tipo"], string> = {
  entrada: "bg-broto text-sobre-broto",
  cancelamento_venda: "bg-broto/15 text-broto",
  venda: "border-border bg-transparent text-foreground",
  saida_manual: "bg-destructive/10 text-destructive",
  ajuste: "bg-secondary text-secondary-foreground",
};

/** "+10", "−3" ou "= 25" (ajuste registra o novo total). */
function quantidadeComSinal(m: Movimentacao): string {
  if (m.tipo === "ajuste") return `= ${m.quantidade}`;
  const entra = m.tipo === "entrada" || m.tipo === "cancelamento_venda";
  return `${entra ? "+" : "−"}${m.quantidade}`;
}

export function TabelaMovimentacoes({ movimentacoes }: { movimentacoes: Movimentacao[] }) {
  if (movimentacoes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center">
        <History className="size-8 text-muted-foreground" />
        <p className="font-medium">Nenhuma movimentação encontrada</p>
        <p className="text-sm text-muted-foreground">
          Entradas, saídas, ajustes e vendas aparecem aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Qtd.</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Antes → depois</TableHead>
            <TableHead className="hidden lg:table-cell">Usuário</TableHead>
            <TableHead className="hidden md:table-cell">Motivo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movimentacoes.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="whitespace-nowrap tabular-nums">
                {formatarDataHora(m.created_at)}
              </TableCell>
              <TableCell className="max-w-56 truncate font-medium">{m.produto_nome}</TableCell>
              <TableCell>
                <Badge className={ESTILO_TIPO[m.tipo]}>{ROTULO_TIPO[m.tipo]}</Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">{quantidadeComSinal(m)}</TableCell>
              <TableCell className="hidden text-right tabular-nums sm:table-cell">
                {m.quantidade_anterior} → {m.quantidade_posterior} {m.unidade}
              </TableCell>
              <TableCell className="hidden lg:table-cell">{m.usuario_nome}</TableCell>
              <TableCell className="hidden max-w-64 truncate text-muted-foreground md:table-cell">
                {m.motivo ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
