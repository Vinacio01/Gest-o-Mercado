# Estoque Mercadinho — especificação para o Claude Code

## Contexto do produto

Um mercadinho de bairro em Caxias do Sul não tem controle de estoque. O dono só descobre que um produto acabou quando o cliente pede, e não sabe se o mês está melhor ou pior que o anterior.

Este sistema resolve três coisas:
1. **Registrar as vendas no caixa**, dando baixa automática no estoque.
2. **Avisar o proprietário por e-mail** quando um produto chega ao estoque mínimo (padrão: 10 unidades).
3. **Mostrar um painel financeiro**: faturamento, lucro bruto estimado e comparação com o mês anterior.

O pagamento continua na maquininha de cartão que o mercado já usa. O sistema **não** processa pagamento; ele registra a venda e a forma de pagamento depois que o operador confirma.

## Arquitetura: estabelecimento único

O sistema atende **um único mercadinho**.
- Não implementar multi-tenant, SaaS ou suporte a vários estabelecimentos.
- Não criar tabela de estabelecimentos nem colunas `establishment_id`.
- Um banco, um estoque, um histórico de vendas, um painel e uma configuração de notificações.
- Priorizar simplicidade, segurança, organização e facilidade de manutenção.

## Papéis de usuário

| Ação | Proprietário | Funcionário |
|---|---|---|
| Registrar vendas no caixa | sim | sim |
| Consultar produtos e estoque | sim | sim |
| Cadastrar, editar e desativar produtos | sim | não |
| Entrada, saída manual e ajuste de estoque | sim | não |
| Ver painel financeiro (faturamento, custo, lucro) | sim | não |
| Configurar notificações | sim | não |
| Cancelar venda | sim | não |

- Não há cadastro público. Usuários são criados no painel do Supabase, e o papel é definido na tabela `perfis`.
- O funcionário vê os preços de venda, mas **não** vê preço de custo nem dados financeiros.
- As permissões são garantidas **no banco (RLS e funções)**, não só escondendo botões na interface.

## Regra de trabalho deste projeto

Todo o código deste repositório é escrito pelo Claude Code. O desenvolvedor define o que construir, revisa o resultado e pede ajustes por conversa, sem editar código à mão. Ele também está usando o projeto para aprender. Por isso:
- Antes de cada fase, explique a abordagem em poucas linhas, incluindo as decisões técnicas importantes e o porquê.
- Ao final de cada fase, informe:
  1. o que foi implementado;
  2. os arquivos criados ou alterados;
  3. como testar no navegador;
  4. as pendências.
- Rode os testes da fase, faça um commit com mensagem clara em português e **aguarde aprovação** antes de seguir.
- Se uma decisão de produto não estiver nesta especificação, pergunte antes de inventar.
- Não deixe botões sem função nem telas desconectadas do banco.
- Não instale dependências fora da stack sem justificar.
- Não desative mecanismos de segurança para facilitar o desenvolvimento.

## Stack

- **Next.js** (App Router, TypeScript, Server Components e Server Actions)
- **Supabase**: Postgres, Auth (e-mail e senha), Row Level Security e CLI para migrations
- **@supabase/ssr** para sessão no Next.js
- **Tailwind CSS** + **shadcn/ui** + **lucide-react** (ícones)
- **Recharts** para gráficos
- **Zod** para validação
- **Resend** para envio de e-mail
- **Vitest** para testes
- **Vercel** para hospedagem
- Gerenciador de pacotes: npm

Use as versões estáveis atuais e siga a documentação oficial do Supabase para Next.js.

## Organização do código

```
src/
  app/                 rotas (login, caixa, produtos, estoque, painel, configuracoes)
  components/          componentes visuais reutilizáveis
  components/ui/       componentes do shadcn/ui
  lib/supabase/        clientes do Supabase (servidor, navegador, middleware)
  lib/services/        regras de negócio (vendas, estoque, alertas, indicadores)
  lib/validations/     schemas Zod
  lib/integrations/    Resend (e-mail)
  lib/format.ts        formatação de moeda, data e fuso
  types/               tipos TypeScript (incluindo os gerados do banco)
supabase/
  migrations/          SQL versionado
  seed-demo.sql        dados de demonstração (ver seção própria)
tests/
```

- Regras de negócio ficam em `lib/services` ou em funções do Postgres, **nunca duplicadas** em componentes.
- Evite componentes gigantes; quebre em partes com uma responsabilidade cada.

## Variáveis de ambiente

