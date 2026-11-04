"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatarCentavos } from "@/lib/format";

/**
 * Gráfico de barras de uma série só (por isso sem legenda: o título do card
 * diz o que está plotado). Segue o guia de visualização do projeto:
 * - barras de no máximo 24px com ponta arredondada de 4px e base reta;
 * - grade horizontal fina e discreta, sem eixo pesado;
 * - tooltip ao passar o mouse e uma tabela com os mesmos dados (acessível).
 * A cor vem do tema (--chart-1), então a rodada visual troca num lugar só.
 */

export type Ponto = {
  /** Rótulo curto do eixo (ex.: "03/11", "out."). */
  rotulo: string;
  /** Rótulo completo para tooltip e tabela (ex.: "03/11/2026"). */
  rotuloCompleto: string;
  /** Valor em centavos (dinheiro) ou unidades, conforme `formato`. */
  valor: number;
  /** Informação extra no tooltip e na tabela (ex.: "12 vendas"). */
  detalhe?: string;
};

type Props = {
  dados: Ponto[];
  /** "moeda": valores em centavos; "quantidade": números inteiros. */
  formato: "moeda" | "quantidade";
  orientacao?: "vertical" | "horizontal";
  altura?: number;
  rotuloValor: string;
  rotuloCategoria: string;
  /** Texto quando todos os valores são zero. */
  vazio?: string;
};

const compactoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatarValor(valor: number, formato: Props["formato"]) {
  return formato === "moeda" ? formatarCentavos(valor) : valor.toLocaleString("pt-BR");
}

function formatarEixo(valor: number, formato: Props["formato"]) {
  if (formato === "quantidade") return valor.toLocaleString("pt-BR");
  // Eixo compacto: R$ 1,2 mil. Divisão só para exibir.
  return compactoMoeda.format(valor / 100);
}

type PropsDica = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
  formato: Props["formato"];
};

function Dica({ active, payload, formato }: PropsDica) {
  const ponto = payload?.[0]?.payload as Ponto | undefined;
  if (!active || !ponto) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="text-muted-foreground">{ponto.rotuloCompleto}</p>
      <p className="font-semibold tabular-nums">{formatarValor(ponto.valor, formato)}</p>
      {ponto.detalhe ? <p className="text-xs text-muted-foreground">{ponto.detalhe}</p> : null}
    </div>
  );
}

export function GraficoBarras({
  dados,
  formato,
  orientacao = "vertical",
  altura = 260,
  rotuloValor,
  rotuloCategoria,
  vazio = "Sem vendas no período.",
}: Props) {
  const semDados = dados.length === 0 || dados.every((d) => d.valor === 0);
  const horizontal = orientacao === "horizontal";

  if (semDados) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground"
        style={{ height: Math.min(altura, 160) }}
      >
        {vazio}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div style={{ height: altura }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dados}
            layout={horizontal ? "vertical" : "horizontal"}
            margin={{ top: 8, right: horizontal ? 16 : 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid
              stroke="var(--border)"
              strokeWidth={1}
              horizontal={!horizontal}
              vertical={horizontal}
            />
            {horizontal ? (
              <>
                <XAxis
                  type="number"
                  tickFormatter={(v: number) => formatarEixo(v, formato)}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="rotulo"
                  width={190}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--foreground)", fontSize: 12 }}
                  interval={0}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey="rotulo"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  interval="preserveStartEnd"
                  minTickGap={12}
                />
                <YAxis
                  tickFormatter={(v: number) => formatarEixo(v, formato)}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  width={72}
                  allowDecimals={false}
                />
              </>
            )}
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.6 }}
              content={(props) => <Dica {...props} formato={formato} />}
            />
            <Bar
              dataKey="valor"
              fill="var(--chart-1)"
              maxBarSize={24}
              // Ponta arredondada de 4px; base reta, ancorada no eixo.
              radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Ver dados em tabela
        </summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="px-3 py-1.5 text-left font-medium">{rotuloCategoria}</th>
                <th className="px-3 py-1.5 text-right font-medium">{rotuloValor}</th>
              </tr>
            </thead>
            <tbody>
              {dados.map((d) => (
                <tr key={d.rotuloCompleto} className="border-t">
                  <td className="px-3 py-1.5">
                    {d.rotuloCompleto}
                    {d.detalhe ? <span className="text-muted-foreground"> · {d.detalhe}</span> : null}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatarValor(d.valor, formato)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
