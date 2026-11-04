# Decisões do projeto

Decisões aprovadas que complementam o `CLAUDE.md`. Cada item diz o que foi decidido e por quê.

## Aprovadas na Fase 0 (planejamento)

| # | Decisão | Motivo |
|---|---|---|
| A | Banco local com **Docker Desktop** + Supabase CLI (`npx supabase`) | Testes de banco rodam isolados, sem misturar com dados reais |
| B | `produtos.quantidade` continua **inteiro**; produtos em kg/L são vendidos como embalagem ("pacote 1 kg", "garrafa 2 L") | Mantém a especificação simples; venda a granel fica fora do escopo |
| C | **Saída manual e ajuste** que deixam o estoque ≤ mínimo também criam alerta (se não houver alerta aberto) | O dono precisa saber do estoque baixo, não importa a causa |
| D | **Cancelamento de venda** que devolve o estoque acima do mínimo resolve o alerta aberto | Mesmo comportamento da entrada e do ajuste |
| E | Ao reprocessar alertas pendentes, só envia se o produto **ainda** estiver ≤ mínimo; senão marca como resolvido sem e-mail | Evita e-mails antigos depois de os alertas ficarem desligados |
| F | Dependências extras: `sonner` (toasts, padrão do shadcn), `supabase` (CLI, dev) e `server-only` | Ver justificativa abaixo |
| G | Fase 0 sem commit; repositório criado na Fase 1 | Não havia código |

## Decisões técnicas da Fase 1

- **`server-only`**: pacote oficial do React. Se um arquivo com segredo (service role, Resend) for importado por engano num componente de cliente, o build quebra em vez de vazar a chave.
- **`cn`**: instalado pelo próprio shadcn/ui (repositório `shadcn-ui/cn`); substitui `clsx` + `tailwind-merge`.
- **Cache Components desligado** (`next.config.ts`): o template do Next 16.4 liga por padrão. Como quase toda tela depende do usuário logado e do RLS, renderizamos por requisição. Isso simplifica o código e elimina o risco de cache compartilhar dados entre usuários.
- **`@types/node@24`**: o template vinha com a v20, incompatível com o Vitest 5. A v24 corresponde ao Node LTS usado pela Vercel.
- **Proxy (antigo middleware)**: no Next 16 o arquivo se chama `src/proxy.ts`.

## Decisões técnicas da Fase 2

- **Privilégio mínimo no banco**: a migration de segurança retira todas as permissões padrão que o Supabase dá a `anon` e `authenticated` e concede de volta só o necessário. Tabelas e funções novas nascem fechadas.
- **Funcionário lê produtos pela view `produtos_catalogo`**, que não tem colunas de custo. A tabela `produtos` só é lida pelo proprietário. A view roda com os direitos do dono e se protege com o filtro `eh_usuario_ativo()`; o linter do Supabase avisa "security definer view" e isso é intencional.
- **`quantidade` fora das colunas liberadas** para insert e update. Produto novo nasce com estoque 0; a quantidade inicial entra por uma movimentação de entrada (Fase 3).
- **Sem delete pela API** em produtos e categorias: são desativados.
- **Papel e situação do usuário só mudam pelo painel do Supabase**: não há política de update em `perfis`, então o funcionário não consegue se promover.
- **Cadastro público desligado** (`enable_signup = false` no `supabase/config.toml`). **Em produção, desligar também no painel**: Authentication > Sign In / Providers > "Allow new users to sign up".
- **Usuário desativado** continua conseguindo autenticar no Auth, mas o RLS não devolve nada para ele, e o app mostra "Seu usuário está desativado".
- **Checagem de papel em três camadas**: o proxy só garante que há sessão; `exigirProprietario()` em cada página do proprietário redireciona o funcionário para `/caixa`; o RLS garante o resto.
- **Excluir um usuário que já registrou movimentações ou vendas é bloqueado** pelas chaves estrangeiras. O caminho é desativar (`perfis.ativo = false`), o que preserva o histórico.
- **Usuários de desenvolvimento**: `npm run usuarios:dev` cria um proprietário e um funcionário só no Supabase local (o script recusa outra URL). As credenciais estão em `scripts/criar-usuarios-dev.mts`.

## Aprovadas na Fase 3

| # | Decisão | Motivo |
|---|---|---|
| H | Campo opcional **"Estoque inicial"** no cadastro, registrado como movimentação de entrada ("Estoque inicial") | O dono cadastra e já informa o que tem na prateleira, sem perder o histórico |
| I | **Mudar o estoque mínimo** reavalia o alerta na hora: subir acima da quantidade abre alerta; baixar resolve | Mesmo princípio da decisão C: o dono precisa saber do estoque baixo, não importa a causa |

