-- =============================================================================
-- Segurança: privilégios, funções auxiliares, RLS e a view sem custo.
--
-- Estratégia de "privilégio mínimo":
-- 1. Retira TODAS as permissões que o Supabase concede por padrão a anon e
--    authenticated no schema public (tabelas e funções).
-- 2. Concede de volta só o necessário, tabela por tabela.
-- 3. RLS em todas as tabelas filtra QUAIS linhas cada usuário enxerga.
-- Assim, uma tabela ou função nova nasce fechada até ser liberada de propósito.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Fecha tudo
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. Funções auxiliares usadas nas políticas
--    security definer: leem perfis sem passar pelo RLS (evita recursão).
--    search_path vazio: impede que um objeto com o mesmo nome em outro schema
--    seja usado no lugar do verdadeiro.
-- -----------------------------------------------------------------------------
create function public.eh_usuario_ativo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfis
    where id = (select auth.uid())
      and ativo
  );
$$;

create function public.eh_proprietario()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfis
    where id = (select auth.uid())
      and ativo
      and papel = 'proprietario'
  );
$$;

grant execute on function public.eh_usuario_ativo() to authenticated;
grant execute on function public.eh_proprietario() to authenticated;

-- -----------------------------------------------------------------------------
-- 3. RLS ligado em todas as tabelas
-- -----------------------------------------------------------------------------
alter table public.perfis                enable row level security;
alter table public.categorias            enable row level security;
alter table public.produtos              enable row level security;
alter table public.vendas                enable row level security;
alter table public.itens_venda           enable row level security;
alter table public.movimentacoes_estoque enable row level security;
alter table public.alertas_estoque       enable row level security;
alter table public.configuracoes         enable row level security;

-- -----------------------------------------------------------------------------
-- perfis: cada um lê o próprio; o proprietário lê todos.
-- Ninguém altera pela API (papel e situação mudam só pelo painel do Supabase),
-- então um funcionário não consegue se promover.
-- -----------------------------------------------------------------------------
grant select on public.perfis to authenticated;

create policy perfis_select on public.perfis
  for select to authenticated
  using (
    (id = (select auth.uid()) and ativo)
    or (select public.eh_proprietario())
  );

-- -----------------------------------------------------------------------------
-- categorias: todos os usuários ativos leem; só o proprietário cria e edita.
-- Sem delete: categorias são desativadas.
-- -----------------------------------------------------------------------------
grant select on public.categorias to authenticated;
grant insert (nome, ativo), update (nome, ativo) on public.categorias to authenticated;

create policy categorias_select on public.categorias
  for select to authenticated
  using ((select public.eh_usuario_ativo()));

create policy categorias_insert on public.categorias
  for insert to authenticated
  with check ((select public.eh_proprietario()));

create policy categorias_update on public.categorias
  for update to authenticated
  using ((select public.eh_proprietario()))
  with check ((select public.eh_proprietario()));

-- -----------------------------------------------------------------------------
-- produtos: a tabela (com preço de custo) só é lida pelo proprietário.
-- Funcionários usam a view produtos_catalogo, sem colunas de custo.
--
-- A coluna "quantidade" NÃO está na lista de colunas liberadas para insert e
-- update: o estoque só muda pelas funções do banco, que registram a
-- movimentação. Sem delete: produtos são desativados.
-- -----------------------------------------------------------------------------
grant select on public.produtos to authenticated;
grant insert (
  nome, descricao, categoria_id, codigo_barras, unidade,
  preco_custo, preco_venda, estoque_minimo, ativo
) on public.produtos to authenticated;
grant update (
  nome, descricao, categoria_id, codigo_barras, unidade,
  preco_custo, preco_venda, estoque_minimo, ativo
) on public.produtos to authenticated;

create policy produtos_select on public.produtos
  for select to authenticated
  using ((select public.eh_proprietario()));

create policy produtos_insert on public.produtos
  for insert to authenticated
  with check ((select public.eh_proprietario()));

create policy produtos_update on public.produtos
  for update to authenticated
  using ((select public.eh_proprietario()))
  with check ((select public.eh_proprietario()));

-- -----------------------------------------------------------------------------
-- produtos_catalogo: visão dos produtos SEM custo, para todos os usuários ativos.
--
-- Esta view roda com os direitos do dono (security_invoker = false), por isso
-- consegue ler produtos mesmo para o funcionário. O filtro eh_usuario_ativo()
-- é o que a protege: anônimos e usuários desativados recebem zero linhas.
-- O linter do Supabase avisa "security definer view": é intencional.
-- -----------------------------------------------------------------------------
create view public.produtos_catalogo
with (security_invoker = false, security_barrier = true)
as
select
  p.id,
  p.nome,
  p.descricao,
  p.categoria_id,
  c.nome as categoria_nome,
  p.codigo_barras,
  p.unidade,
  p.preco_venda,
  p.quantidade,
  p.estoque_minimo,
  p.ativo
from public.produtos p
left join public.categorias c on c.id = p.categoria_id
where public.eh_usuario_ativo();

comment on view public.produtos_catalogo is
  'Produtos sem preço de custo. Única forma de o funcionário ler produtos.';

grant select on public.produtos_catalogo to authenticated;

-- -----------------------------------------------------------------------------
-- Tabelas escritas só por funções do banco (security definer).
-- O proprietário pode ler; ninguém insere, altera ou apaga diretamente.
-- O funcionário não lê vendas, itens nem movimentações: elas contêm custo.
-- -----------------------------------------------------------------------------
grant select on public.vendas                to authenticated;
grant select on public.itens_venda           to authenticated;
grant select on public.movimentacoes_estoque to authenticated;
grant select on public.alertas_estoque       to authenticated;

create policy vendas_select on public.vendas
  for select to authenticated
  using ((select public.eh_proprietario()));

create policy itens_venda_select on public.itens_venda
  for select to authenticated
  using ((select public.eh_proprietario()));

create policy movimentacoes_select on public.movimentacoes_estoque
  for select to authenticated
  using ((select public.eh_proprietario()));

create policy alertas_select on public.alertas_estoque
  for select to authenticated
  using ((select public.eh_proprietario()));

-- -----------------------------------------------------------------------------
-- configuracoes: só o proprietário lê e altera (a linha única já existe).
-- -----------------------------------------------------------------------------
grant select on public.configuracoes to authenticated;
grant update (alertas_ativos, email_alerta) on public.configuracoes to authenticated;

create policy configuracoes_select on public.configuracoes
  for select to authenticated
  using ((select public.eh_proprietario()));

create policy configuracoes_update on public.configuracoes
  for update to authenticated
  using ((select public.eh_proprietario()))
  with check ((select public.eh_proprietario()));