Crie um `.env.example` (sem valores reais):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
ALERTA_EMAIL_REMETENTE=
CRON_SECRET=
```

- `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` e `CRON_SECRET` só no servidor. Nunca em componente de cliente nem com prefixo `NEXT_PUBLIC_`.
- Use a service role só onde for indispensável (ex.: processar a fila de alertas no cron).
- `.env*.local` no `.gitignore`.
- O e-mail **de destino** dos alertas fica no banco (tabela `configuracoes`), editável pelo proprietário.

## Modelo de dados

Migrations SQL em `supabase/migrations`. Nomes de tabelas e colunas em português, sem acentos.

### `perfis`
- `id` uuid PK, referência a `auth.users` (on delete cascade)
- `nome` text
- `papel` enum `papel_usuario` ('proprietario', 'funcionario'), default 'funcionario'
- `ativo` boolean default true

### `categorias`
- `id` uuid PK, `nome` text único, `ativo` boolean

### `produtos`
- `id` uuid PK
- `nome` text obrigatório
- `descricao` text opcional
- `categoria_id` uuid FK opcional
- `codigo_barras` text opcional, único quando preenchido
- `unidade` text default 'un' (un, kg, L, cx)
- `preco_custo` numeric(10,2) ≥ 0
- `preco_venda` numeric(10,2) > 0
- `quantidade` integer ≥ 0
- `estoque_minimo` integer ≥ 0, default 10
- `ativo` boolean default true
- `created_at`, `updated_at` timestamptz

### `movimentacoes_estoque` (toda alteração de estoque passa por aqui)
- `id` uuid PK
- `produto_id` FK
- `tipo` enum: 'entrada', 'saida_manual', 'venda', 'cancelamento_venda', 'ajuste'
- `quantidade` integer (positiva; o tipo indica o sentido, exceto 'ajuste', que registra o novo total)
- `quantidade_anterior`, `quantidade_posterior` integer
- `usuario_id` FK `auth.users`
- `venda_id` FK opcional
- `motivo` text (obrigatório em saída manual e ajuste)
- `created_at` timestamptz

### `vendas`
- `id` uuid PK
- `chave_idempotencia` uuid **único** (gerado no navegador ao iniciar a venda; impede venda duplicada por duplo clique ou reenvio)
- `forma_pagamento` enum: 'dinheiro', 'pix', 'debito', 'credito'
- `total` numeric(10,2)
- `custo_total` numeric(10,2)
- `status` enum: 'concluida', 'cancelada'
- `operador_id` FK `auth.users`
- `cancelada_por`, `cancelada_em`, `motivo_cancelamento` (opcionais)
- `created_at` timestamptz

### `itens_venda`
- `id`, `venda_id` FK (cascade), `produto_id` FK
- `quantidade` integer > 0
- `preco_unitario` numeric(10,2) e `custo_unitario` numeric(10,2): **cópia** dos valores do produto no momento da venda
- `subtotal` numeric(10,2)

### `alertas_estoque`
- `id`, `produto_id` FK
- `quantidade_no_alerta`, `estoque_minimo_no_alerta` integer
- `status` enum: 'pendente', 'enviado', 'falhou'
- `tentativas` integer default 0, `ultimo_erro` text, `enviado_em` timestamptz
- `resolvido_em` timestamptz (preenchido quando o estoque é reposto acima do mínimo)
- `created_at`
- Índice único parcial: no máximo **um alerta aberto** (`resolvido_em is null`) por produto.

### `configuracoes` (linha única)
- `id` fixo (ex.: `1`, com check para impedir outra linha)
- `alertas_ativos` boolean default true
- `email_alerta` text

### Índices
Crie índices em: `produtos(codigo_barras)`, `produtos(nome)`, `vendas(created_at)`, `vendas(status)`, `itens_venda(venda_id)`, `itens_venda(produto_id)`, `movimentacoes_estoque(produto_id, created_at)`.

## Segurança

- RLS ativado em **todas** as tabelas. Anônimos não acessam nada.
- Função auxiliar `eh_proprietario()` (security definer, `search_path` fixo) usada nas políticas.
- Políticas conforme a tabela de papéis acima. Usuário com `perfis.ativo = false` não acessa nada.
- **A coluna `quantidade` de `produtos` não pode ser alterada por update direto.** Revogue o privilégio de update nela para `authenticated`. O estoque só muda pelas funções do banco, que sempre registram a movimentação.
- O preço de custo não pode chegar ao funcionário. Exponha ao funcionário uma view ou função sem colunas de custo.
- Funções `security definer` validam o papel do usuário logo no início e usam `search_path` fixo.
- Valide toda entrada com Zod no servidor, mesmo que já validada no formulário.
- Erros mostrados ao usuário são mensagens amigáveis; detalhes técnicos vão só para o log do servidor.
- A rota do cron exige o cabeçalho `Authorization: Bearer ${CRON_SECRET}`.

## Regras de negócio

### Registrar venda
Função Postgres `registrar_venda(chave_idempotencia uuid, forma_pagamento, itens jsonb)`, chamada por RPC, numa **única transação**:
1. Se já existir venda com essa chave, retorna a venda existente sem processar de novo.
2. Trava as linhas dos produtos (`select ... for update`, em ordem de id para evitar deadlock).
3. Verifica estoque suficiente e produto ativo. Se algum item falhar, cancela a venda inteira e retorna erro com o nome do produto.
4. Usa preço de venda e custo **do banco**, nunca valores enviados pelo navegador.
5. Cria a venda e os itens, baixa as quantidades e registra uma movimentação 'venda' por item.
6. Para cada produto que ficou com `quantidade <= estoque_minimo` e não tem alerta aberto, cria um alerta 'pendente'.
7. Retorna a venda e os ids dos alertas criados.

### Movimentações manuais (só proprietário)
Funções `registrar_entrada`, `registrar_saida_manual` e `registrar_ajuste`, todas transacionais e registrando a movimentação. Saída manual e ajuste exigem motivo. Saída nunca deixa o estoque negativo.

Quando uma entrada ou ajuste deixa a quantidade **acima** do mínimo, o alerta aberto do produto recebe `resolvido_em = now()`. Assim um novo ciclo de alerta pode acontecer.

### Cancelar venda (só proprietário)
Função `cancelar_venda(venda_id, motivo)`: marca a venda como 'cancelada', devolve as quantidades ao estoque e registra movimentações 'cancelamento_venda'. Uma venda cancelada não pode ser cancelada de novo.

### Alertas por e-mail
- Depois de uma venda concluída, a Server Action dispara o envio dos alertas pendentes **sem bloquear a resposta da venda**. Se o e-mail falhar, a venda continua válida.
- O envio usa o Resend, com um e-mail por alerta, assunto "Alerta de estoque baixo: {produto}" e este corpo:

  ```
  ALERTA DE ESTOQUE BAIXO

  Produto: {nome}
  Estoque atual: {quantidade} {unidade}
  Estoque mínimo: {estoque_minimo} {unidade}

  Recomendamos realizar a reposição deste produto.
  ```
- Sucesso: `status = 'enviado'`, `enviado_em = now()`. Falha: `status = 'falhou'`, incrementa `tentativas` e grava `ultimo_erro`.
- **Reenvio**: uma rota `/api/cron/alertas` (Vercel Cron) reprocessa alertas 'pendente' ou 'falhou' com menos de 5 tentativas. Consulte os limites de frequência do Cron no plano da Vercel e documente-os no README. Na tela de configurações, o proprietário também tem um botão "Reenviar alertas pendentes".
- Se `alertas_ativos = false` ou `email_alerta` estiver vazio, os alertas ficam registrados como 'pendente' e a tela de configurações avisa por que nada foi enviado.
- Se `RESEND_API_KEY` não estiver configurada, **não simule envio**: registre a falha com uma mensagem clara e mostre o aviso na tela de configurações.

### Datas, fuso e moeda
- Todo cálculo de dia e mês usa o fuso `America/Sao_Paulo`. Uma venda às 22h do dia 31 pertence ao dia 31.
- Valores em `R$ 1.234,56` e datas em `dd/mm/aaaa`, via `Intl` com locale `pt-BR`.
- Dinheiro é sempre `numeric` no banco. No TypeScript, não faça contas de dinheiro com ponto flutuante: some no banco ou trabalhe em centavos.

## Telas

Interface em português do Brasil: moderna, limpa, com sidebar, cards e boa hierarquia. Sem gradientes nem enfeites. Deve funcionar em desktop, tablet e celular, mas o caixa é pensado para desktop. Inclua estados de carregamento, mensagens de sucesso e erro (toasts) e confirmação antes de ações destrutivas.

### `/login`
E-mail e senha, sem "criar conta". Um middleware protege todas as outras rotas. Depois do login, o funcionário vai para `/caixa` e o proprietário para `/painel`.

### `/caixa` (proprietário e funcionário)
Velocidade acima de tudo:
- Busca com foco automático, por nome ou código de barras. Código exato + Enter adiciona direto (leitor de código de barras funciona como teclado).
- Lista da venda: produto, quantidade (+ e −), subtotal e remover.
- Total grande, seleção da forma de pagamento, "Finalizar venda" (F2) e "Cancelar" (Esc).
- O botão de finalizar fica desabilitado enquanto processa.
- Depois de finalizar: confirmação curta e tela limpa com nova chave de idempotência.
- Produto sem estoque aparece na busca, mas não pode ser adicionado.

### `/produtos`
- Tabela com busca, filtro por categoria, ordenação por quantidade e filtros rápidos "Estoque baixo" e "Sem estoque".
- Proprietário: criar, editar e desativar produtos e gerenciar categorias. Funcionário: só consulta, sem colunas de custo.

### `/estoque` (proprietário)
- Registrar entrada, saída manual e ajuste.
- Histórico de movimentações com filtro por produto, tipo e período.

### `/vendas` (proprietário)
- Histórico de vendas com filtro por período, forma de pagamento e status.
- Detalhe da venda e botão "Cancelar venda" com motivo e confirmação.

### `/painel` (proprietário)
Período padrão "Este mês", com seletor: Hoje, Últimos 7 dias, Últimos 30 dias, Este mês e Mês anterior.

Cards:
1. Faturamento do dia
2. Faturamento do período
3. Variação contra o período anterior equivalente, em % (verde se subiu, vermelho se caiu). Em "Este mês", compare com o mês anterior **até o mesmo dia** (ex.: 1 a 3 de novembro contra 1 a 3 de outubro)
4. Quantidade de vendas
5. Ticket médio (faturamento ÷ vendas válidas)
6. Produtos com estoque baixo, com link para a lista

Bloco financeiro com **faturamento**, **custo das mercadorias vendidas** e **lucro bruto estimado**, rotulados assim. Nunca chame faturamento de lucro.

Gráficos (Recharts):
- Faturamento por dia no período
- Faturamento dos últimos 6 meses
- Top 10 produtos mais vendidos
- Vendas por forma de pagamento

**Vendas canceladas não entram em nenhum indicador.** Calcule os indicadores no banco (funções SQL ou views), não trazendo todas as vendas para o navegador.

### `/configuracoes` (proprietário)
- Ativar ou desativar alertas e definir o e-mail de destino.
- Status da integração de e-mail (configurada ou não).
- Lista dos últimos alertas com status e erro, mais o botão de reenviar.

## Dados de demonstração

- `supabase/seed-demo.sql` cria categorias, cerca de 30 produtos realistas de mercadinho (arroz, feijão, leite, café, refrigerante, pão etc., alguns perto do mínimo) e vendas dos últimos 90 dias com variação entre os meses.
- Esses dados existem só para a demonstração e o desenvolvimento. O script nunca roda automaticamente; o README explica como rodar e como limpar os dados antes do uso real.

## Ordem de construção

Uma fase por vez. Ao final de cada uma, siga a "Regra de trabalho" e espere aprovação.

0. **Planejamento (sem código)**: analise o ambiente e apresente a estrutura de pastas, o modelo de dados com relacionamentos, a estratégia de RLS e de alertas, os riscos e as decisões que precisam de aprovação.
1. **Base**: Next.js, TypeScript, Tailwind, shadcn/ui, clientes do Supabase, `.env.example` e layout com sidebar.
2. **Banco e autenticação**: migrations, enums, RLS, papéis, login, middleware e redirecionamento por papel.
3. **Produtos e estoque**: categorias, CRUD de produtos, entradas, saídas, ajustes e histórico.
4. **Caixa**: tela de venda e `registrar_venda`.
5. **Alertas**: envio pelo Resend, tela de configurações, reenvio e cron.
6. **Painel**: indicadores, comparativo, bloco financeiro e gráficos, mais o seed de demonstração.
7. **Deploy**: publicação na Vercel, variáveis de produção e README completo. **A demo precisa estar no ar ao fim desta fase.**
8. **Vendas**: histórico e cancelamento com estorno.

## Testes

Vitest, rodando contra o Supabase local (`supabase start`) quando o teste envolver o banco:
- `registrar_venda`: venda normal, estoque insuficiente (nada é gravado), chave de idempotência repetida (não duplica), preço vindo do banco
- Toda alteração de estoque gera movimentação; update direto em `quantidade` é negado
- Alertas: cria ao cruzar o mínimo, não duplica com alerta aberto, novo ciclo após reposição
- Cancelamento devolve o estoque e sai dos indicadores
- Permissões: funcionário não lê custo, não altera produto e não cancela venda; anônimo não lê nada
- Cálculos: comparação de períodos equivalentes e virada de mês no fuso de São Paulo

## Critérios de pronto da demo

- [ ] Projeto no ar na Vercel, com login funcionando para proprietário e funcionário
- [ ] Venda no caixa baixa o estoque e registra movimentação
- [ ] Produto chegando ao mínimo gera exatamente um e-mail
- [ ] Painel mostra faturamento, lucro bruto estimado e comparação com o mês anterior
- [ ] Repositório público no GitHub, com README explicando o problema, a solução e como rodar
- [ ] Nenhuma chave secreta no repositório