## Decisões técnicas da Fase 3

- **Regra de alertas num trigger de `produtos`** (`avaliar_alerta_estoque`): roda quando quantidade, estoque mínimo ou situação mudam, e também no cadastro. Abre um alerta se `quantidade <= estoque_minimo` (produto ativo) e resolve o alerta aberto quando a quantidade passa do mínimo. Fica num lugar só e vale para venda, cancelamento, entrada, saída, ajuste e edição, sem repetir código em cada função.
- **Consequência**: produto cadastrado com estoque 0 (ou abaixo do mínimo) já nasce com alerta aberto. Produto desativado não abre alerta novo.
- **Cadastro só pela função `cadastrar_produto`**: o insert direto na tabela foi retirado. O produto nasce já com a quantidade inicial e a movimentação, numa transação só.
- **`aplicar_movimentacao`**: função interna (ninguém chama pela API) que trava a linha do produto, calcula o novo saldo, recusa estoque negativo e grava a movimentação. As funções públicas (`registrar_entrada`, `registrar_saida_manual`, `registrar_ajuste`) só checam papel e entradas e a chamam. A Fase 4 (venda) e a Fase 8 (cancelamento) vão reutilizá-la.
- **Erros de regra com código `P0001`**: a aplicação mostra a mensagem do banco ao usuário (ex.: "Estoque insuficiente de Leite: há 3 un em estoque."). Outros erros viram mensagem genérica e o detalhe vai para o log.
- **Colunas geradas** em `produtos`: `estoque_baixo` (o PostgREST não compara duas colunas num filtro) e `busca` (nome + código, minúsculo e sem acento, com a extensão `unaccent`). Buscar "feijao" encontra "Feijão".
- **Categorias** sem repetição ignorando maiúsculas ("Bebidas" e "bebidas").
- **Lista de produtos pela view sem custo** para os dois papéis; para o proprietário, o custo da página atual vem numa segunda consulta à tabela. Assim busca, filtros e paginação ficam num código só.
- **Filtros na URL** (`?busca=...&estoque=baixo`): a página consulta o banco no servidor, com 50 itens por página. O filtro sobrevive ao recarregar e pode ser compartilhado.
- **Formulários enviados por `onSubmit`** (e não `<form action>`): o React 19 limpa o formulário depois de um `<form action>`, e o usuário perderia o que digitou se houvesse erro de validação.
- **Dinheiro digitado** ("1.234,56") é normalizado para texto decimal ("1234.56") e enviado assim ao banco, sem passar por número de ponto flutuante.
- **Saída e ajuste pedem confirmação** mostrando o estoque antes e depois.
- **Dependência nova: `cmdk`**, instalada pelo componente `Command` do shadcn/ui. Ela serve ao seletor de produto com busca (combobox acessível por teclado), usado no estoque e nos filtros.
- **Redirecionamento do funcionário** em páginas do proprietário: como o layout tem `loading.tsx`, o Next responde 200 com um redirecionamento embutido no HTML, sem nenhum dado da página. O banco continua sendo a barreira real.

## Aprovadas na Fase 4

| # | Decisão | Motivo |
|---|---|---|
| J | Em **Dinheiro**, campo opcional "Valor recebido" que mostra o **troco** (não é gravado) e impede finalizar se o valor for menor que o total | Agiliza o balcão sem mudar o que a venda registra |

## Decisões técnicas da Fase 4

- **`registrar_venda` cria a venda antes dos itens** (`insert ... on conflict (chave_idempotencia) do nothing`). Se a chave já existe, devolve a venda existente com `ja_registrada = true`. Dois envios simultâneos com a mesma chave: o segundo espera o primeiro terminar e devolve a mesma venda.
- **Itens lidos só por `produto_id` e `quantidade`**: qualquer preço enviado pelo navegador é ignorado. O mesmo produto repetido é somado numa linha.
- **Travas em ordem de id** e baixa pela mesma `aplicar_movimentacao` da Fase 3. Qualquer falha (sem estoque, desativado, inexistente) desfaz a transação inteira.
- **Alertas devolvidos pela venda**: o trigger da Fase 3 abre os alertas; a função devolve os criados na própria transação (filtro por `xmin`, o id da transação). O envio por e-mail entra na Fase 5.
- **Caixa carrega os produtos ativos de uma vez** (sem custo) e busca no navegador, sem diferenciar acentos: a busca precisa ser instantânea. O estoque mostrado é referência; quem confere é o banco. Depois de cada venda a lista é recarregada.
- **Carrinho em `lib/caixa.ts`**, sem React e testado: total e troco em centavos inteiros. O total que vale é o do banco.
- **Atalhos**: Enter adiciona (código exato ou resultado destacado; setas mudam o destaque), F2 finaliza, Esc limpa a busca ou pede confirmação para cancelar a venda.
- **Erro ao finalizar mantém a venda na tela com a mesma chave**: tentar de novo nunca duplica.
- **Forma de pagamento sem padrão**: o operador escolhe a cada venda, para evitar registrar a forma errada.

