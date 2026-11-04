# Estoque Mercadinho

Sistema de caixa, controle de estoque e painel financeiro para um mercadinho de bairro em Caxias do Sul.

> Em construção. O README completo (problema, solução, como rodar e publicar) será escrito na Fase 7.

## Rodando localmente

Pré-requisitos: Node.js 24 ou mais recente e npm.

```bash
npm install
cp .env.example .env.local   # preencha os valores
npm run dev                  # http://localhost:3000
```

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm test` | Testes (Vitest) |
| `npm run lint` | ESLint |
| `npm run typecheck` | Checagem de tipos do TypeScript |

## Documentação

- [`CLAUDE.md`](CLAUDE.md): especificação do produto e regras do projeto
- [`docs/decisoes.md`](docs/decisoes.md): decisões aprovadas durante o desenvolvimento
