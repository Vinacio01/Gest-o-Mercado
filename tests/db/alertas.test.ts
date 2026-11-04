import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  enviarEmailResend,
  ERRO_SEM_CHAVE,
  type EnviarEmail,
  type MensagemEmail,
} from "@/lib/integrations/resend";
import { processarAlertas } from "@/lib/services/alertas";

import {
  admin,
  alertasDoProduto,
  criarProdutoTeste,
  criarUsuario,
  removerProduto,
  removerUsuario,
  type UsuarioTeste,
} from "../helpers/supabase";

/**
 * Fila de envio dos alertas. O envio real (Resend) é trocado por um falso:
 * nenhum e-mail sai nos testes. Requer o Supabase local rodando.
 */

const EMAIL_TESTE = "alertas@mercadinho.test";
let configOriginal: { alertas_ativos: boolean; email_alerta: string | null };
let proprietario: UsuarioTeste;
const produtosCriados: string[] = [];

async function configurar(campos: { alertas_ativos?: boolean; email_alerta?: string | null }) {
  const { error } = await admin.from("configuracoes").update(campos).eq("id", 1);
  if (error) throw error;
}

/** Produto que já nasce abaixo do mínimo, com um alerta pendente. */
async function produtoComAlerta(campos: Parameters<typeof criarProdutoTeste>[0] = {}) {
  const produto = await criarProdutoTeste({ quantidade: 3, estoque_minimo: 10, ...campos });
  produtosCriados.push(produto.id);
  const [alerta] = await alertasDoProduto(produto.id);
  expect(alerta?.status).toBe("pendente");
  return { produto, alerta };
}

function enviadorFalso(resultado: Awaited<ReturnType<EnviarEmail>> = { ok: true }, demoraMs = 0) {
  const chamadas: MensagemEmail[] = [];
  const enviar: EnviarEmail = async (mensagem) => {
    chamadas.push(mensagem);
    if (demoraMs) await new Promise((r) => setTimeout(r, demoraMs));
    return resultado;
  };
  return { enviar, chamadas };
}

