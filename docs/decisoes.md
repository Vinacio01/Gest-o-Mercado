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

## Rodada visual (entre as Fases 6 e 7)

| # | Decisão | Motivo |
|---|---|---|
| M | Identidade da **Mini Mercado e Fruteira Iracema**, direção **"Hortifrúti"**: sidebar verde-folha, vermelho Iracema nas ações principais | Escolha do usuário a partir da placa da loja; tira a cara de template |
| N | O sistema mostra o **nome da loja** (selo oval no login e na sidebar; aba "… \| Iracema") | Escolha do usuário. Telefone e Facebook da placa ficam de fora |

- **Selo oval refeito em código** (`components/selo-iracema.tsx`), sem usar a imagem da placa. A foto das frutas não entra nas telas: a especificação pede interface limpa e sem enfeites.
- **Paleta** em `globals.css` (Folha `#1f4a2c`, Iracema `#b3141c`, Broto `#2f7a3f`, Laranja `#e07a1f`, Limão `#f2c230`, fundo `#f6f7f3`), com contraste conferido (AA).
- **Tipografia**: Zilla Slab (serifa pesada, como o "IRACEMA" da placa) só para logo e títulos; Source Sans 3 para interface, tabelas e **todos os números** (utilitário `numero`: negrito com algarismos alinhados e tabulares). Os algarismos da Zilla variam de altura e ficavam irregulares nos valores (pedido do usuário).
- **Um ponto de destaque**: o total do caixa em vermelho com serifa, como placa de preço de fruteira.
- **Vermelho significa redução ou problema** (variação negativa, saída, falha); por isso gráficos, "Entrada", "Enviado" e o interruptor ligado usam o verde Broto, nunca o vermelho da marca.
- **Cabeçalho** mostra a data de hoje no lugar do nome do sistema (útil para quem está no caixa).

## Fase 7: deploy

- **Produção**: Vercel (plano Hobby) em https://gest-o-mercado.vercel.app e Supabase (plano Free, região São Paulo). O plano Free pausa o projeto depois de 7 dias sem uso; para religar, *Restore* no painel (os dados ficam).
- **Banco criado só pelas migrations** (`supabase db push --remote`); conferido: 7 migrations, RLS em 8 de 8 tabelas, anônimo sem acesso, `quantidade` sem update direto e função interna de estoque fechada.
- **Cadastro público desligado** no painel; usuários criados em *Authentication > Users*; o proprietário promovido pela tabela `perfis`.
- **Chaves novas do Supabase** (*publishable* e *secret*) no lugar das antigas (*anon* e *service_role*); o código funciona com as duas.
- **Lição**: o comando `supabase projects api-keys` devolve a chave secreta **mascarada**; é preciso `--reveal`. A chave mascarada na Vercel fez o cron e o botão "Reenviar" falharem com 500 até a troca.
- **Dados de demonstração** carregados em produção com `supabase/seed-demo.sql`.

## Fase 8: histórico de vendas e cancelamento

- **`cancelar_venda(venda_id, motivo)`** (só proprietário): trava a venda (`for update`), recusa venda inexistente ou já cancelada, grava quem, quando e por quê, e devolve cada item ao estoque pela mesma `aplicar_movimentacao` (movimentação `cancelamento_venda`). Uma transação só. O trigger de alertas resolve o alerta aberto se o estoque voltar acima do mínimo (decisão D).
- **Travas sempre na mesma ordem** (venda, depois produtos por id), igual a `registrar_venda`: sem deadlock entre venda e cancelamento. Dois cancelamentos simultâneos: o segundo espera e recusa.
- **Qualquer venda pode ser cancelada**, sem prazo (a especificação não define limite). A venda cancelada continua no histórico, riscada, e sai de todos os indicadores.
- **Histórico** com filtros na URL (período no fuso de São Paulo, forma, situação), 50 por página; linha inteira clicável para o detalhe. Código curto da venda = 8 primeiros caracteres do id.
- **O diálogo de cancelamento é a confirmação**: diz o que vai acontecer e exige motivo. Cada abertura começa limpa; um erro do banco (ex.: já cancelada em outra aba) recarrega a página.

### Code review por agente separado

