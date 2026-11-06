# Arquitetura

Visão geral de como o sistema é montado. Para o *porquê* de cada escolha, veja [decisoes.md](decisoes.md).

## Visão em uma figura

```
 Navegador (caixa, painel, produtos...)
        │  HTTPS
        ▼
 Vercel ── Next.js 16 (App Router)
        │   • proxy.ts ........ exige login em todas as telas
        │   • Server Components + Server Actions (src/app)
        │   • regras do lado do Next (src/lib/services)
        │   • /api/cron/alertas  ◄── Vercel Cron (1x/dia, com CRON_SECRET)
        │
        ├──► Supabase (Postgres + Auth)
        │      • tabelas, RLS, funções SQL (supabase/migrations)
        │      • as regras que mexem em dinheiro e estoque moram AQUI
        │
        └──► Resend (envio de e-mail dos alertas)
```

**Regra de ouro:** o que não pode dar errado (baixar estoque, registrar venda, cancelar) é feito por **funções do banco, numa única transação**. O Next.js só chama essas funções e mostra o resultado. Assim, mesmo que alguém burle a interface, o banco não deixa.

## Pastas

| Pasta | O que tem |
|---|---|
| `src/app/` | Telas e rotas: `login`, `(app)/caixa`, `produtos`, `estoque`, `vendas`, `painel`, `configuracoes`, `api/cron` |
| `src/components/` | Componentes visuais reutilizáveis (`ui/` vem do shadcn/ui) |
| `src/lib/services/` | Regras de negócio do lado do Next: vendas, estoque, alertas, indicadores |
| `src/lib/validations/` | Schemas Zod (validação de toda entrada, no servidor) |
| `src/lib/integrations/` | Resend (e-mail) |
| `src/lib/supabase/` | Clientes do Supabase (servidor, navegador, admin) |
| `supabase/migrations/` | Todo o SQL versionado: é a "planta" do banco |
| `tests/` | Testes Vitest (`tests/db/` roda contra o Supabase local) |
| `e2e/` | Testes de ponta a ponta no navegador (Playwright) |
| `scripts/` | Utilitários (criar usuários da demo) |

## Fluxo de uma venda

1. O operador lê o código de barras; a tela monta o carrinho e gera uma **chave de idempotência** (UUID).
2. Ao finalizar (F2), a Server Action valida os dados com Zod e chama a função `registrar_venda`.
3. No banco, numa só transação: trava os produtos (`for update`, em ordem de id), confere estoque, lê **preço e custo do banco**, grava venda, itens e movimentações, baixa o estoque e cria o alerta se cruzou o mínimo.
4. Se a chave já existe (duplo clique, internet que caiu e voltou), devolve a venda original sem duplicar.
5. **Depois** de responder ao caixa, o servidor tenta enviar os e-mails de alerta (`after()`). Falha no e-mail nunca desfaz a venda.

## Fluxo de um alerta de estoque

```
venda deixa quantidade <= mínimo
  └─► trigger cria alerta 'pendente' (no máximo 1 aberto por produto)
        └─► envio pelo Resend ──► 'enviado'
              └─ falhou? ──► 'falhou' (+ erro) ──► cron reenvia (até 5 tentativas)
estoque reposto acima do mínimo ──► alerta fechado (novo ciclo possível)
```

A fila usa `for update skip locked`, então dois processos nunca pegam o mesmo alerta; e uma chave de idempotência no Resend evita e-mail duplicado em nova tentativa.

## Modelo de dados

```
auth.users 1──1 perfis (nome, papel, ativo)
categorias 1──* produtos (preço custo/venda, quantidade, mínimo)
produtos   1──* movimentacoes_estoque (toda alteração de estoque)
produtos   1──* itens_venda *──1 vendas (total, custo, status, forma de pagamento)
produtos   1──* alertas_estoque (pendente | enviado | falhou)
configuracoes (linha única: alertas ativos, e-mail de destino)
```

Decisões do modelo:
- **Um único mercadinho**: não há tabela de estabelecimentos.
- **Dinheiro em `numeric(10,2)`** no banco e em **centavos** no TypeScript (nunca ponto flutuante).
- `itens_venda` guarda **cópia** do preço e custo do momento da venda; mudar o preço depois não altera o histórico.
- Todo dia/mês é calculado no fuso `America/Sao_Paulo`.

## Funções do banco (a "API" de verdade)

| Função | Quem pode | O que faz |
|---|---|---|
| `registrar_venda` | proprietário e funcionário | Venda atômica e idempotente |
| `cancelar_venda` | proprietário | Cancela e devolve o estoque |
| `registrar_entrada` / `registrar_saida_manual` / `registrar_ajuste` | proprietário | Movimentações manuais |
| `cadastrar_produto` | proprietário | Cria produto (com estoque inicial registrado) |
| `resumo_vendas`, `faturamento_por_dia`, `faturamento_por_mes`, `top_produtos`, `vendas_por_forma` | proprietário | Indicadores do painel calculados no banco |
| `reservar_alertas_para_envio` | só `service_role` (cron) | Reserva alertas para envio sem concorrência |

## Rotas

| Rota | Acesso |
|---|---|
| `/login` | pública |
| `/caixa`, `/produtos` | proprietário e funcionário |
| `/painel`, `/estoque`, `/vendas`, `/configuracoes` | só proprietário |
| `/api/cron/alertas` | só com `Authorization: Bearer ${CRON_SECRET}` |