async function alerta(id: string) {
  const { data, error } = await admin.from("alertas_estoque").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

beforeAll(async () => {
  const { data } = await admin
    .from("configuracoes")
    .select("alertas_ativos, email_alerta")
    .eq("id", 1)
    .single();
  configOriginal = data!;
  proprietario = await criarUsuario("proprietario");
});

beforeEach(async () => {
  await configurar({ alertas_ativos: true, email_alerta: EMAIL_TESTE });
});

afterAll(async () => {
  if (configOriginal) await configurar(configOriginal);
  for (const id of produtosCriados) await removerProduto(id);
  if (proprietario) await removerUsuario(proprietario.id);
});

describe("envio", () => {
  it("envia um e-mail com o texto da especificação e marca como enviado", async () => {
    const { produto, alerta: a } = await produtoComAlerta({ nome: "Leite Integral 1 L teste", unidade: "un" });
    const falso = enviadorFalso();

    const resumo = await processarAlertas({ ids: [a.id], enviar: falso.enviar });

    expect(resumo).toEqual({ situacao: "processado", enviados: 1, falhas: 0 });
    expect(falso.chamadas).toEqual([
      {
        para: EMAIL_TESTE,
        assunto: "Alerta de estoque baixo: Leite Integral 1 L teste",
        texto:
          "ALERTA DE ESTOQUE BAIXO\n\nProduto: Leite Integral 1 L teste\nEstoque atual: 3 un\nEstoque mínimo: 10 un\n\nRecomendamos realizar a reposição deste produto.",
        chaveIdempotencia: `alerta-${a.id}-0`,
      },
    ]);

    const depois = await alerta(a.id);
    expect(depois).toMatchObject({ status: "enviado", tentativas: 0, processando_desde: null });
    expect(depois.enviado_em).not.toBeNull();
    expect(produto.id).toBe(depois.produto_id);
  });

  it("alerta já enviado não é enviado de novo", async () => {
    const { alerta: a } = await produtoComAlerta();
    await processarAlertas({ ids: [a.id], enviar: enviadorFalso().enviar });

    const segundo = enviadorFalso();
    const resumo = await processarAlertas({ ids: [a.id], enviar: segundo.enviar });
    expect(segundo.chamadas).toHaveLength(0);
    expect(resumo).toEqual({ situacao: "processado", enviados: 0, falhas: 0 });
  });

  it("três processadores ao mesmo tempo enviam exatamente um e-mail", async () => {
    const { alerta: a } = await produtoComAlerta();
    const falso = enviadorFalso({ ok: true }, 300);

    await Promise.all([
      processarAlertas({ ids: [a.id], enviar: falso.enviar }),
      processarAlertas({ ids: [a.id], enviar: falso.enviar }),
      processarAlertas({ ids: [a.id], enviar: falso.enviar }),
    ]);

    expect(falso.chamadas).toHaveLength(1);
    expect((await alerta(a.id)).status).toBe("enviado");
  });
});

describe("falhas e novas tentativas", () => {
  it("falha grava o erro e soma tentativas; cada tentativa usa outra chave", async () => {
    const { alerta: a } = await produtoComAlerta();
    const falso = enviadorFalso({ ok: false, erro: "Resend recusou o envio: domínio inválido" });

    await processarAlertas({ ids: [a.id], enviar: falso.enviar });
    expect(await alerta(a.id)).toMatchObject({
      status: "falhou",
      tentativas: 1,
      ultimo_erro: "Resend recusou o envio: domínio inválido",
      processando_desde: null,
    });

    await processarAlertas({ ids: [a.id], enviar: falso.enviar });
    expect((await alerta(a.id)).tentativas).toBe(2);
    expect(falso.chamadas.map((c) => c.chaveIdempotencia)).toEqual([
      `alerta-${a.id}-0`,
      `alerta-${a.id}-1`,
    ]);

    // Depois de uma falha, o reenvio com sucesso limpa o erro.
    await processarAlertas({ ids: [a.id], enviar: enviadorFalso().enviar });
    expect(await alerta(a.id)).toMatchObject({ status: "enviado", ultimo_erro: null });
  });

  it("com 5 tentativas o cron desiste, mas o botão do proprietário tenta", async () => {
    const { alerta: a } = await produtoComAlerta();
    await admin.from("alertas_estoque").update({ status: "falhou", tentativas: 5 }).eq("id", a.id);

    const cron = enviadorFalso();
    await processarAlertas({ ids: [a.id], enviar: cron.enviar });
    expect(cron.chamadas).toHaveLength(0);

    const manual = enviadorFalso();
    await processarAlertas({ ids: [a.id], enviar: manual.enviar, ignorarLimiteTentativas: true });
    expect(manual.chamadas).toHaveLength(1);
  });

  it("sem RESEND_API_KEY não simula envio: registra a falha com mensagem clara", async () => {
    const { alerta: a } = await produtoComAlerta();
    const chave = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    try {
      expect(
        await enviarEmailResend({ para: "x@y.z", assunto: "a", texto: "b", chaveIdempotencia: "k" }),
      ).toEqual({ ok: false, erro: ERRO_SEM_CHAVE });

      const resumo = await processarAlertas({ ids: [a.id] }); // enviador real
      expect(resumo).toEqual({ situacao: "processado", enviados: 0, falhas: 1 });
      expect(await alerta(a.id)).toMatchObject({ status: "falhou", ultimo_erro: ERRO_SEM_CHAVE });
    } finally {
      if (chave !== undefined) process.env.RESEND_API_KEY = chave;
    }
  });
});

describe("quando nada deve ser enviado", () => {
  it("alertas desativados: nada é enviado e o alerta continua pendente", async () => {
    const { alerta: a } = await produtoComAlerta();
    await configurar({ alertas_ativos: false });
    const falso = enviadorFalso();

    const resumo = await processarAlertas({ ids: [a.id], enviar: falso.enviar });

    expect(resumo.situacao).toBe("desativados");
    expect(falso.chamadas).toHaveLength(0);
    expect(await alerta(a.id)).toMatchObject({ status: "pendente", tentativas: 0 });
  });

  it("sem e-mail de destino: nada é enviado", async () => {
    const { alerta: a } = await produtoComAlerta();
    await configurar({ email_alerta: null });
    const falso = enviadorFalso();

    const resumo = await processarAlertas({ ids: [a.id], enviar: falso.enviar });
    expect(resumo.situacao).toBe("sem_email");
    expect(falso.chamadas).toHaveLength(0);
  });

  it("produto reposto antes do envio: resolve sem e-mail", async () => {
    const { produto, alerta: a } = await produtoComAlerta();
    await proprietario.cliente.rpc("registrar_entrada", { p_produto_id: produto.id, p_quantidade: 50 });
    const falso = enviadorFalso();

    await processarAlertas({ ids: [a.id], enviar: falso.enviar });
    expect(falso.chamadas).toHaveLength(0);
    expect((await alerta(a.id)).resolvido_em).not.toBeNull();
  });

  it("produto desativado antes do envio: resolve sem e-mail", async () => {
    const { produto, alerta: a } = await produtoComAlerta();
    await admin.from("produtos").update({ ativo: false }).eq("id", produto.id);
    const falso = enviadorFalso();

    await processarAlertas({ ids: [a.id], enviar: falso.enviar });
    expect(falso.chamadas).toHaveLength(0);
    expect(await alerta(a.id)).toMatchObject({ status: "pendente" });
    expect((await alerta(a.id)).resolvido_em).not.toBeNull();
  });
});

describe("permissões da fila", () => {
  it("usuário logado (mesmo proprietário) não reserva alertas pela API", async () => {
    const { error } = await proprietario.cliente.rpc("reservar_alertas_para_envio", {});
    expect(error?.code).toBe("42501");
  });

  it("proprietário não altera alertas diretamente", async () => {
    const { alerta: a } = await produtoComAlerta();
    const { error } = await proprietario.cliente
      .from("alertas_estoque")
      .update({ status: "enviado" })
      .eq("id", a.id);
    expect(error?.code).toBe("42501");
  });
});
