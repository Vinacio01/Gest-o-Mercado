"use client";

import { Banknote, CreditCard, Loader2, QrCode, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatarCentavos } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FORMAS_PAGAMENTO, ROTULO_FORMA, type FormaPagamento } from "@/lib/validations/vendas";

const ICONE_FORMA: Record<FormaPagamento, typeof Banknote> = {
  dinheiro: Banknote,
  pix: QrCode,
  debito: Wallet,
  credito: CreditCard,
};

type Props = {
  totalCentavos: number;
  unidades: number;
  forma: FormaPagamento | null;
  aoMudarForma: (forma: FormaPagamento) => void;
  recebido: string;
  aoMudarRecebido: (valor: string) => void;
  /** Troco em centavos; null quando o valor recebido não cobre o total. */
  troco: number | null;
  recebidoInvalido: boolean;
  podeFinalizar: boolean;
  processando: boolean;
  aoFinalizar: () => void;
  aoCancelar: () => void;
  temItens: boolean;
};

export function PainelPagamento({
  totalCentavos,
  unidades,
  forma,
  aoMudarForma,
  recebido,
  aoMudarRecebido,
  troco,
  recebidoInvalido,
  podeFinalizar,
  processando,
  aoFinalizar,
  aoCancelar,
  temItens,
}: Props) {
  return (
    <Card className="lg:sticky lg:top-4">
      <CardContent className="flex flex-col gap-5">
        <div>
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-5xl font-bold tracking-tight tabular-nums" aria-live="polite">
            {formatarCentavos(totalCentavos)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {unidades === 1 ? "1 unidade" : `${unidades} unidades`}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium" id="rotulo-forma">
            Forma de pagamento
          </p>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="rotulo-forma">
            {FORMAS_PAGAMENTO.map((f) => {
              const Icone = ICONE_FORMA[f];
              return (
                <Button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={forma === f}
                  variant={forma === f ? "default" : "outline"}
                  className="h-11"
                  onClick={() => aoMudarForma(f)}
                >
                  <Icone /> {ROTULO_FORMA[f]}
                </Button>
              );
            })}
          </div>
        </div>

        {forma === "dinheiro" ? (
          <div className="space-y-2">
            <Label htmlFor="valor-recebido">Valor recebido (opcional)</Label>
            <Input
              id="valor-recebido"
              inputMode="decimal"
              placeholder="0,00"
              value={recebido}
              onChange={(e) => aoMudarRecebido(e.target.value)}
              aria-invalid={recebidoInvalido || undefined}
              className="h-10 text-base"
            />
            {recebido.trim() ? (
              recebidoInvalido ? (
                <p className="text-sm text-destructive">Valor inválido. Use o formato 50,00.</p>
              ) : troco === null ? (
                <p className="text-sm text-destructive">O valor recebido é menor que o total.</p>
              ) : (
                <p className="flex items-baseline justify-between rounded-md bg-muted px-3 py-2">
                  <span className="text-sm">Troco</span>
                  <span className="text-2xl font-semibold tabular-nums">{formatarCentavos(troco)}</span>
                </p>
              )
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            className={cn("h-12 text-base")}
            onClick={aoFinalizar}
            disabled={!podeFinalizar}
          >
            {processando ? <Loader2 className="animate-spin" /> : null}
            {processando ? "Registrando..." : "Finalizar venda"}
            <kbd className="ml-2 rounded border border-current/30 px-1.5 text-xs font-normal opacity-80">
              F2
            </kbd>
          </Button>
          <Button variant="outline" onClick={aoCancelar} disabled={!temItens || processando}>
            Cancelar venda
            <kbd className="ml-2 rounded border px-1.5 text-xs font-normal text-muted-foreground">
              Esc
            </kbd>
          </Button>
          {temItens && !forma ? (
            <p className="text-center text-xs text-muted-foreground">
              Escolha a forma de pagamento para finalizar.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
