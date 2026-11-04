import "server-only";

/**
 * Tradução dos erros do banco para mensagens amigáveis.
 * O detalhe técnico vai só para o log do servidor; o usuário vê a mensagem.
 */

/** Erro cuja mensagem pode ser mostrada ao usuário. */
export class ErroAmigavel extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroAmigavel";
  }
}

type ErroPostgrest = {
  code?: string;
  message: string;
  details?: string | null;
  hint?: string | null;
};

const MENSAGEM_GENERICA = "Não foi possível concluir a operação. Tente novamente.";

/** Mensagens para violações de unicidade, pelo nome da restrição. */
const MENSAGENS_UNICAS: Record<string, string> = {
  produtos_codigo_barras_unico: "Já existe um produto com esse código de barras.",
  categorias_nome_key: "Já existe uma categoria com esse nome.",
  categorias_nome_unico_sem_caixa: "Já existe uma categoria com esse nome.",
};

export function erroDoBanco(error: ErroPostgrest, contexto: string): ErroAmigavel {
  switch (error.code) {
    // Erros de regra levantados pelas nossas funções (raise exception):
    // a mensagem já foi escrita para o usuário.
    case "P0001":
      return new ErroAmigavel(error.message);

    case "42501":
      console.warn(`[${contexto}] permissão negada`, error);
      return new ErroAmigavel("Você não tem permissão para fazer isso.");

    case "23505": {
      const restricao = Object.keys(MENSAGENS_UNICAS).find((nome) =>
        error.message.includes(nome),
      );
      if (restricao) return new ErroAmigavel(MENSAGENS_UNICAS[restricao]);
      break;
    }

    case "23503":
      console.warn(`[${contexto}] chave estrangeira`, error);
      return new ErroAmigavel("Um dos itens escolhidos não existe mais. Recarregue a página.");
  }

  console.error(`[${contexto}] erro do banco`, error);
  return new ErroAmigavel(MENSAGEM_GENERICA);
}

/**
 * Valor decimal já validado ("12.50") enviado ao banco como texto.
 * O PostgREST repassa o texto e o Postgres o converte para numeric sem perda,
 * então nenhum valor em dinheiro passa por ponto flutuante. O tipo gerado diz
 * "number" porque o gerador não distingue numeric; daí a conversão de tipo.
 */
export function decimalParaBanco(valor: string): number {
  return valor as unknown as number;
}
