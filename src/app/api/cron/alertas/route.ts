import { NextResponse, type NextRequest } from "next/server";

import { autorizadoParaCron } from "@/lib/autorizacao-cron";
import { processarAlertas } from "@/lib/services/alertas";

/**
 * Reenvio periódico (Vercel Cron, ver vercel.json): reprocessa alertas
 * 'pendente' ou 'falhou' com menos de 5 tentativas.
 * Fora do proxy de login (src/proxy.ts); a proteção é o CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  if (!autorizadoParaCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  try {
    const resumo = await processarAlertas();
    return NextResponse.json(resumo);
  } catch (erro) {
    console.error("[cron/alertas] erro ao processar a fila", erro);
    return NextResponse.json({ erro: "Falha ao processar os alertas." }, { status: 500 });
  }
}
