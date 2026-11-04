import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus, PackageX } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatarCentavos } from "@/lib/format";
import { variacaoPercentual } from "@/lib/periodos";
import type { Indicadores } from "@/lib/services/indicadores";
import { cn } from "@/lib/utils";

const percentual = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
  signDisplay: "exceptZero",
});

function Indicador({
  rotulo,
  valor,
  detalhe,
  children,
}: {
  rotulo: string;
  valor?: React.ReactNode;
  detalhe?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Card className="gap-0 py-4">
      <CardContent className="space-y-1 px-4">
        <p className="text-sm text-muted-foreground">{rotulo}</p>
        {valor !== undefined ? <p className="font-display text-3xl font-bold">{valor}</p> : null}
        {children}
        {detalhe ? <p className="text-xs text-muted-foreground">{detalhe}</p> : null}
      </CardContent>
    </Card>
  );
}

/** Variação % com ícone e sinal (nunca só a cor): verde subiu, vermelho caiu. */
function Variacao({ atual, anterior }: { atual: number; anterior: number }) {
  const v = variacaoPercentual(atual, anterior);
  if (v === null) {
    return <p className="font-display text-3xl font-bold text-muted-foreground">—</p>;
  }
  const subiu = v > 0;
  const caiu = v < 0;
  const Icone = subiu ? ArrowUpRight : caiu ? ArrowDownRight : Minus;
  return (
    <p
      className={cn(
        "flex items-center gap-1 font-display text-3xl font-bold",
        subiu && "text-broto",
        caiu && "text-destructive",
      )}
    >
      <Icone className="size-6" aria-hidden="true" />
      {percentual.format(v)}%
      <span className="sr-only">{subiu ? "(subiu)" : caiu ? "(caiu)" : "(estável)"}</span>
    </p>
  );
}

type Props = {
  indicadores: Indicadores;
  descricaoAnterior: string;
  rotuloPeriodo: string;
};

export function CardsIndicadores({ indicadores, descricaoAnterior, rotuloPeriodo }: Props) {
  const { hoje, atual, anterior, produtosEstoqueBaixo } = indicadores;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <Indicador
        rotulo="Faturamento do dia"
        valor={formatarCentavos(hoje.faturamento)}
        detalhe={hoje.vendas === 1 ? "1 venda hoje" : `${hoje.vendas} vendas hoje`}
      />
      <Indicador
        rotulo={`Faturamento · ${rotuloPeriodo}`}
        valor={formatarCentavos(atual.faturamento)}
        detalhe={`Período anterior: ${formatarCentavos(anterior.faturamento)}`}
      />
      <Indicador
        rotulo="Variação do faturamento"
        detalhe={
          anterior.faturamento === 0
            ? `Sem vendas para comparar (${descricaoAnterior})`
            : `Contra ${descricaoAnterior}`
        }
      >
        <Variacao atual={atual.faturamento} anterior={anterior.faturamento} />
      </Indicador>
      <Indicador
        rotulo="Quantidade de vendas"
        valor={atual.vendas.toLocaleString("pt-BR")}
        detalhe={`Período anterior: ${anterior.vendas.toLocaleString("pt-BR")}`}
      />
      <Indicador
        rotulo="Ticket médio"
        valor={formatarCentavos(atual.ticketMedio)}
        detalhe="Faturamento ÷ vendas válidas"
      />
      <Link
        href="/produtos?estoque=baixo&ordem=quantidade_asc"
        className="group rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <Indicador
          rotulo="Produtos com estoque baixo"
          detalhe={
            <span className="inline-flex items-center gap-1 group-hover:text-foreground">
              Ver a lista <ArrowRight className="size-3" />
            </span>
          }
        >
          <p
            className={cn(
              "flex items-center gap-2 font-display text-3xl font-bold",
              produtosEstoqueBaixo > 0 && "text-laranja-texto",
            )}
          >
            {produtosEstoqueBaixo > 0 ? <PackageX className="size-6" aria-hidden="true" /> : null}
            {produtosEstoqueBaixo.toLocaleString("pt-BR")}
          </p>
        </Indicador>
      </Link>
    </div>
  );
}
