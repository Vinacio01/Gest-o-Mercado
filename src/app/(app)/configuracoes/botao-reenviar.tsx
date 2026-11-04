"use client";

import { useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { reenviarAlertasAcao } from "./actions";

export function BotaoReenviar({ aguardando }: { aguardando: number }) {
  const [pendente, iniciar] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          const resultado = await reenviarAlertasAcao();
          if (resultado.ok) toast.success(resultado.mensagem);
          else toast.error(resultado.erro);
        })
      }
    >
      {pendente ? <Loader2 className="animate-spin" /> : <Send />}
      Reenviar alertas pendentes{aguardando > 0 ? ` (${aguardando})` : ""}
    </Button>
  );
}
