import "server-only";

import type { Papel } from "@/lib/navegacao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { normalizarTexto } from "@/lib/texto";
import type {
  DadosEdicaoProduto,
  DadosNovoProduto,
  FiltrosProdutos,
} from "@/lib/validations/produtos";

import { decimalParaBanco, ErroAmigavel, erroDoBanco } from "./banco";

export const PRODUTOS_POR_PAGINA = 50;

export type ProdutoLista = {
  id: string;
  nome: string;
  codigo_barras: string | null;
  categoria_nome: string | null;
  unidade: string;
  preco_venda: number;
  /** Só preenchido para o proprietário. */
  preco_custo: number | null;
  quantidade: number;
  estoque_minimo: number;
  estoque_baixo: boolean;
  ativo: boolean;
};

/**
 * Palavras da busca já no formato da coluna `busca` (minúsculas, sem acento).
 * Os curingas do LIKE (% e _) são removidos para não mudar o sentido da busca.
 */
function termosDeBusca(busca: string): string[] {
  return normalizarTexto(busca)
    .replace(/[%_\\]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);
}

/**
 * Lista produtos com busca, filtros, ordenação e paginação, tudo no banco.
 * A lista vem sempre da view sem custo; para o proprietário, o custo da página
 * atual é buscado à parte na tabela (que o RLS só libera para ele).
 */
export async function listarProdutos(
  filtros: FiltrosProdutos,
  papel: Papel,
): Promise<{ produtos: ProdutoLista[]; total: number; pagina: number }> {
  const supabase = await criarClienteServidor();

  const consultar = (pagina: number) => {
    let consulta = supabase
      .from("produtos_catalogo")
      .select(
        "id, nome, codigo_barras, categoria_nome, unidade, preco_venda, quantidade, estoque_minimo, estoque_baixo, ativo",
        { count: "exact" },
      );

    // Cada palavra precisa aparecer no nome ou no código: "arroz 5" acha "Arroz Tio 5kg".
    for (const termo of termosDeBusca(filtros.busca)) {
      consulta = consulta.like("busca", `%${termo}%`);
    }
    if (filtros.categoria) consulta = consulta.eq("categoria_id", filtros.categoria);
    if (filtros.estoque === "baixo") consulta = consulta.eq("estoque_baixo", true);
    if (filtros.estoque === "sem") consulta = consulta.eq("quantidade", 0);
    // Funcionário vê só produtos ativos; o proprietário pode pedir os inativos.
    if (papel !== "proprietario" || !filtros.inativos) consulta = consulta.eq("ativo", true);

    if (filtros.ordem === "quantidade_asc") consulta = consulta.order("quantidade");
    if (filtros.ordem === "quantidade_desc") {
      consulta = consulta.order("quantidade", { ascending: false });
    }
    consulta = consulta.order("nome").order("id");

    const inicio = (pagina - 1) * PRODUTOS_POR_PAGINA;
    return consulta.range(inicio, inicio + PRODUTOS_POR_PAGINA - 1);
  };

  let pagina = filtros.pagina;
  let resposta = await consultar(pagina);
  // Página além do fim (ex.: filtro mudou): volta para a primeira.
  if (resposta.error?.code === "PGRST103" && pagina > 1) {
    pagina = 1;
    resposta = await consultar(pagina);
  }
  if (resposta.error) throw erroDoBanco(resposta.error, "listarProdutos");

  const linhas = resposta.data ?? [];
  const custos = new Map<string, number>();

  if (papel === "proprietario" && linhas.length > 0) {
    const { data, error } = await supabase
      .from("produtos")
      .select("id, preco_custo")
      .in(
        "id",
        linhas.map((l) => l.id),
      );
    if (error) throw erroDoBanco(error, "listarProdutos.custos");
    for (const linha of data) custos.set(linha.id, linha.preco_custo);
  }

  return {
    pagina,
    total: resposta.count ?? 0,
    produtos: linhas.map((l) => ({
      ...l,
      estoque_baixo: l.estoque_baixo ?? false,
      preco_custo: custos.get(l.id) ?? null,
    })),
  };
}

