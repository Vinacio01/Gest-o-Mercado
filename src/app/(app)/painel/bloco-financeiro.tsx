import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatarCentavos } from "@/lib/format";
import type { Resumo } from "@/lib/services/indicadores";

const percentual = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/**
 * Faturamento − custo das mercadorias vendidas = lucro bruto estimado.
 * "Estimado" porque não desconta despesas (aluguel, luz, taxas da maquininha).
 * Faturamento nunca é chamado de lucro.
 */
export function BlocoFinanceiro({ resumo, rotuloPeriodo }: { resumo: Resumo; rotuloPeriodo: string }) {
  const margem = resumo.faturamento > 0 ? (resumo.lucroBruto / resumo.faturamento) * 100 : null;

  const linhas = [
    { rotulo: "Faturamento", valor: resumo.faturamento, sinal: "" },
    { rotulo: "Custo das mercadorias vendidas", valor: resumo.custo, sinal: "−" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resultado · {rotuloPeriodo}</CardTitle>
        <CardDescription>
          Estimativa: não desconta despesas como aluguel, luz e taxas da maquininha.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="divide-y">
          {linhas.map((l) => (
            <div key={l.rotulo} className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-sm text-muted-foreground">{l.rotulo}</dt>
              <dd className="font-medium tabular-nums">
                {l.sinal ? `${l.sinal} ` : ""}
                {formatarCentavos(l.valor)}
              </dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-4 pt-3">
            <dt className="font-medium">Lucro bruto estimado</dt>
            <dd className="text-right">
              <span className="text-xl font-semibold tabular-nums">
                {formatarCentavos(resumo.lucroBruto)}
              </span>
              {margem !== null ? (
                <span className="block text-xs text-muted-foreground">
                  Margem bruta de {percentual.format(margem)}%
                </span>
              ) : null}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
