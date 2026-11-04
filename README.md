# Estoque Mercadinho

Sistema de caixa, controle de estoque e painel financeiro para um mercadinho de bairro em Caxias do Sul.

> Em construção. O README completo (problema, solução, como rodar e publicar) será escrito na Fase 7.

## Rodando localmente

Pré-requisitos: Node.js 24 ou mais recente, npm e **Docker Desktop** rodando.

```bash
npm install
npx supabase start          # sobe o Supabase local e aplica as migrations
npx supabase status         # mostra a URL e as chaves locais
cp .env.example .env.local  # preencha com os valores do status
npm run usuarios:dev        # cria um proprietário e um funcionário de teste
npm run dev                 # http://localhost:3000
```

As credenciais dos usuários de teste estão em `scripts/criar-usuarios-dev.mts` (valem só para o banco local).
O Supabase Studio local fica em http://127.0.0.1:54323.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm test` | Testes (Vitest); os de banco exigem o Supabase local rodando |
| `npm run lint` | ESLint |
| `npm run typecheck` | Checagem de tipos do TypeScript |
| `npm run db:reset` | Recria o banco local do zero e reaplica as migrations |
| `npm run db:tipos` | Regera `src/types/database.ts` a partir do banco local |
| `npm run usuarios:dev` | Cria/atualiza os usuários de teste no banco local |

Depois de `npm run db:reset`, rode `npm run usuarios:dev` de novo.

## Documentação

- [`CLAUDE.md`](CLAUDE.md): especificação do produto e regras do projeto
- [`docs/decisoes.md`](docs/decisoes.md): decisões aprovadas durante o desenvolvimento

## Alertas de estoque por e-mail

Quando um produto chega ao estoque mínimo, o sistema registra um alerta e envia **um e-mail por alerta** pelo [Resend](https://resend.com).

- **Configuração no servidor** (`.env.local` ou variáveis da Vercel): `RESEND_API_KEY` e `ALERTA_EMAIL_REMETENTE` (ex.: `Estoque Mercadinho <alertas@seudominio.com.br>`).
- **No sistema**: em **Configurações**, o proprietário liga os alertas e define o e-mail de destino.
- **Sem domínio verificado no Resend**, use o remetente `onboarding@resend.dev`; nesse modo o Resend só entrega para o e-mail dono da conta do Resend.
- Sem a chave configurada, nada é simulado: o alerta fica como **falhou** com a mensagem do motivo, e a tela de configurações mostra o aviso.

### Quando os e-mails saem

1. **Logo depois da venda** (ou de uma saída, ajuste ou edição que deixe o produto no mínimo), sem atrasar a resposta.
2. **Reenvio automático** pela rota `/api/cron/alertas` (Vercel Cron, configurado em `vercel.json`), que tenta de novo os alertas pendentes ou que falharam, até 5 tentativas. A rota exige o cabeçalho `Authorization: Bearer <CRON_SECRET>`; a Vercel envia esse cabeçalho sozinha quando a variável `CRON_SECRET` está definida no projeto.
3. **Botão "Reenviar alertas pendentes"** em Configurações, que tenta na hora, mesmo depois das 5 tentativas.

### Limites do Vercel Cron

Conforme a [documentação da Vercel](https://vercel.com/docs/cron-jobs/usage-and-pricing) (consultada em 04/11/2026):

| Plano | Frequência mínima | Precisão |
|---|---|---|
| **Hobby** (gratuito) | **1 vez por dia** (expressões mais frequentes falham no deploy) | dentro da hora marcada (ex.: `0 12 * * *` roda entre 12:00 e 12:59 UTC) |
| **Pro / Enterprise** | 1 vez por minuto | no minuto marcado |

- O projeto usa `0 12 * * *`: **uma vez por dia, entre 9h e 10h no horário de Brasília**, compatível com o plano Hobby. No plano Pro dá para usar, por exemplo, `*/15 * * * *` (a cada 15 minutos).
- A Vercel avisa que uma execução pode ser **perdida ou duplicada** e não repete execuções que falharam. Por isso o envio imediato após a venda é o caminho principal, e cada alerta é reservado no banco antes do envio: uma execução duplicada nunca manda o mesmo e-mail duas vezes.

Para testar a rota localmente:

```bash
curl -H "Authorization: Bearer <CRON_SECRET do .env.local>" http://localhost:3000/api/cron/alertas
```

## Dados de demonstração

`supabase/seed-demo.sql` cria 7 categorias, 30 produtos de mercadinho e cerca de 90 dias de vendas (crescimento leve entre os meses, sábado forte, domingo fraco, algumas vendas canceladas) e deixa 5 produtos abaixo do estoque mínimo. O histórico é coerente: cada venda baixa o estoque e tem sua movimentação; reposições aparecem como entradas.

**Nunca roda sozinho.** Pré-requisito: um usuário proprietário já criado.

| Onde | Como rodar |
|---|---|
| Local | `npm run db:demo` |
| Produção (Supabase) | Abra **SQL Editor**, cole o conteúdo de `supabase/seed-demo.sql` e clique em **Run** |

Os produtos da demonstração usam códigos de barras `2000000000xxx`; rodar duas vezes é recusado. Os alertas dos produtos com estoque baixo ficam **pendentes** e serão enviados para o e-mail configurado pelo próximo cron ou pelo botão "Reenviar".

### Limpar antes do uso real

`supabase/limpar-dados.sql` **apaga todas** as vendas, movimentações, alertas, produtos e categorias (mantém usuários e configurações). Não tem volta.

| Onde | Como rodar |
|---|---|
| Local | `npm run db:limpar` |
| Produção (Supabase) | Cole `supabase/limpar-dados.sql` no **SQL Editor** e clique em **Run** |

## Painel

Indicadores calculados no banco (funções SQL em `supabase/migrations/20261104000700_indicadores.sql`), sempre sem as vendas canceladas e no fuso de São Paulo. A comparação usa o **mesmo trecho de tempo** do período anterior: às 15h do dia 3, "Este mês" (1º a 3, até 15h) é comparado com 1º a 3 do mês anterior até 15h; "Hoje" com ontem até a mesma hora. O **lucro bruto estimado** é faturamento menos o custo das mercadorias vendidas; não desconta despesas.
