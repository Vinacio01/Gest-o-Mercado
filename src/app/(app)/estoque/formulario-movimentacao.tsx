"use client";

import { startTransition as iniciarTransicao, useActionState, useRef, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Loader2, SlidersHorizontal } from "lucide-react";

import { Campo } from "@/components/campo";
import { SeletorProduto } from "@/components/seletor-produto";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useResultadoAcao } from "@/hooks/use-resultado-acao";
import { ESTADO_INICIAL } from "@/lib/estado-formulario";
import type { ProdutoSelecao } from "@/lib/services/estoque";
import { cn } from "@/lib/utils";
import type { TipoManual } from "@/lib/validations/estoque";

import { registrarMovimentacaoAcao } from "./actions";

const TIPOS: { valor: TipoManual; rotulo: string; icone: typeof ArrowDownToLine; ajuda: string }[] = [
  {
    valor: "entrada",
    rotulo: "Entrada",
    icone: ArrowDownToLine,
    ajuda: "Mercadoria que chegou (compra, reposição).",
  },
  {
    valor: "saida_manual",
    rotulo: "Saída",
    icone: ArrowUpFromLine,
    ajuda: "Perda, vencimento, quebra ou consumo próprio.",
  },
  {
    valor: "ajuste",
    rotulo: "Ajuste",
    icone: SlidersHorizontal,
    ajuda: "Corrige o estoque para a quantidade contada.",
  },
];

type Props = {
  produtos: ProdutoSelecao[];
  produtoInicial?: string;
};

/** Calcula o estoque depois da movimentação, só para pré-visualizar. */
function estoqueDepois(tipo: TipoManual, atual: number, quantidade: number): number {
  if (tipo === "entrada") return atual + quantidade;
  if (tipo === "saida_manual") return atual - quantidade;
  return quantidade;
}

export function FormularioMovimentacao({ produtos, produtoInicial }: Props) {
  const [estado, enviar, pendente] = useActionState(registrarMovimentacaoAcao, ESTADO_INICIAL);
  const [tipo, setTipo] = useState<TipoManual>("entrada");
  const [produtoId, setProdutoId] = useState<string | null>(
    produtos.some((p) => p.id === produtoInicial) ? (produtoInicial ?? null) : null,
  );
  const [quantidade, setQuantidade] = useState("");
  const [motivo, setMotivo] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const formulario = useRef<HTMLFormElement>(null);

  const erros = estado.campos ?? {};
  const produto = produtos.find((p) => p.id === produtoId);
  const numero = /^\d+$/.test(quantidade.trim()) ? Number(quantidade) : null;
  const previsao = produto && numero !== null ? estoqueDepois(tipo, produto.quantidade, numero) : null;
  const tipoAtual = TIPOS.find((t) => t.valor === tipo)!;

  useResultadoAcao(estado, () => {
    setQuantidade("");
    setMotivo("");
  });

  function enviarFormulario() {
    if (!formulario.current) return;
    const dados = new FormData(formulario.current);
    iniciarTransicao(() => enviar(dados));
  }

  function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    // Saída e ajuste podem reduzir o estoque: pedem confirmação antes.
    if (tipo !== "entrada" && produto && previsao !== null && previsao >= 0) {
      setConfirmando(true);
      return;
    }
    enviarFormulario();
  }

  return (
    <form ref={formulario} onSubmit={aoEnviar} noValidate className="space-y-4">
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="produto_id" value={produtoId ?? ""} />

      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de movimentação">
        {TIPOS.map((t) => (
          <Button
            key={t.valor}
            type="button"
            role="radio"
            aria-checked={tipo === t.valor}
            variant={tipo === t.valor ? "default" : "outline"}
            onClick={() => setTipo(t.valor)}
          >
            <t.icone /> {t.rotulo}
          </Button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{tipoAtual.ajuda}</p>

      <Campo id="produto" rotulo="Produto" erro={erros.produto_id}>
        <SeletorProduto
          id="produto"
          produtos={produtos}
          valor={produtoId}
          aoMudar={setProdutoId}
          invalido={Boolean(erros.produto_id)}
        />
      </Campo>

      <Campo
        id="quantidade"
        rotulo={tipo === "ajuste" ? "Quantidade contada (novo total)" : "Quantidade"}
        erro={erros.quantidade}
      >
        <Input
          id="quantidade"
          name="quantidade"
          inputMode="numeric"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          aria-invalid={erros.quantidade ? true : undefined}
        />
      </Campo>

      {produto ? (
        <p className="rounded-md bg-muted px-3 py-2 text-sm">
          Estoque atual:{" "}
          <strong className="tabular-nums">
            {produto.quantidade} {produto.unidade}
          </strong>
          {previsao !== null ? (
            <>
              {" "}
              → depois:{" "}
              <strong className={cn("tabular-nums", previsao < 0 && "text-destructive")}>
                {previsao} {produto.unidade}
              </strong>
              {previsao < 0 ? " (estoque insuficiente)" : null}
            </>
          ) : null}
        </p>
      ) : null}

      <Campo
        id="motivo"
        rotulo={tipo === "entrada" ? "Observação (opcional)" : "Motivo"}
        erro={erros.motivo}
      >
        <Textarea
          id="motivo"
          name="motivo"
          rows={2}
          maxLength={300}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder={
            tipo === "entrada"
              ? "Ex.: nota fiscal 1234, fornecedor X"
              : tipo === "saida_manual"
                ? "Ex.: produto vencido"
                : "Ex.: contagem do fim do mês"
          }
          aria-invalid={erros.motivo ? true : undefined}
        />
      </Campo>

      <Button type="submit" className="w-full" disabled={pendente}>
        {pendente ? <Loader2 className="animate-spin" /> : <tipoAtual.icone />}
        Registrar {tipoAtual.rotulo.toLowerCase()}
      </Button>

      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmar {tipo === "ajuste" ? "ajuste" : "saída"} de estoque?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {produto?.nome}: {produto?.quantidade} → {previsao} {produto?.unidade}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmando(false);
                enviarFormulario();
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
