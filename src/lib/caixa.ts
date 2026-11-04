/**
 * Lógica do carrinho do caixa, sem React, para poder ser testada.
 *
 * Os valores aqui servem só para mostrar ao operador. O valor que vale é o
 * calculado pelo banco em registrar_venda, com os preços do banco.
 * Todo dinheiro é tratado em centavos inteiros.
 */

import { paraCentavos } from "@/lib/format";
import { contemTermos, normalizarTexto } from "@/lib/texto";

export type ProdutoCaixa = {
  id: string;
  nome: string;
  codigo_barras: string | null;
  unidade: string;
  preco_venda: number;
  quantidade: number;
};

export type ItemCarrinho = {
  produto: ProdutoCaixa;
  quantidade: number;
};

export type ResultadoAdicao =
  | { ok: true; itens: ItemCarrinho[] }
  | { ok: false; motivo: string };

/** Adiciona `quantidade` do produto, sem passar do estoque conhecido. */
export function adicionarItem(
  itens: ItemCarrinho[],
  produto: ProdutoCaixa,
  quantidade = 1,
): ResultadoAdicao {
  if (produto.quantidade <= 0) {
    return { ok: false, motivo: `${produto.nome} está sem estoque.` };
  }

  const existente = itens.find((i) => i.produto.id === produto.id);
  const nova = (existente?.quantidade ?? 0) + quantidade;

  if (nova > produto.quantidade) {
    return {
      ok: false,
      motivo: `Só há ${produto.quantidade} ${produto.unidade} de ${produto.nome} em estoque.`,
    };
  }

  if (existente) {
    return {
      ok: true,
      itens: itens.map((i) => (i.produto.id === produto.id ? { ...i, quantidade: nova } : i)),
    };
  }
  // Item novo vai para o topo: o operador vê o último produto lido.
  return { ok: true, itens: [{ produto, quantidade }, ...itens] };
}

/** Define a quantidade de um item (0 remove). Limita ao estoque conhecido. */
export function definirQuantidade(
  itens: ItemCarrinho[],
  produtoId: string,
  quantidade: number,
): ItemCarrinho[] {
  if (quantidade <= 0) return itens.filter((i) => i.produto.id !== produtoId);
  return itens.map((i) =>
    i.produto.id === produtoId
      ? { ...i, quantidade: Math.min(Math.floor(quantidade), i.produto.quantidade) }
      : i,
  );
}

export function subtotalCentavos(item: ItemCarrinho): number {
  return paraCentavos(item.produto.preco_venda) * item.quantidade;
}

export function totalCentavos(itens: ItemCarrinho[]): number {
  return itens.reduce((soma, item) => soma + subtotalCentavos(item), 0);
}

export function totalDeUnidades(itens: ItemCarrinho[]): number {
  return itens.reduce((soma, item) => soma + item.quantidade, 0);
}

/** Troco em centavos, ou null se o valor recebido não cobre o total. */
export function trocoCentavos(recebidoCentavos: number, total: number): number | null {
  return recebidoCentavos >= total ? recebidoCentavos - total : null;
}

/** Produto cujo código de barras é exatamente o digitado (leitor de código). */
export function produtoPorCodigo(
  produtos: ProdutoCaixa[],
  codigo: string,
): ProdutoCaixa | undefined {
  const alvo = codigo.trim();
  if (!alvo) return undefined;
  return produtos.find((p) => p.codigo_barras === alvo);
}

/**
 * Busca por nome ou código, sem diferenciar acentos. Produtos cujo nome começa
 * com a busca vêm primeiro; quem tem estoque vem antes de quem não tem.
 */
export function buscarProdutos(
  produtos: ProdutoCaixa[],
  busca: string,
  limite = 8,
): ProdutoCaixa[] {
  const termo = busca.trim();
  if (!termo) return [];
  const inicio = normalizarTexto(termo);

  return produtos
    .filter((p) => contemTermos(`${p.nome} ${p.codigo_barras ?? ""}`, termo))
    .map((p) => ({
      p,
      peso:
        (p.quantidade > 0 ? 0 : 2) + (normalizarTexto(p.nome).startsWith(inicio) ? 0 : 1),
    }))
    .sort((a, b) => a.peso - b.peso || a.p.nome.localeCompare(b.p.nome, "pt-BR"))
    .slice(0, limite)
    .map(({ p }) => p);
}