/** Produto completo (com custo) para o formulário de edição do proprietário. */
export async function obterProduto(id: string) {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("produtos")
    .select(
      "id, nome, descricao, categoria_id, codigo_barras, unidade, preco_custo, preco_venda, quantidade, estoque_minimo, ativo",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw erroDoBanco(error, "obterProduto");
  return data;
}

export type ProdutoEdicao = NonNullable<Awaited<ReturnType<typeof obterProduto>>>;

export async function cadastrarProduto(dados: DadosNovoProduto): Promise<string> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("cadastrar_produto", {
    p_nome: dados.nome,
    p_descricao: dados.descricao ?? undefined,
    p_categoria_id: dados.categoria_id ?? undefined,
    p_codigo_barras: dados.codigo_barras ?? undefined,
    p_unidade: dados.unidade,
    p_preco_custo: decimalParaBanco(dados.preco_custo),
    p_preco_venda: decimalParaBanco(dados.preco_venda),
    p_estoque_minimo: dados.estoque_minimo,
    p_estoque_inicial: dados.estoque_inicial,
  });
  if (error) throw erroDoBanco(error, "cadastrarProduto");
  return data;
}

/**
 * Atualiza os dados do produto. A quantidade não está aqui: ela só muda por
 * movimentação. Se o estoque mínimo mudar, o trigger do banco reavalia o alerta.
 */
export async function atualizarProduto(id: string, dados: DadosEdicaoProduto) {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("produtos")
    .update({
      ...dados,
      preco_custo: decimalParaBanco(dados.preco_custo),
      preco_venda: decimalParaBanco(dados.preco_venda),
    })
    .eq("id", id)
    .select("id");
  if (error) throw erroDoBanco(error, "atualizarProduto");
  if (data.length === 0) throw new ErroAmigavel("Produto não encontrado.");
}

export async function alterarSituacaoProduto(id: string, ativo: boolean) {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("produtos")
    .update({ ativo })
    .eq("id", id)
    .select("nome");
  if (error) throw erroDoBanco(error, "alterarSituacaoProduto");
  if (data.length === 0) throw new ErroAmigavel("Produto não encontrado.");
  return data[0].nome;
}

// -----------------------------------------------------------------------------
// Categorias
// -----------------------------------------------------------------------------

export type Categoria = { id: string; nome: string; ativo: boolean };

export async function listarCategorias(): Promise<Categoria[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("categorias")
    .select("id, nome, ativo")
    .order("nome");
  if (error) throw erroDoBanco(error, "listarCategorias");
  return data;
}

/** Categorias com a quantidade de produtos ativos (tela de gestão). */
export async function listarCategoriasComContagem() {
  const supabase = await criarClienteServidor();
  const [categorias, produtos] = await Promise.all([
    listarCategorias(),
    supabase.from("produtos").select("categoria_id").eq("ativo", true).not("categoria_id", "is", null),
  ]);
  if (produtos.error) throw erroDoBanco(produtos.error, "listarCategoriasComContagem");

  const contagem = new Map<string, number>();
  for (const { categoria_id } of produtos.data) {
    if (categoria_id) contagem.set(categoria_id, (contagem.get(categoria_id) ?? 0) + 1);
  }
  return categorias.map((c) => ({ ...c, produtos: contagem.get(c.id) ?? 0 }));
}

export async function criarCategoria(nome: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("categorias").insert({ nome });
  if (error) throw erroDoBanco(error, "criarCategoria");
}

export async function atualizarCategoria(
  id: string,
  campos: { nome?: string; ativo?: boolean },
) {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("categorias")
    .update(campos)
    .eq("id", id)
    .select("nome");
  if (error) throw erroDoBanco(error, "atualizarCategoria");
  if (data.length === 0) throw new ErroAmigavel("Categoria não encontrada.");
  return data[0].nome;
}