## Decisões técnicas da Fase 5

- **Envio só no servidor, com o SDK oficial do Resend** (`resend`, dependência prevista na stack). Sem chave ou sem remetente, o alerta vira `falhou` com mensagem clara; nada é simulado.
- **Exatamente um e-mail por alerta**: a venda, o cron e o botão podem processar a fila ao mesmo tempo. A função `reservar_alertas_para_envio` marca `processando_desde` com `for update skip locked`, e só quem reservou envia. Uma reserva com mais de 10 minutos é considerada abandonada. Além disso, cada tentativa envia uma chave de idempotência ao Resend (`alerta-<id>-<tentativa>`).
- **Decisão E na prática**: antes de enviar, alerta cujo produto voltou acima do mínimo **ou foi desativado** é resolvido sem e-mail (fecha a pendência da Fase 3).
- **Service role só no processamento da fila** (`lib/supabase/admin.ts`, `server-only`): o envio é disparado também pela venda do funcionário, que não pode alterar alertas, e pelo cron, que não tem usuário. A função de reserva só pode ser executada pela service role.
- **Envio depois da resposta** com `after()` do Next: a venda não espera o e-mail e continua válida se ele falhar. O mesmo vale para saída, ajuste, cadastro, edição e reativação de produto, que também podem abrir alertas (decisões C e I).
- **Alertas desligados ou sem e-mail de destino**: nada é reservado nem contado como tentativa; os alertas ficam `pendente` e a tela de configurações explica o motivo.
- **Limite de 5 tentativas vale para o cron**; o botão "Reenviar" do proprietário ignora o limite.
- **Cron diário** (`0 12 * * *`, 9h–10h em Brasília), compatível com o plano Hobby da Vercel. Detalhes no README.
- **`CRON_SECRET` comparado em tempo constante**; sem segredo configurado, a rota recusa tudo.
- **Botão "+ Estoque"** no lugar do ícone ⇄ na lista de produtos (pedido do usuário).
- **Testes** trocam o envio real por um falso (injeção do enviador); o alias de `server-only` no Vitest permite testar os serviços do servidor.

## Aprovadas na Fase 6

| # | Decisão | Motivo |
|---|---|---|
| K | **Hoje x ontem até a mesma hora** | Comparar a manhã de hoje com o dia inteiro de ontem mostraria queda falsa |
| L | **Rodada visual depois da Fase 6**, antes do deploy (o usuário achou o design genérico) | A demo vai ao ar já com o visual novo; cores ficam em tokens do tema |

## Decisões técnicas da Fase 6

- **Mesmo trecho de tempo em todas as comparações** (estende K): 7 e 30 dias comparam com a janela anterior de mesmo tamanho; "Este mês" com o mês anterior até o mesmo dia **e hora**; se o mês anterior não tem aquele dia (31/03 x fevereiro), vai até o fim dele. "Mês anterior" compara meses inteiros.
- **Períodos calculados em `lib/periodos.ts`** (funções puras, testadas) e enviados prontos ao banco; **somas e agrupamentos no banco** (`resumo_vendas`, `faturamento_por_dia`, `faturamento_por_mes`, `top_produtos`, `vendas_por_forma`). Nenhuma venda individual vai para o navegador.
- **Funções de indicadores com `security invoker`**: valem o RLS de vendas e, além disso, recusam quem não é proprietário com erro 42501.
- **Variação sem base** (período anterior sem vendas) mostra "—" em vez de um percentual infinito.
- **Margem bruta** exibida junto ao lucro bruto estimado; o bloco avisa que não desconta despesas.
- **Gráficos** (Recharts) de série única, sem legenda, barras de até 24px com ponta arredondada, grade discreta, tooltip e "Ver dados em tabela" para acessibilidade. Cor única `--chart-1` (azul validado), trocável na rodada visual.
- **Seed coerente**: escreve o histórico com as datas do passado (por isso desliga os triggers de alerta durante o script e avalia os alertas no fim). Recusa rodar duas vezes. `limpar-dados.sql` roda num único bloco (tudo ou nada).
- **`supabase db query -f`** executa um comando por arquivo: por isso os scripts SQL são um único bloco `do $$ ... $$`.
