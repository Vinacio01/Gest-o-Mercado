# Operação (guia de manutenção)

Para quem vai manter o sistema no ar. Comandos rodam na raiz do projeto.

## Onde cada coisa vive

| Coisa | Onde |
|---|---|
| Site | Vercel (deploy automático a cada push na `main`) |
| Banco e usuários | Supabase (projeto de produção) |
| E-mails | Resend |
| Código e CI | GitHub (`Vinacio01/fruteira-iracema`) |
| Segredos de produção | Variáveis da Vercel + `.env.producao.local` (ignorado pelo Git, só na máquina do mantenedor) |

## Tarefas comuns

| Quero... | Faça |
|---|---|
| Rodar localmente | `npx supabase start` e depois `npm run dev` |
| Rodar todos os testes | `npm test` (banco) e `npm run test:e2e` (navegador) |
| Mudar o banco | Criar uma migration nova em `supabase/migrations/` (nunca editar as antigas), aplicar com `npx supabase db push --remote` e rodar `npm run db:tipos` |
| Criar usuário | Painel do Supabase, Authentication, Users; depois ajustar `papel` na tabela `perfis` |
| Desativar um usuário | `perfis.ativo = false` |
| Renovar os dados da demo | `npm run demo:redefinir-producao` (**apaga** as vendas atuais) |
| Limpar para uso real | `npm run db:limpar` (ver README) |
| Reenviar alertas | Tela Configurações, botão "Reenviar alertas pendentes" |

## Variáveis de ambiente

Lista em `.env.example`. Em produção ficam na Vercel (Settings, Environment Variables). Depois de mudar uma variável, é preciso **reimplantar** para valer.

## Problemas conhecidos e como resolver

| Sintoma | Causa provável | Solução |
|---|---|---|
| Login não responde depois de dias parado | Plano free do Supabase pausa após 7 dias | Abrir o painel do Supabase e clicar em *Restore* |
| "Resend não configurado" em Configurações | `RESEND_API_KEY` ausente na Vercel | Cadastrar a chave e reimplantar |
| Alerta fica "falhou" | Resend recusou (o remetente de teste só entrega ao dono da conta) ou chave inválida | Ver o erro na lista de alertas; verificar domínio no Resend |
| Cron não envia | `CRON_SECRET` diferente entre Vercel e requisição | Conferir o valor na Vercel e reimplantar |
| CI vermelho em "tipos do banco" | Migration nova sem atualizar `src/types/database.ts` | `npm run db:tipos` e commitar |
| Painel com poucos dados | Dados da demo envelheceram | `npm run demo:redefinir-producao` |

## Cron

`vercel.json` agenda `/api/cron/alertas` 1 vez por dia (limite do plano Hobby). Detalhes e alternativas no README.

## Rotina sugerida

- A cada mudança: `npm run lint && npm run typecheck && npm test`
- Todo mês: `npm audit --omit=dev` e atualizar dependências
- Antes de mostrar a demo: abrir o site (acorda o banco) e, se preciso, redefinir os dados
