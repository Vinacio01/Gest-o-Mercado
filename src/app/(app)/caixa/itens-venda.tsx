"use client";

import { Minus, Plus, ScanBarcode, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { subtotalCentavos, type ItemCarrinho } from "@/lib/caixa";
import { formatarCentavos, formatarMoeda } from "@/lib/format";

type Props = {
  itens: ItemCarrinho[];
  aoMudarQuantidade: (produtoId: string, quantidade: number) => void;
  aoRemover: (produtoId: string) => void;
};

export function ItensVenda({ itens, aoMudarQuantidade, aoRemover }: Props) {
  if (itens.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
        <ScanBarcode className="size-10 text-muted-foreground" />
        <p className="font-medium">Nenhum produto na venda</p>
        <p className="text-sm text-muted-foreground">
          Leia o código de barras ou busque o produto pelo nome.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y rounded-lg border" aria-label="Itens da venda">
      {itens.map((item) => {
        const { produto, quantidade } = item;
        const noLimite = quantidade >= produto.quantidade;
        return (
          <li key={produto.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
            <div className="min-w-0 flex-1 basis-48">
              <p className="truncate font-medium">{produto.nome}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatarMoeda(produto.preco_venda)} / {produto.unidade}
                {noLimite ? " · limite do estoque" : null}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => aoMudarQuantidade(produto.id, quantidade - 1)}
                aria-label={`Diminuir ${produto.nome}`}
              >
                <Minus />
              </Button>
              <Input
                value={quantidade}
                inputMode="numeric"
                onChange={(e) => {
                  const n = Number(e.target.value.replace(/\D/g, ""));
                  if (n > 0) aoMudarQuantidade(produto.id, n);
                }}
                onFocus={(e) => e.target.select()}
                className="h-7 w-14 text-center tabular-nums"
                aria-label={`Quantidade de ${produto.nome}`}
              />
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => aoMudarQuantidade(produto.id, quantidade + 1)}
                disabled={noLimite}
                aria-label={`Aumentar ${produto.nome}`}
              >
                <Plus />
              </Button>
            </div>

            <span className="w-24 text-right font-semibold tabular-nums">
              {formatarCentavos(subtotalCentavos(item))}
            </span>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => aoRemover(produto.id)}
              aria-label={`Remover ${produto.nome}`}
            >
              <X />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
