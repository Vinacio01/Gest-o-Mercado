"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, X } from "lucide-react";

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
  FORMAS_PAGAMENTO,
  ROTULO_FORMA,
  ROTULO_STATUS,
  STATUS_VENDA,
  type FiltrosVendas,
} from "@/lib/validations/vendas";

const TODAS = "todas";

/** Filtros do histórico, guardados na URL (a página consulta o banco). */
export function FiltrosVendasForm({ filtros }: { filtros: FiltrosVendas }) {
  const router = useRouter();
  const caminho = usePathname();
  const parametros = useSearchParams();
  const [carregando, iniciar] = useTransition();

  function atualizar(mudancas: Record<string, string | null>) {
    const novos = new URLSearchParams(parametros.toString());
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor) novos.set(chave, valor);
      else novos.delete(chave);
    }
    novos.delete("pagina");
    const texto = novos.toString();
    iniciar(() => router.replace(texto ? `${caminho}?${texto}` : caminho, { scroll: false }));
  }

  const temFiltro = Boolean(filtros.de || filtros.ate || filtros.forma || filtros.status);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.2fr_1.2fr_auto] lg:items-end">
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
      <div className="space-y-2">
        <Label htmlFor="filtro-forma">Forma de pagamento</Label>
        <Select
          value={filtros.forma ?? TODAS}
          onValueChange={(v) => atualizar({ forma: v === TODAS ? null : v })}
        >
          <SelectTrigger id="filtro-forma" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS}>Todas as formas</SelectItem>
            {FORMAS_PAGAMENTO.map((f) => (
              <SelectItem key={f} value={f}>
                {ROTULO_FORMA[f]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="filtro-status">Situação</Label>
        <Select
          value={filtros.status ?? TODAS}
          onValueChange={(v) => atualizar({ status: v === TODAS ? null : v })}
        >
          <SelectTrigger id="filtro-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS}>Todas as situações</SelectItem>
            {STATUS_VENDA.map((s) => (
              <SelectItem key={s} value={s}>
                {ROTULO_STATUS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex h-8 items-center gap-2">
        {temFiltro ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => atualizar({ de: null, ate: null, forma: null, status: null })}
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
