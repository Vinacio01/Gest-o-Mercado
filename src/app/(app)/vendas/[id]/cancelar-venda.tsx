"use client";

import { startTransition as iniciarTransicao, useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2 } from "lucide-react";

import { Campo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useResultadoAcao } from "@/hooks/use-resultado-acao";
import { ESTADO_INICIAL } from "@/lib/estado-formulario";

import { cancelarVendaAcao } from "../actions";

type Props = {
  vendaId: string;
  codigo: string;
  total: string;
  itens: number;
};

/**
 * Cancelamento com motivo obrigatório. O próprio diálogo é a confirmação:
 * diz o que vai acontecer (estoque devolvido, sai do painel) antes do clique.
 */
export function CancelarVenda(props: Props) {
  const [aberto, setAberto] = useState(false);
  // Cada abertura monta o formulário do zero (sem erro ou motivo antigos).
  const [abertura, setAbertura] = useState(0);

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        if (v) setAbertura((n) => n + 1);
        setAberto(v);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Ban /> Cancelar venda
        </Button>
      </DialogTrigger>
      <DialogContent>
        <FormularioCancelamento key={abertura} {...props} aoFechar={() => setAberto(false)} />
      </DialogContent>
    </Dialog>
  );
}

function FormularioCancelamento({
  vendaId,
  codigo,
  total,
  itens,
  aoFechar,
}: Props & { aoFechar: () => void }) {
  const router = useRouter();
  const [estado, enviar, pendente] = useActionState(
    cancelarVendaAcao.bind(null, vendaId),
    ESTADO_INICIAL,
  );

  useResultadoAcao(estado, aoFechar);

  // Erro do banco (ex.: a venda já foi cancelada em outra aba): recarrega a
  // página para mostrar a situação real. Erro de campo (motivo) não recarrega.
  useEffect(() => {
    if (estado.versao && !estado.ok && !estado.campos) router.refresh();
  }, [estado, router]);

  return (
    <>
        <DialogHeader>
          <DialogTitle>Cancelar a venda {codigo}?</DialogTitle>
          <DialogDescription>
            {itens === 1 ? "O item volta" : `Os ${itens} itens voltam`} para o estoque e os {total}{" "}
            saem do faturamento e do painel. A venda continua no histórico, marcada como cancelada.
            Não dá para desfazer.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const dados = new FormData(e.currentTarget);
            iniciarTransicao(() => enviar(dados));
          }}
          className="space-y-4"
        >
          <Campo id="motivo" rotulo="Motivo" erro={estado.campos?.motivo}>
            <Textarea
              id="motivo"
              name="motivo"
              rows={3}
              maxLength={300}
              autoFocus
              placeholder="Ex.: cliente desistiu, produto registrado errado"
              aria-invalid={estado.campos?.motivo ? true : undefined}
            />
          </Campo>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pendente} onClick={aoFechar}>
              Voltar
            </Button>
            <Button type="submit" variant="destructive" disabled={pendente}>
              {pendente ? <Loader2 className="animate-spin" /> : <Ban />}
              Cancelar venda
            </Button>
          </DialogFooter>
        </form>
    </>
  );
}
