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
