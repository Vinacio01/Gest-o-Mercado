-- =============================================================================
-- Fase 3: produtos e estoque.
--
-- - Coluna calculada "estoque_baixo" (filtro da lista de produtos).
-- - Regra de alertas num trigger de produtos: vale para venda, entrada, saída,
--   ajuste, cancelamento, cadastro e mudança do estoque mínimo, sem repetir
--   código em cada função.
-- - Funções de movimentação (só proprietário), sempre registrando a
--   movimentação na mesma transação.
-- - Cadastro de produto por função, com estoque inicial opcional.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Colunas geradas pelo banco.
--    estoque_baixo: o PostgREST não compara duas colunas num filtro, então a
--    comparação fica numa coluna gerada pelo próprio banco.
--    Mesmo critério do alerta: quantidade <= estoque mínimo (inclui zero).
-- -----------------------------------------------------------------------------
alter table public.produtos
  add column estoque_baixo boolean
  generated always as (quantidade <= estoque_minimo) stored;

-- Busca sem diferenciar acentos nem maiúsculas: "feijao" encontra "Feijão".
-- A coluna gerada exige uma função "immutable"; unaccent não é declarada assim
-- porque depende do dicionário, então a envolvemos fixando o dicionário.
create extension if not exists unaccent with schema extensions;

create function public.texto_busca(texto text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(texto, '')));
$$;

alter table public.produtos
  add column busca text
  generated always as (public.texto_busca(nome || ' ' || coalesce(codigo_barras, ''))) stored;
-- Sem índice: com alguns milhares de produtos a busca "contém" é instantânea.

-- Função pura (só transforma texto): liberada para recalcular a coluna quando
-- o proprietário edita o nome ou o código de barras.
grant execute on function public.texto_busca(text) to authenticated;

-- A view sem custo ganha a mesma coluna (acrescentada no fim, como o
-- "create or replace view" exige). As permissões da view são mantidas.
create or replace view public.produtos_catalogo
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
  p.ativo,
  p.estoque_baixo,
  p.busca
from public.produtos p
left join public.categorias c on c.id = p.categoria_id
where public.eh_usuario_ativo();

-- "Bebidas" e "bebidas" seriam categorias repetidas.
create unique index categorias_nome_unico_sem_caixa
  on public.categorias (lower(btrim(nome)));

-- -----------------------------------------------------------------------------
-- 2. Alertas: avaliados sempre que quantidade, estoque mínimo ou situação mudam.
--    - quantidade <= mínimo e produto ativo: abre um alerta 'pendente', se ainda
--      não houver um aberto (o índice único parcial garante isso até com duas
--      vendas simultâneas).
--    - quantidade > mínimo: resolve o alerta aberto, permitindo um novo ciclo.
--    Produto desativado não abre alerta novo.
-- -----------------------------------------------------------------------------
create function public.avaliar_alerta_estoque()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.quantidade > new.estoque_minimo then
    update public.alertas_estoque
       set resolvido_em = now()
     where produto_id = new.id
       and resolvido_em is null;
  elsif new.ativo then
    insert into public.alertas_estoque (
      produto_id, quantidade_no_alerta, estoque_minimo_no_alerta
    )
    values (new.id, new.quantidade, new.estoque_minimo)
    on conflict (produto_id) where resolvido_em is null do nothing;
  end if;

  return null;
end;
$$;

create trigger produtos_alerta_ao_criar
  after insert on public.produtos
  for each row execute function public.avaliar_alerta_estoque();

create trigger produtos_alerta_ao_alterar
  after update of quantidade, estoque_minimo, ativo on public.produtos
  for each row
  when (
    old.quantidade is distinct from new.quantidade
    or old.estoque_minimo is distinct from new.estoque_minimo
    or old.ativo is distinct from new.ativo
  )
  execute function public.avaliar_alerta_estoque();

-- -----------------------------------------------------------------------------
-- 3. Funções internas (ninguém chama pela API)
-- -----------------------------------------------------------------------------

-- Interrompe a operação se quem chama não for o proprietário ativo.
create function public.exigir_proprietario()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.eh_proprietario() then
    raise exception 'Apenas o proprietário pode fazer esta operação.'
      using errcode = '42501';
  end if;
end;
$$;

-- Aplica uma movimentação a um produto e registra o histórico.
-- p_quantidade é sempre positiva; o tipo diz o sentido. Em 'ajuste', é o novo
-- total. Trava a linha do produto (for update) para que duas operações
-- simultâneas não leiam o mesmo saldo. Usada também por venda e cancelamento.
-- Erros de regra usam o código P0001: a aplicação mostra a mensagem ao usuário.
create function public.aplicar_movimentacao(
  p_produto_id uuid,
  p_tipo public.tipo_movimentacao,
  p_quantidade integer,
  p_motivo text default null,
  p_venda_id uuid default null
)
returns public.movimentacoes_estoque
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_produto public.produtos;
  v_nova    integer;
  v_mov     public.movimentacoes_estoque;
