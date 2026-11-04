"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { entrar, type EstadoLogin } from "./actions";

const estadoInicial: EstadoLogin = {};

type Props = {
  aviso?: string;
};

export function FormularioLogin({ aviso }: Props) {
  const [estado, acao, pendente] = useActionState(entrar, estadoInicial);
  const mensagem = estado.erro ?? aviso;

  return (
    <form action={acao} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          defaultValue={estado.email}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="senha">Senha</Label>
        <Input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {mensagem ? (
        <p role="alert" className="text-sm text-destructive">
          {mensagem}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pendente}>
        {pendente ? <Loader2 className="animate-spin" /> : null}
        {pendente ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
