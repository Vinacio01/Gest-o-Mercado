"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import type { EstadoFormulario } from "@/lib/estado-formulario";

/**
 * Mostra o toast de sucesso ou erro quando uma Server Action responde e chama
 * `aoConcluir` em caso de sucesso. Reage a cada envio (campo `versao`).
 */
export function useResultadoAcao(
  estado: EstadoFormulario,
  aoConcluir?: (estado: EstadoFormulario) => void,
) {
  const aoConcluirRef = useRef(aoConcluir);
  useEffect(() => {
    aoConcluirRef.current = aoConcluir;
  });

  useEffect(() => {
    if (!estado.versao) return;
    if (estado.ok) {
      if (estado.mensagem) toast.success(estado.mensagem);
      aoConcluirRef.current?.(estado);
    } else if (estado.erro) {
      toast.error(estado.erro);
    }
  }, [estado]);
}
