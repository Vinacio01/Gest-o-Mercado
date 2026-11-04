"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, X } from "lucide-react";

import { SeletorProduto, type OpcaoProduto } from "@/components/seletor-produto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ROTULO_TIPO,
  TIPOS_MOVIMENTACAO,
  type FiltrosMovimentacoes,
} from "@/lib/validations/estoque";

type Props = {
  filtros: FiltrosMovimentacoes;
  produtos: OpcaoProduto[];
};

const TODOS = "todos";

/** Filtros do histórico, guardados na URL (a página consulta o banco). */
export function FiltrosMovimentacoesForm({ filtros, produtos }: Props) {
  const router = useRouter();
  const caminho = usePathname();
  const parametros = useSearchParams();
  const [carregando, iniciarTransicao] = useTransition();

  function atualizar(mudancas: Record<string, string | null>) {
    const novos = new URLSearchParams(parametros.toString());
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor) novos.set(chave, valor);
      else novos.delete(chave);
    }
    novos.delete("pagina");
    const texto = novos.toString();
    iniciarTransicao(() => {
      router.replace(texto ? `${caminho}?${texto}` : caminho, { scroll: false });
    });
  }

  const temFiltro = Boolean(filtros.produto || filtros.tipo || filtros.de || filtros.ate);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1.4fr_1fr_1fr_auto] lg:items-end">
      <div className="space-y-2">
        <Label htmlFor="filtro-produto">Produto</Label>
        <SeletorProduto
          id="filtro-produto"
          produtos={produtos}
          valor={filtros.produto ?? null}
          aoMudar={(id) => atualizar({ produto: id })}
          placeholder="Todos os produtos"
          permitirTodos
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="filtro-tipo">Tipo</Label>
        <Select
          value={filtros.tipo ?? TODOS}
          onValueChange={(v) => atualizar({ tipo: v === TODOS ? null : v })}
        >
          <SelectTrigger id="filtro-tipo" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os tipos</SelectItem>
            {TIPOS_MOVIMENTACAO.map((t) => (
              <SelectItem key={t} value={t}>
                {ROTULO_TIPO[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="filtro-de">De</Label>
        <Input
          id="filtro-de"
          type="date"
          value={filtros.de ?? ""}
          max={filtros.ate}
          onChange={(e) => atualizar({ de: e.target.value || null })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="filtro-ate">Até</Label>
        <Input
          id="filtro-ate"
          type="date"
          value={filtros.ate ?? ""}
          min={filtros.de}
          onChange={(e) => atualizar({ ate: e.target.value || null })}
        />
      </div>

      <div className="flex h-8 items-center gap-2">
        {temFiltro ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => atualizar({ produto: null, tipo: null, de: null, ate: null })}
          >
            <X /> Limpar
          </Button>
        ) : null}
        {carregando ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Carregando" />
        ) : null}
      </div>
    </div>
  );
}
