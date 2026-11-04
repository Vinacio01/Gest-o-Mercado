"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { contemTermos } from "@/lib/texto";
import { cn } from "@/lib/utils";

export type OpcaoProduto = {
  id: string;
  nome: string;
  codigo_barras: string | null;
  unidade: string;
  quantidade: number;
};

type Props = {
  id?: string;
  produtos: OpcaoProduto[];
  valor: string | null;
  aoMudar: (id: string | null) => void;
  /** Texto do botão quando nada está escolhido. */
  placeholder?: string;
  /** Mostra a opção "Todos os produtos" (usado nos filtros). */
  permitirTodos?: boolean;
  invalido?: boolean;
};

/** Caixa de seleção com busca por nome ou código de barras. */
export function SeletorProduto({
  id,
  produtos,
  valor,
  aoMudar,
  placeholder = "Escolha um produto",
  permitirTodos = false,
  invalido = false,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const selecionado = produtos.find((p) => p.id === valor);

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={aberto}
          aria-invalid={invalido || undefined}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !selecionado && "text-muted-foreground")}>
            {selecionado ? selecionado.nome : placeholder}
          </span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
        {/* Filtro próprio: por palavras, sem diferenciar acentos, só no nome e no código. */}
        <Command
          filter={(_valor, busca, palavras = []) =>
            contemTermos(palavras.join(" "), busca) ? 1 : 0
          }
        >
          <CommandInput placeholder="Buscar por nome ou código..." />
          <CommandList>
            <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
            <CommandGroup>
              {permitirTodos ? (
                <CommandItem
                  value="__todos__"
                  keywords={["todos"]}
                  onSelect={() => {
                    aoMudar(null);
                    setAberto(false);
                  }}
                >
                  <Check className={cn(valor ? "opacity-0" : "opacity-100")} />
                  Todos os produtos
                </CommandItem>
              ) : null}
              {produtos.map((produto) => (
                <CommandItem
                  key={produto.id}
                  value={produto.id}
                  keywords={[produto.nome, produto.codigo_barras ?? ""]}
                  onSelect={() => {
                    aoMudar(produto.id);
                    setAberto(false);
                  }}
                >
                  <Check className={cn(produto.id === valor ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1 truncate">{produto.nome}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {produto.quantidade} {produto.unidade}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
