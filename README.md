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
