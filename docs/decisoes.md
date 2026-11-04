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
- **Proxy (antigo middleware)**: no Next 16 o arquivo se chama `src/proxy.ts`. O helper de sessão já existe (`src/lib/supabase/middleware.ts`), mas o proxy só é ligado na Fase 2, junto com o login.
