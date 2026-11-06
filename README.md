# Estoque Mercadinho · Fruteira Iracema

Sistema de caixa, controle de estoque e painel financeiro para a **Mini Mercado e Fruteira Iracema**, um mercadinho de bairro em Caxias do Sul (RS).

## Experimente a demo

**https://gest-o-mercado.vercel.app**

| Entrar como | E-mail | Senha | O que dá para ver |
|---|---|---|---|
| **Proprietário** | `dono@demo-iracema.test` | `demo-iracema-dono` | Painel financeiro, produtos, estoque, histórico de vendas, cancelamento e alertas |
| **Funcionário (caixa)** | `caixa@demo-iracema.test` | `demo-iracema-caixa` | Caixa e consulta de produtos, **sem** preço de custo nem dados financeiros |

Sugestão de roteiro (3 minutos):
1. Entre como **caixa**, digite `2000000000001` na busca e aperte **Enter** (o leitor de código de barras faz o mesmo), escolha **Pix** e aperte **F2**.
2. Saia e entre como **proprietário**: veja a venda em **Vendas**, a baixa em **Estoque > Histórico** e os números no **Painel**.
3. Em **Vendas**, abra a venda e **cancele**: o estoque volta e ela sai do painel.

São dados fictícios de demonstração, redefinidos de tempos em tempos; fique à vontade para vender, cancelar e cadastrar. O login de funcionário mostra que as permissões são aplicadas pelo **banco**, não só escondendo botões: tente abrir `/painel` como caixa.

## O problema

O mercadinho não tinha controle de estoque. O dono só descobria que um produto tinha acabado quando o cliente pedia, e não sabia se o mês estava melhor ou pior que o anterior.

## A solução

1. **Caixa:** o operador registra cada venda (leitor de código de barras, busca por nome, total e forma de pagamento) e o estoque baixa sozinho. O pagamento continua na maquininha de cartão que a loja já usa; o sistema só registra a venda.
2. **Alerta por e-mail:** quando um produto chega ao estoque mínimo (padrão: 10 unidades), o proprietário recebe **um** e-mail avisando para repor.
3. **Painel financeiro:** faturamento do dia e do período, comparação com o período anterior equivalente, ticket médio, custo das mercadorias vendidas, **lucro bruto estimado** e gráficos.

### Quem faz o quê

| Ação | Proprietário | Funcionário |
|---|---|---|
| Registrar vendas no caixa | sim | sim |
| Consultar produtos e estoque (sem preço de custo) | sim | sim |
| Cadastrar, editar e desativar produtos e categorias | sim | não |
| Entrada, saída manual e ajuste de estoque | sim | não |
| Ver o painel financeiro | sim | não |
| Ver o histórico de vendas e cancelar venda (estoque devolvido) | sim | não |
| Configurar os alertas | sim | não |

As permissões são garantidas **no banco** (Row Level Security e funções do Postgres), não só escondendo botões. O funcionário nunca recebe o preço de custo.

## Stack

Next.js 16 (App Router, Server Components e Server Actions) · TypeScript · Supabase (Postgres, Auth, RLS) · Tailwind CSS 4 + shadcn/ui · Recharts · Zod · Resend · Vitest · Vercel.

## Rodando localmente

Pré-requisitos: **Node.js 24** ou mais recente, npm e **Docker Desktop** rodando.

```bash
npm install
npx supabase start          # sobe o Supabase local e aplica as migrations
npx supabase status         # mostra a URL e as chaves locais
cp .env.example .env.local  # preencha com os valores do status
npm run usuarios:dev        # cria um proprietário e um funcionário de teste
npm run db:demo             # (opcional) dados de demonstração
npm run dev                 # http://localhost:3000
```

As credenciais dos usuários de teste estão em `scripts/criar-usuarios-dev.mts` e valem **só** para o banco local. O Supabase Studio local fica em http://127.0.0.1:54323.

### Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm test` | Testes (Vitest); os de banco exigem o Supabase local rodando |
| `npm run lint` · `npm run typecheck` | ESLint · checagem de tipos |
| `npm run db:reset` | Recria o banco local do zero (depois rode `npm run usuarios:dev`) |
| `npm run db:tipos` | Regera `src/types/database.ts` a partir do banco local |
| `npm run usuarios:dev` | Cria/atualiza os usuários de teste no banco local |
| `npm run db:demo` · `npm run db:limpar` | Dados de demonstração · apagar os dados do mercado |

## Variáveis de ambiente

Copie `.env.example` para `.env.local` (local) ou cadastre na Vercel (produção). **Nunca** coloque valores reais no repositório.

