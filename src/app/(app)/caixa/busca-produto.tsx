"use client";

import { useState } from "react";
import { Barcode, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { buscarProdutos, produtoPorCodigo, type ProdutoCaixa } from "@/lib/caixa";
import { formatarMoeda } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  produtos: ProdutoCaixa[];
  aoEscolher: (produto: ProdutoCaixa) => void;
  aoNaoEncontrar: (busca: string) => void;
  ref?: React.Ref<HTMLInputElement>;
};

/**
 * Campo de busca do caixa. O leitor de código de barras funciona como teclado:
 * digita o código e aperta Enter. Código exato + Enter adiciona direto; senão,
 * Enter adiciona o resultado destacado (setas mudam o destaque).
 */
export function BuscaProduto({ produtos, aoEscolher, aoNaoEncontrar, ref }: Props) {
  const [busca, setBusca] = useState("");
  const [destaque, setDestaque] = useState(0);
  const resultados = buscarProdutos(produtos, busca);

  function escolher(produto: ProdutoCaixa) {
    aoEscolher(produto);
    setBusca("");
    setDestaque(0);
  }

  function aoTeclar(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setDestaque((d) => Math.min(d + 1, resultados.length - 1));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setDestaque((d) => Math.max(d - 1, 0));
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      if (!busca.trim()) return;
      const porCodigo = produtoPorCodigo(produtos, busca);
      const escolhido = porCodigo ?? resultados[destaque];
      if (escolhido) escolher(escolhido);
      else {
        aoNaoEncontrar(busca.trim());
        setBusca("");
      }
    } else if (evento.key === "Escape" && busca) {
      // Esc com texto só limpa a busca; não cancela a venda.
      evento.preventDefault();
      evento.stopPropagation();
      setBusca("");
      setDestaque(0);
    }
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={ref}
        autoFocus
        value={busca}
        onChange={(e) => {
          setBusca(e.target.value);
          setDestaque(0);
        }}
        onKeyDown={aoTeclar}
        placeholder="Leia o código de barras ou digite o nome do produto"
        className="h-12 pr-11 pl-11 text-base md:text-base"
        aria-label="Buscar produto"
        aria-controls="resultados-caixa"
        aria-activedescendant={resultados[destaque] ? `resultado-${resultados[destaque].id}` : undefined}
        autoComplete="off"
        spellCheck={false}
      />
      <Barcode className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-muted-foreground" />

      {busca.trim() && resultados.length > 0 ? (
        <ul
          id="resultados-caixa"
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border bg-popover shadow-md"
        >
          {resultados.map((p, indice) => {
            const semEstoque = p.quantidade <= 0;
            return (
              <li
                key={p.id}
                id={`resultado-${p.id}`}
                role="option"
                aria-selected={indice === destaque}
                aria-disabled={semEstoque || undefined}
                // onMouseDown: escolhe antes de o campo perder o foco.
                onMouseDown={(e) => {
                  e.preventDefault();
                  escolher(p);
                }}
                onMouseEnter={() => setDestaque(indice)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 px-3 py-2 text-sm",
                  indice === destaque && "bg-accent",
                  semEstoque && "text-muted-foreground",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.nome}</p>
                  {p.codigo_barras ? (
                    <p className="font-mono text-xs text-muted-foreground">{p.codigo_barras}</p>
                  ) : null}
                </div>
                <span className={cn("text-xs tabular-nums", semEstoque && "font-medium text-destructive")}>
                  {semEstoque ? "Sem estoque" : `${p.quantidade} ${p.unidade}`}
                </span>
                <span className="w-24 text-right font-medium tabular-nums">
                  {formatarMoeda(p.preco_venda)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
