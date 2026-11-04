"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { alterarSituacaoProdutoAcao } from "../actions";

type Props = { id: string; nome: string; ativo: boolean };

/** Desativar (com confirmação) ou reativar o produto. */
export function SituacaoProduto({ id, nome, ativo }: Props) {
  const [pendente, iniciar] = useTransition();

  function alterar(novoAtivo: boolean) {
    iniciar(async () => {
      const resultado = await alterarSituacaoProdutoAcao(id, novoAtivo);
      if (resultado.ok) toast.success(resultado.mensagem);
      else toast.error(resultado.erro);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{ativo ? "Desativar produto" : "Produto desativado"}</CardTitle>
        <CardDescription>
          {ativo
            ? "O produto sai do caixa e das listas, mas o histórico de vendas e movimentações é mantido."
            : "Este produto não aparece no caixa. Reative para voltar a vendê-lo."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {ativo ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={pendente}>
                {pendente ? <Loader2 className="animate-spin" /> : null}
                Desativar produto
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Desativar &quot;{nome}&quot;?</AlertDialogTitle>
                <AlertDialogDescription>
                  O produto deixa de aparecer no caixa. Você pode reativá-lo depois.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={() => alterar(false)}>
                  Desativar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button variant="outline" disabled={pendente} onClick={() => alterar(true)}>
            {pendente ? <Loader2 className="animate-spin" /> : null}
            Reativar produto
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
