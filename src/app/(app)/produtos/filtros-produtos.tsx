"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Categoria } from "@/lib/services/produtos";
import type { FiltrosProdutos } from "@/lib/validations/produtos";

type Props = {
  filtros: FiltrosProdutos;
  categorias: Categoria[];
  ehProprietario: boolean;
};

const SITUACOES = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "baixo", rotulo: "Estoque baixo" },
  { valor: "sem", rotulo: "Sem estoque" },
] as const;

const TODAS = "todas";

/**
 * Filtros da lista de produtos. Cada mudança atualiza a URL; a página (Server
 * Component) lê a URL e consulta o banco. Assim o filtro sobrevive ao recarregar
 * e pode ser compartilhado por link.
 */
export function FiltrosProdutosForm({ filtros, categorias, ehProprietario }: Props) {
  const router = useRouter();
  const caminho = usePathname();
  const parametros = useSearchParams();
  const [carregando, iniciarTransicao] = useTransition();
  const [busca, setBusca] = useState(filtros.busca);

  function atualizar(mudancas: Record<string, string | null>) {
    const novos = new URLSearchParams(parametros.toString());
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor) novos.set(chave, valor);
      else novos.delete(chave);
    }
    novos.delete("pagina"); // filtro novo começa na primeira página
    const texto = novos.toString();
    iniciarTransicao(() => {
      router.replace(texto ? `${caminho}?${texto}` : caminho, { scroll: false });
    });
  }

  // Busca enquanto digita, com uma pequena espera para não consultar a cada tecla.
  useEffect(() => {
    if (busca.trim() === filtros.busca) return;
    const espera = setTimeout(() => atualizar({ busca: busca.trim() || null }), 300);
    return () => clearTimeout(espera);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage à digitação
  }, [busca]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou código de barras"
            className="pl-8"
            aria-label="Buscar produtos"
          />
        </div>

        <Select
          value={filtros.categoria ?? TODAS}
          onValueChange={(v) => atualizar({ categoria: v === TODAS ? null : v })}
        >
          <SelectTrigger className="w-full md:w-52" aria-label="Categoria">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS}>Todas as categorias</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
                {c.ativo ? "" : " (inativa)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filtros.ordem}
          onValueChange={(v) => atualizar({ ordem: v === "nome" ? null : v })}
        >
          <SelectTrigger className="w-full md:w-52" aria-label="Ordenar por">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nome">Ordenar por nome</SelectItem>
            <SelectItem value="quantidade_asc">Menor quantidade</SelectItem>
            <SelectItem value="quantidade_desc">Maior quantidade</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {SITUACOES.map((s) => (
          <Button
            key={s.valor}
            size="sm"
            variant={filtros.estoque === s.valor ? "default" : "outline"}
            aria-pressed={filtros.estoque === s.valor}
            onClick={() => atualizar({ estoque: s.valor === "todos" ? null : s.valor })}
          >
            {s.rotulo}
          </Button>
        ))}

        {ehProprietario ? (
          <Button
            size="sm"
            variant={filtros.inativos ? "secondary" : "ghost"}
            aria-pressed={filtros.inativos}
            onClick={() => atualizar({ inativos: filtros.inativos ? null : "1" })}
          >
            {filtros.inativos ? "Ocultar desativados" : "Mostrar desativados"}
          </Button>
        ) : null}

        {carregando ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Carregando" />
        ) : null}
      </div>
    </div>
  );
}
