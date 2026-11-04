"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { executarAcao } from "@/lib/acao";
import { enviarAlertasDepoisDaResposta } from "@/lib/services/alertas";
import type { EstadoFormulario } from "@/lib/estado-formulario";
import {
  alterarSituacaoProduto,
  atualizarCategoria,
  atualizarProduto,
  cadastrarProduto,
  criarCategoria,
} from "@/lib/services/produtos";
import { exigirProprietario } from "@/lib/services/sessao";
import { errosPorCampo } from "@/lib/validations/comum";
import {
  esquemaCategoria,
  esquemaEdicaoProduto,
  esquemaNovoProduto,
} from "@/lib/validations/produtos";

/**
 * Server Actions de produtos e categorias. Todas:
 * 1. exigem o proprietário (o banco também confere, pelo RLS e pelas funções);
 * 2. validam a entrada com Zod no servidor;
 * 3. chamam o serviço, que contém a regra.
 */

const id = z.uuid();

function camposDoFormulario(formData: FormData, nomes: readonly string[]) {
  return Object.fromEntries(nomes.map((n) => [n, String(formData.get(n) ?? "")]));
}

const CAMPOS_PRODUTO = [
  "nome",
  "descricao",
  "categoria_id",
  "codigo_barras",
  "unidade",
  "preco_custo",
  "preco_venda",
  "estoque_minimo",
] as const;

function invalido(erro: z.ZodError): EstadoFormulario {
  return {
    ok: false,
    erro: "Confira os campos destacados.",
    campos: errosPorCampo(erro),
    versao: Date.now(),
  };
}

export async function cadastrarProdutoAcao(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirProprietario();

  const dados = esquemaNovoProduto.safeParse(
    camposDoFormulario(formData, [...CAMPOS_PRODUTO, "estoque_inicial"]),
  );
  if (!dados.success) return invalido(dados.error);

  return executarAcao(async () => {
    await cadastrarProduto(dados.data);
    enviarAlertasDepoisDaResposta(); // nasceu com estoque baixo?
    revalidatePath("/produtos");
    revalidatePath("/estoque");
    return `Produto "${dados.data.nome}" cadastrado.`;
  }, "cadastrarProdutoAcao");
}

export async function atualizarProdutoAcao(
  produtoId: string,
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirProprietario();

  const idValido = id.safeParse(produtoId);
  if (!idValido.success) return { ok: false, erro: "Produto inválido.", versao: Date.now() };

  const dados = esquemaEdicaoProduto.safeParse(camposDoFormulario(formData, CAMPOS_PRODUTO));
  if (!dados.success) return invalido(dados.error);

  return executarAcao(async () => {
    await atualizarProduto(idValido.data, dados.data);
    enviarAlertasDepoisDaResposta(); // o estoque mínimo pode ter subido (decisão I)
    revalidatePath("/produtos");
    revalidatePath("/estoque");
    return "Alterações salvas.";
  }, "atualizarProdutoAcao");
}

export async function alterarSituacaoProdutoAcao(
  produtoId: string,
  ativo: boolean,
): Promise<EstadoFormulario> {
  await exigirProprietario();

  const dados = z.object({ id, ativo: z.boolean() }).safeParse({ id: produtoId, ativo });
  if (!dados.success) return { ok: false, erro: "Produto inválido.", versao: Date.now() };

  return executarAcao(async () => {
    const nome = await alterarSituacaoProduto(dados.data.id, dados.data.ativo);
    if (dados.data.ativo) enviarAlertasDepoisDaResposta(); // reativado com estoque baixo
    revalidatePath("/produtos");
    revalidatePath("/estoque");
    return dados.data.ativo ? `"${nome}" foi reativado.` : `"${nome}" foi desativado.`;
  }, "alterarSituacaoProdutoAcao");
}

// -----------------------------------------------------------------------------
// Categorias
// -----------------------------------------------------------------------------

export async function criarCategoriaAcao(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirProprietario();

  const dados = esquemaCategoria.safeParse(camposDoFormulario(formData, ["nome"]));
  if (!dados.success) return invalido(dados.error);

  return executarAcao(async () => {
    await criarCategoria(dados.data.nome);
    revalidatePath("/produtos", "layout");
    return `Categoria "${dados.data.nome}" criada.`;
  }, "criarCategoriaAcao");
}

export async function renomearCategoriaAcao(
  categoriaId: string,
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirProprietario();

  const idValido = id.safeParse(categoriaId);
  if (!idValido.success) return { ok: false, erro: "Categoria inválida.", versao: Date.now() };

  const dados = esquemaCategoria.safeParse(camposDoFormulario(formData, ["nome"]));
  if (!dados.success) return invalido(dados.error);

  return executarAcao(async () => {
    await atualizarCategoria(idValido.data, { nome: dados.data.nome });
    revalidatePath("/produtos", "layout");
    return "Categoria renomeada.";
  }, "renomearCategoriaAcao");
}

export async function alterarSituacaoCategoriaAcao(
  categoriaId: string,
  ativo: boolean,
): Promise<EstadoFormulario> {
  await exigirProprietario();

  const dados = z.object({ id, ativo: z.boolean() }).safeParse({ id: categoriaId, ativo });
  if (!dados.success) return { ok: false, erro: "Categoria inválida.", versao: Date.now() };

  return executarAcao(async () => {
    const nome = await atualizarCategoria(dados.data.id, { ativo: dados.data.ativo });
    revalidatePath("/produtos", "layout");
    return dados.data.ativo ? `Categoria "${nome}" reativada.` : `Categoria "${nome}" desativada.`;
  }, "alterarSituacaoCategoriaAcao");
}
