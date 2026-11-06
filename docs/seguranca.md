# Segurança

Este documento diz **o que está protegido, como, onde verificar e o que ainda é risco**. A intenção é ser honesto: nenhum sistema é "100% seguro".

## Modelo de ameaça (contra quem nos protegemos)

| Ameaça | Proteção |
|---|---|
| Visitante sem conta lendo ou alterando dados | RLS em todas as tabelas; `anon` não executa nenhuma função; `proxy.ts` manda para o login |
| Funcionário tentando ver custo/lucro ou alterar produto | Políticas RLS por papel; funcionário lê só a view `produtos_catalogo` (sem custo); funções do painel checam o papel |
| Usuário tentando alterar estoque "na mão" | Update na coluna `quantidade` negado; só as funções do banco alteram, e sempre registram a movimentação |
| Navegador adulterado mandando preço falso | Preço e custo são lidos **do banco**, nunca do cliente |
| Venda duplicada (duplo clique, rede instável) | Chave de idempotência única na venda |
| Duas vendas disputando a última unidade | `select ... for update` em ordem de id; estoque nunca fica negativo |
| Chamar a rota do cron sem permissão | Exige `Authorization: Bearer ${CRON_SECRET}` |
| Vazamento de segredos | Chaves só no servidor (sem `NEXT_PUBLIC_`), módulos `server-only`, `.env*` no `.gitignore` |
| Entrada maliciosa (injeção) | Zod no servidor; consultas parametrizadas pelo Supabase (sem SQL montado por texto) |
| Clickjacking e sniffing de tipo | Cabeçalhos `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`; HSTS pela Vercel |
| Dependências com falhas conhecidas | `npm audit --omit=dev` (o que roda em produção): **0 vulnerabilidades** |

## Camadas (defesa em profundidade)

1. **Proxy** (`src/proxy.ts`): sem login, sem acesso.
2. **Servidor de cada tela/ação** (`lib/services/sessao.ts`): confere o papel.
3. **Banco (RLS + funções)**: a barreira final. Se as camadas 1 e 2 falhassem, o banco ainda recusa.

Funções `security definer` validam o papel logo no início e usam `search_path` fixo (evita sequestro de funções). Permissões padrão do Supabase foram retiradas e liberadas tabela por tabela; funções novas nascem **sem** `execute` para `public`/`anon` (migration `20261105000200`).

## Como isso é verificado (testes)

- `tests/db/permissoes.test.ts`: anônimo não lê nada; funcionário não lê custo, não altera produto, não cancela venda; funções nascem fechadas.
- `tests/db/vendas`, `estoque`, `cancelamento`, `alertas`: integridade, idempotência, concorrência.
- `e2e/`: o funcionário é barrado nas telas do proprietário **no navegador**.
- O CI roda tudo a cada push.

## Riscos conhecidos e decisões conscientes

| Item | Situação |
|---|---|
| **Senhas da demo são públicas** (README) | Intencional: a demo precisa ser testável. Os dados são fictícios e o usuário `dono@demo-iracema.test` não deve existir em banco com dados reais. `npm run demo:redefinir-producao` restaura tudo |
| **Sem limite de tentativas próprio no login** | Dependemos da proteção do Supabase Auth (limites por IP/e-mail). Para uso real, avaliar CAPTCHA/limites adicionais |
| **Sem Content-Security-Policy** | Uma CSP exige mapear os scripts do Next/Vercel; fica como melhoria para uso real |
| **Plano gratuito do Supabase** | Pausa o projeto após 7 dias sem uso e não tem backup diário. Antes de dados reais: plano pago + backups |
| **Sem autenticação de dois fatores** | O Supabase Auth suporta; recomendado ligar para o proprietário em uso real |
| **Duplicidade rara de e-mail** | Se o Resend entregar e a resposta se perder, o reenvio pode mandar um 2º e-mail. Aceito |
| **Avisos só em ferramentas de desenvolvimento** | A CLI do `shadcn` (usada só para gerar componentes) aparece no `npm audit` completo; não vai para produção |

## Antes de usar com dados reais (checklist)

- [ ] Gerar **novas** chaves do Resend e do Supabase (service role) e um novo `CRON_SECRET`; nunca reutilizar as de teste
- [ ] Banco **separado** da demo, com usuários reais e senhas fortes
- [ ] Remover/desativar os usuários `@demo-iracema.test` desse banco
- [ ] Plano pago do Supabase (backups) e 2FA do proprietário
- [ ] Verificar um domínio próprio no Resend (remetente profissional, entrega a qualquer destinatário)
- [ ] Ligar 2FA nas contas da Vercel, Supabase, Resend e GitHub

## Como reportar uma falha

Abra uma *issue* privada no repositório ou fale diretamente com o mantenedor. Não publique detalhes de uma falha antes de ela ser corrigida.
