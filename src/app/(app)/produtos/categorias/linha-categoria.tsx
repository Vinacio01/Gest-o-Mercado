"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { alterarSituacaoCategoriaAcao, renomearCategoriaAcao } from "../actions";
import { FormularioNomeCategoria } from "./formulario-categoria";

type Props = {
  categoria: { id: string; nome: string; ativo: boolean; produtos: number };
};

export function LinhaCategoria({ categoria }: Props) {
  const [renomeando, setRenomeando] = useState(false);
  const [pendente, iniciar] = useTransition();

  function alterarSituacao(ativo: boolean) {
    iniciar(async () => {
      const resultado = await alterarSituacaoCategoriaAcao(categoria.id, ativo);
      if (resultado.ok) toast.success(resultado.mensagem);
      else toast.error(resultado.erro);
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={categoria.ativo ? "font-medium" : "font-medium text-muted-foreground"}>
            {categoria.nome}
          </span>
          {!categoria.ativo ? <Badge variant="outline">Desativada</Badge> : null}
        </div>
        <span className="text-xs text-muted-foreground">
          {categoria.produtos === 1 ? "1 produto ativo" : `${categoria.produtos} produtos ativos`}
        </span>
      </div>

      <Dialog open={renomeando} onOpenChange={setRenomeando}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            <Pencil /> Renomear
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear categoria</DialogTitle>
          </DialogHeader>
          <FormularioNomeCategoria
            idCampo={`renomear-${categoria.id}`}
            acao={renomearCategoriaAcao.bind(null, categoria.id)}
            valorInicial={categoria.nome}
            rotuloBotao="Salvar"
            aoConcluir={() => setRenomeando(false)}
          />
        </DialogContent>
      </Dialog>

      {categoria.ativo ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={pendente}>
              {pendente ? <Loader2 className="animate-spin" /> : null}
              Desativar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desativar &quot;{categoria.nome}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>
                A categoria some do cadastro de produtos. Os produtos que já estão nela continuam
                com ela.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => alterarSituacao(false)}>
                Desativar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Button variant="ghost" size="sm" disabled={pendente} onClick={() => alterarSituacao(true)}>
          {pendente ? <Loader2 className="animate-spin" /> : null}
          Reativar
        </Button>
      )}
    </li>
  );
}
