-- =============================================================================
-- Esquema principal: enums, tabelas, restrições e índices.
-- Estabelecimento único: não há tabela de estabelecimentos nem establishment_id.
-- Segurança (RLS, permissões) fica na migration seguinte.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.papel_usuario as enum ('proprietario', 'funcionario');

create type public.tipo_movimentacao as enum (
  'entrada',
  'saida_manual',
  'venda',
  'cancelamento_venda',
  'ajuste'
);

create type public.forma_pagamento as enum ('dinheiro', 'pix', 'debito', 'credito');

create type public.status_venda as enum ('concluida', 'cancelada');

create type public.status_alerta as enum ('pendente', 'enviado', 'falhou');

-- -----------------------------------------------------------------------------
-- perfis: papel e situação de cada usuário do Auth
-- -----------------------------------------------------------------------------
create table public.perfis (
  id    uuid primary key references auth.users (id) on delete cascade,
  nome  text not null,
  papel public.papel_usuario not null default 'funcionario',
  ativo boolean not null default true
);

comment on table public.perfis is
  'Um perfil por usuário do Auth. O papel é definido pelo painel do Supabase.';

-- -----------------------------------------------------------------------------
-- categorias
-- -----------------------------------------------------------------------------
create table public.categorias (
  id    uuid primary key default gen_random_uuid(),
  nome  text not null unique check (length(btrim(nome)) > 0),
  ativo boolean not null default true
);

-- -----------------------------------------------------------------------------
-- produtos
-- -----------------------------------------------------------------------------
create table public.produtos (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null check (length(btrim(nome)) > 0),
  descricao      text,
  categoria_id   uuid references public.categorias (id),
  -- Vazio vira null na aplicação; o índice único parcial só vale quando preenchido.
  codigo_barras  text check (codigo_barras is null or length(btrim(codigo_barras)) > 0),
  unidade        text not null default 'un' check (unidade in ('un', 'kg', 'L', 'cx')),
  preco_custo    numeric(10, 2) not null default 0 check (preco_custo >= 0),
  preco_venda    numeric(10, 2) not null check (preco_venda > 0),
  quantidade     integer not null default 0 check (quantidade >= 0),
  estoque_minimo integer not null default 10 check (estoque_minimo >= 0),
  ativo          boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create unique index produtos_codigo_barras_unico
  on public.produtos (codigo_barras)
  where codigo_barras is not null;

create index produtos_nome_idx on public.produtos (nome);
create index produtos_categoria_idx on public.produtos (categoria_id);

-- Mantém updated_at sempre correto, sem depender da aplicação.
create function public.atualizar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger produtos_updated_at
  before update on public.produtos
  for each row execute function public.atualizar_updated_at();

-- -----------------------------------------------------------------------------
-- vendas
-- -----------------------------------------------------------------------------
create table public.vendas (
  id                  uuid primary key default gen_random_uuid(),
  -- Gerada no navegador ao iniciar a venda: impede duplicar por duplo clique.
  chave_idempotencia  uuid not null unique,
  forma_pagamento     public.forma_pagamento not null,
  total               numeric(10, 2) not null check (total >= 0),
  custo_total         numeric(10, 2) not null check (custo_total >= 0),
  status              public.status_venda not null default 'concluida',
  operador_id         uuid not null references auth.users (id),
  cancelada_por       uuid references auth.users (id),
  cancelada_em        timestamptz,
  motivo_cancelamento text,
  created_at          timestamptz not null default now(),
  -- Venda cancelada precisa registrar quem, quando e por quê.
  constraint vendas_cancelamento_completo check (
    status = 'concluida'
    or (
      cancelada_por is not null
      and cancelada_em is not null
      and length(btrim(coalesce(motivo_cancelamento, ''))) > 0
    )
  )
);

create index vendas_created_at_idx on public.vendas (created_at);
create index vendas_status_idx on public.vendas (status);

-- -----------------------------------------------------------------------------
-- itens_venda: preço e custo são cópias do produto no momento da venda
-- -----------------------------------------------------------------------------
create table public.itens_venda (
  id             uuid primary key default gen_random_uuid(),
  venda_id       uuid not null references public.vendas (id) on delete cascade,
  produto_id     uuid not null references public.produtos (id),
  quantidade     integer not null check (quantidade > 0),
  preco_unitario numeric(10, 2) not null check (preco_unitario >= 0),
  custo_unitario numeric(10, 2) not null check (custo_unitario >= 0),
  subtotal       numeric(10, 2) not null,
  constraint itens_venda_subtotal_correto check (subtotal = quantidade * preco_unitario)
);

create index itens_venda_venda_idx on public.itens_venda (venda_id);
create index itens_venda_produto_idx on public.itens_venda (produto_id);

-- -----------------------------------------------------------------------------
-- movimentacoes_estoque: toda alteração de estoque passa por aqui
-- -----------------------------------------------------------------------------
create table public.movimentacoes_estoque (
  id                   uuid primary key default gen_random_uuid(),
  produto_id           uuid not null references public.produtos (id),
  tipo                 public.tipo_movimentacao not null,
  -- Positiva; o tipo indica o sentido. Em 'ajuste', registra o novo total.
  quantidade           integer not null,
  quantidade_anterior  integer not null check (quantidade_anterior >= 0),
  quantidade_posterior integer not null check (quantidade_posterior >= 0),
  usuario_id           uuid not null references auth.users (id),
  venda_id             uuid references public.vendas (id),
  motivo               text,
  created_at           timestamptz not null default now(),
  constraint movimentacoes_quantidade_valida check (
    (tipo = 'ajuste' and quantidade >= 0) or (tipo <> 'ajuste' and quantidade > 0)
  ),
  constraint movimentacoes_motivo_obrigatorio check (
    tipo not in ('saida_manual', 'ajuste')
    or length(btrim(coalesce(motivo, ''))) > 0
  ),
  constraint movimentacoes_venda_obrigatoria check (
    tipo not in ('venda', 'cancelamento_venda') or venda_id is not null
  )
);

create index movimentacoes_produto_data_idx
  on public.movimentacoes_estoque (produto_id, created_at);
create index movimentacoes_venda_idx on public.movimentacoes_estoque (venda_id);

-- -----------------------------------------------------------------------------
-- alertas_estoque
-- -----------------------------------------------------------------------------
create table public.alertas_estoque (
  id                       uuid primary key default gen_random_uuid(),
  produto_id               uuid not null references public.produtos (id),
  quantidade_no_alerta     integer not null,
  estoque_minimo_no_alerta integer not null,
  status                   public.status_alerta not null default 'pendente',
  tentativas               integer not null default 0 check (tentativas >= 0),
  ultimo_erro              text,
  enviado_em               timestamptz,
  -- Preenchido quando o estoque volta acima do mínimo (permite um novo ciclo).
  resolvido_em             timestamptz,
  created_at               timestamptz not null default now()
);

-- No máximo um alerta aberto por produto.
create unique index alertas_um_aberto_por_produto
  on public.alertas_estoque (produto_id)
  where resolvido_em is null;

create index alertas_status_idx on public.alertas_estoque (status);

-- -----------------------------------------------------------------------------
-- configuracoes: linha única
-- -----------------------------------------------------------------------------
create table public.configuracoes (
  id             smallint primary key default 1 check (id = 1),
  alertas_ativos boolean not null default true,
  email_alerta   text check (
    email_alerta is null or email_alerta ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  )
);

insert into public.configuracoes (id) values (1);
