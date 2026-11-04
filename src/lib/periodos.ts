/**
 * Períodos do painel e seus "períodos anteriores equivalentes", sempre no fuso
 * de São Paulo. Os intervalos têm início inclusivo e fim exclusivo, e vão
 * prontos para as funções SQL de indicadores.
 *
 * Regra de comparação (decisões K e L): o período anterior cobre o MESMO
 * trecho de tempo decorrido. Às 15h de 03/11, "Este mês" (01/11 00h → 03/11
 * 15h) é comparado com 01/10 00h → 03/10 15h; "Hoje" com ontem até as 15h.
 */

import { diaEmSaoPaulo, formatarData, formatarHora, inicioDoDiaEmSaoPaulo, somarDias } from "@/lib/format";

export const PERIODOS = ["hoje", "7d", "30d", "mes", "mes_anterior"] as const;
export type Periodo = (typeof PERIODOS)[number];

export const ROTULO_PERIODO: Record<Periodo, string> = {
  hoje: "Hoje",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  mes: "Este mês",
  mes_anterior: "Mês anterior",
};

export type Intervalo = { inicio: Date; fim: Date };

export type PeriodosPainel = {
  periodo: Periodo;
  atual: Intervalo;
  anterior: Intervalo;
  /** Sempre o dia de hoje até agora (card "Faturamento do dia"). */
  hoje: Intervalo;
  /** Texto curto do período anterior, ex.: "01/10/2026 a 03/10/2026, até 15:20". */
  descricaoAnterior: string;
};

function primeiroDoMes(dia: string): string {
  return `${dia.slice(0, 7)}-01`;
}

/** Primeiro dia do mês deslocado em `meses` ("2026-11-15", -1 -> "2026-10-01"). */
function primeiroDoMesDeslocado(dia: string, meses: number): string {
  const [ano, mes] = dia.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1 + meses, 1));
  return data.toISOString().slice(0, 10);
}

function diasNoMes(primeiroDia: string): number {
  const [ano, mes] = primeiroDia.split("-").map(Number);
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

const inicio = inicioDoDiaEmSaoPaulo;

/** Período "rolante" de N dias terminando agora, comparado com os N dias antes. */
function rolante(hoje: string, decorrido: number, dias: number) {
  return {
    atual: { inicio: inicio(somarDias(hoje, -(dias - 1))), fim: null },
    anterior: {
      inicio: inicio(somarDias(hoje, -(2 * dias - 1))),
      fim: new Date(inicio(somarDias(hoje, -dias)).getTime() + decorrido),
    },
  };
}

export function calcularPeriodos(periodo: Periodo, agora: Date = new Date()): PeriodosPainel {
  const hoje = diaEmSaoPaulo(agora);
  const inicioHoje = inicio(hoje);
  // Quanto do dia de hoje já passou: o período anterior para no mesmo ponto.
  const decorrido = agora.getTime() - inicioHoje.getTime();

  let atual: Intervalo;
  let anterior: Intervalo;
  let parcial = true; // o período anterior foi cortado no "mesmo ponto" de hoje

  switch (periodo) {
    case "hoje": {
      const ontem = somarDias(hoje, -1);
      atual = { inicio: inicioHoje, fim: agora };
      anterior = { inicio: inicio(ontem), fim: new Date(inicio(ontem).getTime() + decorrido) };
      break;
    }
    case "7d":
    case "30d": {
      const r = rolante(hoje, decorrido, periodo === "7d" ? 7 : 30);
      atual = { inicio: r.atual.inicio, fim: agora };
      anterior = r.anterior;
      break;
    }
    case "mes": {
      const primeiro = primeiroDoMes(hoje);
      const primeiroAnterior = primeiroDoMesDeslocado(hoje, -1);
      const diaDoMes = Number(hoje.slice(8, 10));
      atual = { inicio: inicio(primeiro), fim: agora };

      // 31/03 comparado com fevereiro: o mês anterior não tem dia 31, então
      // a comparação vai até o fim dele.
      const fimAnterior =
        diaDoMes > diasNoMes(primeiroAnterior)
          ? inicio(primeiro)
          : new Date(
              inicio(somarDias(primeiroAnterior, diaDoMes - 1)).getTime() + decorrido,
            );
      anterior = { inicio: inicio(primeiroAnterior), fim: fimAnterior };
      parcial = fimAnterior.getTime() !== inicio(primeiro).getTime();
      break;
    }
    case "mes_anterior": {
      const primeiroAnterior = primeiroDoMesDeslocado(hoje, -1);
      const primeiroRetrasado = primeiroDoMesDeslocado(hoje, -2);
      atual = { inicio: inicio(primeiroAnterior), fim: inicio(primeiroDoMes(hoje)) };
      anterior = { inicio: inicio(primeiroRetrasado), fim: inicio(primeiroAnterior) };
      parcial = false;
      break;
    }
  }

  return {
    periodo,
    atual,
    anterior,
    hoje: { inicio: inicioHoje, fim: agora },
    descricaoAnterior: descrever(anterior, parcial),
  };
}

function descrever(intervalo: Intervalo, parcial: boolean): string {
  const primeiroDia = formatarData(intervalo.inicio);
  // O fim é exclusivo: o último instante coberto é 1 ms antes.
  const ultimoInstante = new Date(intervalo.fim.getTime() - 1);
  const ultimoDia = formatarData(ultimoInstante);
  const dias = primeiroDia === ultimoDia ? primeiroDia : `${primeiroDia} a ${ultimoDia}`;
  return parcial ? `${dias}, até ${formatarHora(intervalo.fim)}` : dias;
}

/**
 * Variação percentual entre dois valores em centavos. null quando não há base
 * de comparação (período anterior sem vendas).
 */
export function variacaoPercentual(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return ((atual - anterior) / anterior) * 100;
}
