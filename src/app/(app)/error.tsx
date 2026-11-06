"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Tela de erro da área logada. Substitui a tela técnica do Next ("Application
 * error") por uma mensagem em português com a ação de tentar de novo. O
 * detalhe vai só para o console.
 */
export default function ErroDaArea({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] erro na tela", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <h1 className="font-display text-2xl font-bold text-titulo">Algo deu errado nesta tela</h1>
      <p className="text-muted-foreground">
        Pode ter sido uma falha de conexão. Nada do que já estava salvo foi perdido. Tente de novo; se
        continuar, recarregue a página.
      </p>
      <Button onClick={reset}>
        <RotateCcw /> Tentar de novo
      </Button>
    </div>
  );
}
