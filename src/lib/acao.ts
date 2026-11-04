import "server-only";

import { ErroAmigavel } from "@/lib/services/banco";
import type { EstadoFormulario } from "@/lib/estado-formulario";

/**
 * Executa o corpo de uma Server Action e transforma o resultado no estado do
 * formulário. Erros amigáveis viram mensagem; o resto vai para o log.
 */
export async function executarAcao(
  corpo: () => Promise<string>,
  contexto: string,
): Promise<EstadoFormulario> {
  try {
    const mensagem = await corpo();
    return { ok: true, mensagem, versao: Date.now() };
  } catch (erro) {
    if (erro instanceof ErroAmigavel) {
      return { ok: false, erro: erro.message, versao: Date.now() };
    }
    console.error(`[${contexto}] erro inesperado`, erro);
    return {
      ok: false,
      erro: "Algo deu errado. Tente novamente.",
      versao: Date.now(),
    };
  }
}