begin
  select * into v_produto
    from public.produtos
   where id = p_produto_id
     for update;

  if not found then
    raise exception 'Produto não encontrado.' using errcode = 'P0001';
  end if;

  v_nova := case p_tipo
    when 'entrada'            then v_produto.quantidade + p_quantidade
    when 'cancelamento_venda' then v_produto.quantidade + p_quantidade
    when 'saida_manual'       then v_produto.quantidade - p_quantidade
    when 'venda'              then v_produto.quantidade - p_quantidade
    when 'ajuste'             then p_quantidade
  end;

  if v_nova < 0 then
    raise exception 'Estoque insuficiente de %: há % % em estoque.',
      v_produto.nome, v_produto.quantidade, v_produto.unidade
      using errcode = 'P0001';
  end if;

  update public.produtos
     set quantidade = v_nova
   where id = p_produto_id;

  insert into public.movimentacoes_estoque (
    produto_id, tipo, quantidade, quantidade_anterior, quantidade_posterior,
    usuario_id, venda_id, motivo
  )
  values (
    p_produto_id, p_tipo, p_quantidade, v_produto.quantidade, v_nova,
    auth.uid(), p_venda_id, p_motivo
  )
  returning * into v_mov;

  return v_mov;
end;
$$;

-- Funções internas: sem execute para ninguém além do dono (postgres).
revoke execute on function public.exigir_proprietario() from public, anon, authenticated;
revoke execute on function public.aplicar_movimentacao(uuid, public.tipo_movimentacao, integer, text, uuid)
  from public, anon, authenticated;
revoke execute on function public.avaliar_alerta_estoque() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. Movimentações manuais (só proprietário). Retornam o id da movimentação.
-- -----------------------------------------------------------------------------
create function public.registrar_entrada(
  p_produto_id uuid,
  p_quantidade integer,
  p_motivo text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.exigir_proprietario();

  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'A quantidade precisa ser maior que zero.' using errcode = 'P0001';
  end if;

  return (public.aplicar_movimentacao(
    p_produto_id, 'entrada', p_quantidade, nullif(btrim(p_motivo), '')
  )).id;
end;
$$;

create function public.registrar_saida_manual(
  p_produto_id uuid,
  p_quantidade integer,
  p_motivo text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.exigir_proprietario();

  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'A quantidade precisa ser maior que zero.' using errcode = 'P0001';
  end if;
  if nullif(btrim(p_motivo), '') is null then
    raise exception 'Informe o motivo da saída.' using errcode = 'P0001';
  end if;

  return (public.aplicar_movimentacao(
    p_produto_id, 'saida_manual', p_quantidade, btrim(p_motivo)
  )).id;
end;
$$;

create function public.registrar_ajuste(
  p_produto_id uuid,
  p_nova_quantidade integer,
  p_motivo text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_atual integer;
begin
  perform public.exigir_proprietario();

  if p_nova_quantidade is null or p_nova_quantidade < 0 then
    raise exception 'A nova quantidade não pode ser negativa.' using errcode = 'P0001';
  end if;
  if nullif(btrim(p_motivo), '') is null then
    raise exception 'Informe o motivo do ajuste.' using errcode = 'P0001';
  end if;

  -- Leitura só para a mensagem; a trava acontece em aplicar_movimentacao.
  select quantidade into v_atual from public.produtos where id = p_produto_id;
  if v_atual = p_nova_quantidade then
    raise exception 'O estoque já está com % unidades. Nada a ajustar.', v_atual
      using errcode = 'P0001';
  end if;

  return (public.aplicar_movimentacao(
    p_produto_id, 'ajuste', p_nova_quantidade, btrim(p_motivo)
  )).id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. Cadastro de produto com estoque inicial opcional.
--    O produto nasce já com a quantidade inicial e a movimentação 'entrada'
--    ("Estoque inicial") é registrada na mesma transação. Assim o trigger de
--    alerta avalia uma única vez, com a quantidade final.
--    O insert direto na tabela deixa de ser liberado: todo produto nasce aqui.
-- -----------------------------------------------------------------------------
create function public.cadastrar_produto(
  p_nome text,
  p_preco_venda numeric,
  p_preco_custo numeric default 0,
  p_descricao text default null,
  p_categoria_id uuid default null,
  p_codigo_barras text default null,
  p_unidade text default 'un',
  p_estoque_minimo integer default 10,
  p_estoque_inicial integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform public.exigir_proprietario();

  if p_estoque_inicial is null or p_estoque_inicial < 0 then
    raise exception 'O estoque inicial não pode ser negativo.' using errcode = 'P0001';
  end if;

  insert into public.produtos (
    nome, descricao, categoria_id, codigo_barras, unidade,
    preco_custo, preco_venda, estoque_minimo, quantidade
  )
  values (
    btrim(p_nome),
    nullif(btrim(p_descricao), ''),
    p_categoria_id,
    nullif(btrim(p_codigo_barras), ''),
    coalesce(p_unidade, 'un'),
    coalesce(p_preco_custo, 0),
    p_preco_venda,
    coalesce(p_estoque_minimo, 10),
    p_estoque_inicial
  )
  returning id into v_id;

  if p_estoque_inicial > 0 then
    insert into public.movimentacoes_estoque (
      produto_id, tipo, quantidade, quantidade_anterior, quantidade_posterior,
      usuario_id, motivo
    )
    values (v_id, 'entrada', p_estoque_inicial, 0, p_estoque_inicial, auth.uid(), 'Estoque inicial');
  end if;

  return v_id;
end;
$$;

revoke insert on public.produtos from authenticated;
drop policy produtos_insert on public.produtos;

-- -----------------------------------------------------------------------------
-- 6. Funções liberadas para usuários logados (cada uma checa o papel no início)
-- -----------------------------------------------------------------------------
grant execute on function public.registrar_entrada(uuid, integer, text) to authenticated;
grant execute on function public.registrar_saida_manual(uuid, integer, text) to authenticated;
grant execute on function public.registrar_ajuste(uuid, integer, text) to authenticated;
grant execute on function public.cadastrar_produto(
  text, numeric, numeric, text, uuid, text, text, integer, integer
) to authenticated;