- Antes do commit, um segundo agente (sem o contexto de quem escreveu) revisou o diff da fase. Não achou bug grave em concorrência, estorno ou segurança. Achados aplicados: teste de indicadores mais completo e sem depender do relógio do Node, diálogo que recarregava errado depois de erro, revalidação de `/configuracoes` e testes de anônimo e de produto desativado. Aceito como está: link de linha inteira (`position: relative` em `<tr>`), que funciona nos navegadores atuais.
- **Achado derivado**: `alter default privileges ... in schema public revoke execute ... from public` **não** retira o EXECUTE padrão de PUBLIC (o default por schema só acrescenta). Todas as funções criadas depois da Fase 2 estavam executáveis pelo anônimo; não era explorável (cada função recusa o anônimo no início), mas feria o privilégio mínimo. Corrigido em `20261105000200_execute_sem_public.sql` (default global + revoke de PUBLIC e anon) e coberto por testes que exigem a mensagem `permission denied for function`.

### Revisão geral do projeto (agente separado, depois da Fase 8)

Sem achados graves; banco, RLS, privilégios, idempotência e fila de alertas confirmados. Achados aplicados:
- **Caixa sem internet** (o mais importante): uma falha de rede ao finalizar derrubava a tela, perdia carrinho e chave, e o operador refazia a venda com chave nova, **duplicando** a venda. Agora a falha mostra uma mensagem, mantém carrinho e chave, e o novo F2 devolve a venda já gravada. Provado num navegador com a conexão desligada e religada (uma venda só no banco). Também há uma tela de erro amigável (`(app)/error.tsx`) no lugar da tela técnica do Next.
- **Carrinho alterado depois de a venda já ter sido gravada**: aviso forte quando o banco responde "já registrada" com total diferente do da tela (fecha a pendência da Fase 4).
- **Listas com mais de 1.000 produtos**: o Supabase devolve no máximo 1.000 linhas por chamada; caixa, seletores e contagem por categoria agora buscam em páginas (`buscarTodas`).
- **Resend**: pausa de 600 ms entre e-mails (limite de cerca de 2 envios por segundo).
- **Aceito como limitação conhecida**: se o Resend entregar e a resposta se perder por timeout, a próxima tentativa usa outra chave de idempotência e pode mandar um segundo e-mail (raro).

## Modo escuro (pedido do usuário)

- **Seletor ☀ Claro / ☾ Escuro no rodapé da sidebar** (com a sidebar recolhida, um botão que alterna). Começa no claro e lembra a escolha no navegador (`next-themes`, chave `iracema-tema`); sem "piscar" o tema errado ao abrir.
- **Cores da marca iguais nos dois temas** (selo branco com IRACEMA vermelho, fundo verde do login). Cores de **texto** viraram tokens que mudam no escuro: `titulo` (verde-folha → verde-claro), `preco` (vermelho Iracema → vermelho claro) e `sobre-broto` (texto em cima dos selos verdes).
- **Paleta escura**: base verde-folha muito escura (`#0e1611`, cartões `#16201a`); todas as combinações de texto conferidas em AA, e a cor dos gráficos (`#46a35a`) validada para o fundo escuro.

## Preparação para portfólio (depois da Fase 8)

- **Demo pública**: usuários próprios da demonstração (`dono@demo-iracema.test`, `caixa@demo-iracema.test`) com senha **publicada no README**, criados por `scripts/criar-usuarios-demo.mts`; `npm run demo:redefinir-producao` apaga e recria os dados. Nunca usar esses usuários num banco com dados reais.
- **README com capturas** tiradas do site em produção (`docs/imagens/`).
- **CI no GitHub Actions**: sobe um Supabase do zero, aplica as migrations, confere que os tipos do banco batem com elas, roda lint, tipos, testes, build e os testes de ponta a ponta. O primeiro run pegou um "na minha máquina funciona": os tipos das rotas do Next não existiam num clone limpo; o `typecheck` agora os gera antes.
- **Testes de ponta a ponta com Playwright** (dependência nova, só de desenvolvimento): o Vitest não abre navegador, e só um navegador prova o comportamento das telas. Usa o Chrome instalado (sem baixar navegadores) e roda contra o **build de produção**, não o `next dev`, que compila cada tela no primeiro acesso e deixava os testes instáveis. Cobrem: venda pelo código de barras, caixa sem internet (sem perder nem duplicar), produto sem estoque, funcionário barrado nas telas do proprietário e cancelamento com estorno.
- **Bug achado pelo teste de ponta a ponta**: o aviso "Venda cancelada" nunca aparecia. A página atualizada (já cancelada) removia o diálogo antes do efeito que mostrava o aviso; agora o aviso sai direto na resposta da ação.
- **Uso do nome e da marca**: a proprietária da Mini Mercado e Fruteira Iracema autorizou o uso do nome da loja neste projeto de portfólio. Os dados da demo são fictícios.
- **Repositório renomeado** para `fruteira-iracema` (o nome anterior tinha acento quebrado).
