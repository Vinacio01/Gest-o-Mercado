"use client";

import { startTransition as iniciarTransicao, useActionState, useState } from "react";
import { Loader2 } from "lucide-react";

import { Campo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useResultadoAcao } from "@/hooks/use-resultado-acao";
import { ESTADO_INICIAL } from "@/lib/estado-formulario";

import { salvarConfiguracoesAcao } from "./actions";

type Props = {
  alertasAtivos: boolean;
  emailAlerta: string | null;
};

export function FormularioConfiguracoes({ alertasAtivos, emailAlerta }: Props) {
  const [estado, enviar, pendente] = useActionState(salvarConfiguracoesAcao, ESTADO_INICIAL);
  const [ativos, setAtivos] = useState(alertasAtivos);
  useResultadoAcao(estado);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        iniciarTransicao(() => enviar(dados));
      }}
      className="space-y-5"
    >
      <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
        <div className="space-y-1">
          <Label htmlFor="alertas_ativos">Enviar alertas de estoque baixo</Label>
          <p className="text-sm text-muted-foreground">
            Um e-mail por produto quando ele chega ao estoque mínimo.
          </p>
        </div>
        <Switch
          id="alertas_ativos"
          name="alertas_ativos"
          checked={ativos}
          onCheckedChange={setAtivos}
        />
      </div>

      <Campo
        id="email_alerta"
        rotulo="E-mail de destino"
        erro={estado.campos?.email_alerta}
        ajuda="Quem recebe os alertas. Normalmente o e-mail do proprietário."
      >
        <Input
          id="email_alerta"
          name="email_alerta"
          type="email"
          autoComplete="email"
          defaultValue={emailAlerta ?? ""}
          placeholder="dono@exemplo.com"
          aria-invalid={estado.campos?.email_alerta ? true : undefined}
        />
      </Campo>

      <Button type="submit" disabled={pendente}>
        {pendente ? <Loader2 className="animate-spin" /> : null}
        Salvar
      </Button>
    </form>
  );
}
