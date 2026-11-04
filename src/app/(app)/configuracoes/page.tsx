import type { Metadata } from "next";
import { CircleAlert, CircleCheck } from "lucide-react";

import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { statusIntegracaoEmail } from "@/lib/integrations/resend";
import { listarAlertasRecentes, obterConfiguracoes } from "@/lib/services/configuracoes";
import { exigirProprietario } from "@/lib/services/sessao";

import { BotaoReenviar } from "./botao-reenviar";
import { FormularioConfiguracoes } from "./formulario-configuracoes";
import { TabelaAlertas } from "./tabela-alertas";

export const metadata: Metadata = { title: "Configurações" };

function ItemStatus({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {ok ? (
        <CircleCheck className="size-4 text-emerald-600" />
      ) : (
        <CircleAlert className="size-4 text-destructive" />
      )}
      {texto}
    </li>
  );
}

export default async function PaginaConfiguracoes() {
  await exigirProprietario();

  const [config, { alertas, aguardandoEnvio }] = await Promise.all([
    obterConfiguracoes(),
    listarAlertasRecentes(),
  ]);
  const integracao = statusIntegracaoEmail();

  // Por que nada está sendo enviado (na ordem em que o sistema confere).
  const motivoSemEnvio = !config.alertas_ativos
    ? "Os alertas estão desativados. Eles continuam sendo registrados como pendentes, mas nenhum e-mail é enviado."
    : !config.email_alerta
      ? "Nenhum e-mail de destino definido. Os alertas ficam pendentes até você informar um e-mail."
      : !integracao.chaveConfigurada
        ? "A integração com o Resend não está configurada no servidor (RESEND_API_KEY). Os envios ficam registrados como falha."
        : !integracao.remetenteConfigurado
          ? "O remetente dos e-mails não está configurado no servidor (ALERTA_EMAIL_REMETENTE). Os envios ficam registrados como falha."
          : null;

  return (
    <>
      <CabecalhoPagina titulo="Configurações" descricao="Alertas de estoque baixo por e-mail." />

      {motivoSemEnvio ? (
        <div
          role="alert"
          className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            <strong>Nenhum e-mail está sendo enviado.</strong> {motivoSemEnvio}
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Alertas por e-mail</CardTitle>
          </CardHeader>
          <CardContent>
            <FormularioConfiguracoes
              alertasAtivos={config.alertas_ativos}
              emailAlerta={config.email_alerta}
            />
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Integração de e-mail</CardTitle>
            <CardDescription>Envio pelo Resend, configurado no servidor.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <ItemStatus
                ok={integracao.chaveConfigurada}
                texto={integracao.chaveConfigurada ? "Chave do Resend configurada" : "Chave do Resend ausente"}
              />
              <ItemStatus
                ok={integracao.remetenteConfigurado}
                texto={integracao.remetenteConfigurado ? "Remetente configurado" : "Remetente ausente"}
              />
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Últimos alertas</h2>
            <p className="text-sm text-muted-foreground">
              Falhas são tentadas de novo uma vez por dia, até 5 vezes. O botão tenta agora, mesmo
              depois disso.
            </p>
          </div>
          <BotaoReenviar aguardando={aguardandoEnvio} />
        </div>
        <TabelaAlertas alertas={alertas} />
      </div>
    </>
  );
}