| Variável | Onde é usada | Observação |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | navegador e servidor | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | navegador e servidor | chave pública (*publishable* ou *anon*); o RLS protege os dados |
| `SUPABASE_SERVICE_ROLE_KEY` | **só servidor** | chave secreta; usada só para processar a fila de alertas |
| `RESEND_API_KEY` | **só servidor** | envio de e-mail |
| `ALERTA_EMAIL_REMETENTE` | **só servidor** | ex.: `Fruteira Iracema <onboarding@resend.dev>` |
| `CRON_SECRET` | **só servidor** | segredo da rota do cron; gere um valor aleatório longo |

O e-mail que **recebe** os alertas não é variável de ambiente: o proprietário define em **Configurações**.

## Publicando (Supabase + Vercel)

### 1. Banco (Supabase)

1. Crie um projeto em [supabase.com](https://supabase.com) (região **South America (São Paulo)**). Guarde a senha do banco num gerenciador de senhas.
2. Aplique as migrations do repositório:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-do-projeto>
   npx supabase db push
   ```
3. Em **Authentication > Sign In / Providers**, desligue **Allow new users to sign up** (não há cadastro público). Em **Authentication > URL Configuration**, coloque o endereço da Vercel em **Site URL**.
4. Crie os usuários em **Authentication > Users > Add user** (marque *Auto Confirm User*). Todo usuário nasce como funcionário; para tornar alguém proprietário, rode no **SQL Editor**:
   ```sql
   update public.perfis set papel = 'proprietario', nome = 'Nome do dono'
   where id = (select id from auth.users where email = 'email-do-dono@exemplo.com');
   ```

### 2. App (Vercel)

1. Em [vercel.com](https://vercel.com), **Add New > Project** e importe este repositório do GitHub (o framework Next.js é detectado sozinho).
2. Cadastre as seis variáveis de ambiente da tabela acima, com os valores de **produção** (em *Project Settings > API Keys* do Supabase).
3. **Deploy.** O cron de alertas (`vercel.json`) é registrado automaticamente.

### 3. Depois do primeiro deploy

- Entre como proprietário e, em **Configurações**, ligue os alertas e defina o e-mail de destino.
- Para a demonstração, rode `supabase/seed-demo.sql` no SQL Editor (ver abaixo).

## Alertas de estoque por e-mail

Quando um produto chega ao estoque mínimo, o sistema registra um alerta e envia **um e-mail por alerta** pelo [Resend](https://resend.com).

- **No sistema**: em **Configurações**, o proprietário liga os alertas, define o e-mail de destino, vê os últimos alertas (com o erro, se houver) e pode reenviar os pendentes.
- **Sem domínio verificado no Resend**, use o remetente `onboarding@resend.dev`; nesse modo o Resend só entrega para o e-mail dono da conta do Resend. Para enviar a qualquer endereço, verifique um domínio no Resend.
- Sem a chave configurada, nada é simulado: o alerta fica como **falhou** com a mensagem do motivo, e a tela de configurações mostra o aviso.
- **Exatamente um e-mail por alerta:** cada alerta é reservado no banco antes do envio, então a venda, o cron e o botão podem rodar ao mesmo tempo sem duplicar. Se o produto for reposto antes do envio, o alerta é resolvido sem e-mail.

### Quando os e-mails saem

1. **Logo depois da venda** (ou de uma saída, ajuste ou edição que deixe o produto no mínimo), sem atrasar a resposta.
2. **Reenvio automático** pela rota `/api/cron/alertas` (Vercel Cron), que tenta de novo os alertas pendentes ou que falharam, até 5 tentativas. A rota exige `Authorization: Bearer <CRON_SECRET>`; a Vercel envia esse cabeçalho sozinha quando a variável `CRON_SECRET` está definida.
3. **Botão "Reenviar alertas pendentes"** em Configurações, que tenta na hora, mesmo depois das 5 tentativas.

### Limites do Vercel Cron

Conforme a [documentação da Vercel](https://vercel.com/docs/cron-jobs/usage-and-pricing) (consultada em 04/11/2026):

| Plano | Frequência mínima | Precisão |
|---|---|---|
| **Hobby** (gratuito) | **1 vez por dia** (expressões mais frequentes falham no deploy) | dentro da hora marcada (ex.: `0 12 * * *` roda entre 12:00 e 12:59 UTC) |
| **Pro / Enterprise** | 1 vez por minuto | no minuto marcado |

- O projeto usa `0 12 * * *`: **uma vez por dia, entre 9h e 10h no horário de Brasília**, compatível com o plano Hobby. No plano Pro dá para usar, por exemplo, `*/15 * * * *`.
- A Vercel avisa que uma execução pode ser **perdida ou duplicada** e não repete execuções que falharam. Por isso o envio imediato após a venda é o caminho principal, e a reserva no banco impede e-mail duplicado.

Para testar a rota localmente:

```bash
curl -H "Authorization: Bearer <CRON_SECRET do .env.local>" http://localhost:3000/api/cron/alertas
```

## Painel

Indicadores calculados no banco (funções SQL em `supabase/migrations/20261104000700_indicadores.sql`), sempre **sem as vendas canceladas** e no fuso de São Paulo (uma venda às 22h do dia 31 pertence ao dia 31). A comparação usa o **mesmo trecho de tempo** do período anterior: às 15h do dia 3, "Este mês" (1º a 3, até 15h) é comparado com 1º a 3 do mês anterior até 15h; "Hoje" com ontem até a mesma hora. O **lucro bruto estimado** é faturamento menos o custo das mercadorias vendidas; não desconta despesas como aluguel, luz e taxas da maquininha.

## Dados de demonstração

`supabase/seed-demo.sql` cria 7 categorias, 30 produtos de mercadinho e cerca de 90 dias de vendas (crescimento leve entre os meses, sábado forte, domingo fraco, algumas vendas canceladas) e deixa 5 produtos abaixo do estoque mínimo. O histórico é coerente: cada venda baixa o estoque e tem sua movimentação; reposições aparecem como entradas.

**Nunca roda sozinho.** Pré-requisito: um usuário proprietário já criado.

| Onde | Como rodar |
|---|---|
| Local | `npm run db:demo` |
| Produção (Supabase) | Abra **SQL Editor**, cole o conteúdo de `supabase/seed-demo.sql` e clique em **Run** |

Os produtos da demonstração usam códigos de barras `2000000000xxx`; rodar duas vezes é recusado. Os alertas dos produtos com estoque baixo ficam **pendentes** e são enviados para o e-mail configurado pelo próximo cron ou pelo botão "Reenviar".

### Usuários e redefinição da demo pública

| Comando | O que faz |
|---|---|
| `npm run usuarios:demo -- --env .env.producao.local --producao` | Cria ou atualiza os dois usuários públicos da demo (os da tabela no topo deste README) |
| `npm run demo:redefinir-producao` | **Apaga tudo** no banco de produção (vendas, produtos, alertas) e recria os dados de demonstração, terminando no dia de hoje. Use quando a demo estiver bagunçada ou com os meses vazios |

Os usuários da demo têm senha pública: **nunca** os crie num banco com dados reais de uma loja.

### Limpar antes do uso real

`supabase/limpar-dados.sql` **apaga todas** as vendas, movimentações, alertas, produtos e categorias (mantém usuários e configurações). Não tem volta.

| Onde | Como rodar |
|---|---|
| Local | `npm run db:limpar` |
| Produção (Supabase) | Cole `supabase/limpar-dados.sql` no **SQL Editor** e clique em **Run** |

## Segurança

- **RLS em todas as tabelas**; anônimos e usuários desativados não leem nada. Permissões padrão do Supabase retiradas e liberadas tabela por tabela.
- **Estoque só muda por funções do banco**, que travam a linha do produto e sempre registram a movimentação; o update direto na coluna `quantidade` é negado.
- **Venda numa única transação**, com chave de idempotência (duplo clique ou reenvio não duplica) e preço lido do banco, nunca do navegador.
- **Preço de custo nunca chega ao funcionário**: ele lê produtos por uma view sem as colunas de custo.
- **Segredos só no servidor**: service role, Resend e `CRON_SECRET` não têm prefixo `NEXT_PUBLIC_` e ficam em módulos `server-only`.
- **Toda entrada validada com Zod no servidor**; erros técnicos vão para o log e o usuário vê mensagens amigáveis.

## Testes

```bash
npx supabase start
npm test
```

Cobrem: venda (normal, estoque insuficiente sem gravar nada, idempotência inclusive com envios simultâneos, preço do banco, disputa pelas últimas unidades), movimentações de estoque, ciclo de alertas e fila de envio (exatamente um e-mail), permissões por papel, indicadores (canceladas fora, fuso e virada de mês) e validações.

## Organização

```
src/app/          rotas: login, caixa, produtos, estoque, painel, configuracoes, api/cron
src/components/   componentes visuais (ui/ = shadcn/ui)
src/lib/services/ regras de negócio do lado do Next.js
src/lib/validations/ schemas Zod
src/lib/integrations/ Resend
supabase/migrations/  SQL versionado (tabelas, RLS, funções)
tests/            Vitest (tests/db/ roda contra o Supabase local)
```

## Documentação

- [`CLAUDE.md`](CLAUDE.md): especificação do produto e regras do projeto
- [`docs/decisoes.md`](docs/decisoes.md): decisões aprovadas durante o desenvolvimento, com o motivo de cada uma
