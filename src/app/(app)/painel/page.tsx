import type { Metadata } from "next";
import { z } from "zod";

import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { calcularPeriodos, PERIODOS, ROTULO_PERIODO } from "@/lib/periodos";
import { obterIndicadores } from "@/lib/services/indicadores";
import { exigirProprietario } from "@/lib/services/sessao";
import { ROTULO_FORMA } from "@/lib/validations/vendas";

import { BlocoFinanceiro } from "./bloco-financeiro";
import { CardsIndicadores } from "./cards-indicadores";
import { GraficoBarras, type Ponto } from "./grafico-barras";
import { SeletorPeriodo } from "./seletor-periodo";

export const metadata: Metadata = { title: "Painel" };

const MESES = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];

/** "2026-11-03" -> "03/11" e "03/11/2026", sem passar por fuso (já é um dia de São Paulo). */
function rotulosDoDia(dia: string) {
  const [ano, mes, d] = dia.split("-");
  return { rotulo: `${d}/${mes}`, rotuloCompleto: `${d}/${mes}/${ano}` };
}

function rotulosDoMes(primeiroDia: string) {
  const [ano, mes] = primeiroDia.split("-");
  const nome = MESES[Number(mes) - 1];
  return { rotulo: nome, rotuloCompleto: `${nome} ${ano}` };
}

const plural = (n: number, um: string, varios: string) =>
  `${n.toLocaleString("pt-BR")} ${n === 1 ? um : varios}`;

function CardGrafico({
  titulo,
  descricao,
  children,
  className,
}: {
  titulo: string;
  descricao: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <CardDescription>{descricao}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default async function PaginaPainel({ searchParams }: PageProps<"/painel">) {
  await exigirProprietario();

  const { periodo: bruto } = await searchParams;
  const periodo = z.enum(PERIODOS).catch("mes").parse(Array.isArray(bruto) ? bruto[0] : bruto);
  const periodos = calcularPeriodos(periodo);
  const rotuloPeriodo = ROTULO_PERIODO[periodo];

  const indicadores = await obterIndicadores(periodos);

  const porDia: Ponto[] = indicadores.porDia.map((d) => ({
    ...rotulosDoDia(d.dia),
    valor: d.faturamento,
    detalhe: plural(d.vendas, "venda", "vendas"),
  }));
  const porMes: Ponto[] = indicadores.porMes.map((m) => ({
    ...rotulosDoMes(m.mes),
    valor: m.faturamento,
    detalhe: plural(m.vendas, "venda", "vendas"),
  }));
  const top: Ponto[] = indicadores.topProdutos.map((p) => ({
    rotulo: p.nome.length > 26 ? `${p.nome.slice(0, 25)}…` : p.nome,
    rotuloCompleto: p.nome,
    valor: p.quantidade,
    detalhe: `${p.unidade} vendidos`,
  }));
  const porForma: Ponto[] = indicadores.porForma.map((f) => ({
    rotulo: ROTULO_FORMA[f.forma],
    rotuloCompleto: ROTULO_FORMA[f.forma],
    valor: f.faturamento,
    detalhe: plural(f.vendas, "venda", "vendas"),
  }));

  return (
    <>
      <CabecalhoPagina
        titulo="Painel"
        descricao="Vendas canceladas não entram em nenhum número."
        acoes={<SeletorPeriodo periodo={periodo} />}
      />

      <CardsIndicadores
        indicadores={indicadores}
        descricaoAnterior={periodos.descricaoAnterior}
        rotuloPeriodo={rotuloPeriodo}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <CardGrafico
          className="xl:col-span-2"
          titulo="Faturamento por dia"
          descricao={rotuloPeriodo}
        >
          <GraficoBarras dados={porDia} formato="moeda" rotuloCategoria="Dia" rotuloValor="Faturamento" />
        </CardGrafico>
        <BlocoFinanceiro resumo={indicadores.atual} rotuloPeriodo={rotuloPeriodo} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CardGrafico titulo="Faturamento dos últimos 6 meses" descricao="Mês atual até hoje">
          <GraficoBarras dados={porMes} formato="moeda" rotuloCategoria="Mês" rotuloValor="Faturamento" />
        </CardGrafico>
        <CardGrafico titulo="Vendas por forma de pagamento" descricao={`Faturamento · ${rotuloPeriodo}`}>
          <GraficoBarras
            dados={porForma}
            formato="moeda"
            orientacao="horizontal"
            altura={200}
            rotuloCategoria="Forma"
            rotuloValor="Faturamento"
          />
        </CardGrafico>
      </div>

      <CardGrafico titulo="Top 10 produtos mais vendidos" descricao={`Quantidade vendida · ${rotuloPeriodo}`}>
        <GraficoBarras
          dados={top}
          formato="quantidade"
          orientacao="horizontal"
          altura={Math.max(160, top.length * 36)}
          rotuloCategoria="Produto"
          rotuloValor="Quantidade"
        />
      </CardGrafico>
    </>
  );
}
