/**
 * Estado devolvido pelas Server Actions aos formulários (usado com
 * useActionState). Fica num arquivo próprio porque cliente e servidor o usam.
 */
export type EstadoFormulario = {
  ok?: boolean;
  /** Mensagem de sucesso (toast). */
  mensagem?: string;
  /** Mensagem de erro geral (toast). */
  erro?: string;
  /** Erros de validação por campo do formulário. */
  campos?: Record<string, string>;
  /** Muda a cada envio, para o formulário reagir mesmo a resultados iguais. */
  versao?: number;
};

export const ESTADO_INICIAL: EstadoFormulario = {};
