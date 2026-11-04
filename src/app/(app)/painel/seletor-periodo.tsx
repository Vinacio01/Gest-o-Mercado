"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PERIODOS, ROTULO_PERIODO, type Periodo } from "@/lib/periodos";

/** Escolha do período; fica na URL (?periodo=) e a página recalcula no servidor. */
export function SeletorPeriodo({ periodo }: { periodo: Periodo }) {
  const router = useRouter();
  const caminho = usePathname();
  const [carregando, iniciar] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Período">
      {PERIODOS.map((p) => (
        <Button
          key={p}
          size="sm"
          role="radio"
          aria-checked={p === periodo}
          variant={p === periodo ? "default" : "outline"}
          onClick={() =>
            iniciar(() => router.replace(p === "mes" ? caminho : `${caminho}?periodo=${p}`, { scroll: false }))
          }
        >
          {ROTULO_PERIODO[p]}
        </Button>
      ))}
      {carregando ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Carregando" />
      ) : null}
    </div>
  );
}
