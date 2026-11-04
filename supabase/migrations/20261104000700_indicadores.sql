-- =============================================================================
-- Fase 6: indicadores do painel, calculados no banco.
--
-- - Só vendas 'concluida' entram (canceladas ficam fora de todos os números).
-- - Os períodos chegam prontos (início inclusivo, fim exclusivo), calculados
--   pela aplicação no fuso de São Paulo (src/lib/periodos.ts). Agrupar por dia
--   ou mês também usa America/Sao_Paulo: uma venda às 22h do dia 31 pertence
--   ao dia 31.
-- - security invoker (padrão): rodam com as permissões de quem chama, então o
--   RLS de vendas vale aqui também. Além disso, cada função recusa quem não é
--   proprietário logo no início, com uma mensagem clara.
-- =============================================================================

create function public.resumo_vendas(p_inicio timestamptz, p_fim timestamptz)
returns table (
  faturamento numeric,
  custo numeric,
  lucro_bruto numeric,
  quantidade_vendas integer,
  ticket_medio numeric
)
language plpgsql
stable
set search_path = ''
as $$
begin
  if not public.eh_proprietario() then
    raise exception 'Apenas o proprietário vê os indicadores.' using errcode = '42501';
  end if;

  return query
  select
    coalesce(sum(v.total), 0),
    coalesce(sum(v.custo_total), 0),
    coalesce(sum(v.total), 0) - coalesce(sum(v.custo_total), 0),
    count(*)::integer,
    -- Ticket médio = faturamento ÷ vendas válidas (sem divisão por zero).
    coalesce(round(sum(v.total) / nullif(count(*), 0), 2), 0)
  from public.vendas v
  where v.status = 'concluida'
    and v.created_at >= p_inicio
    and v.created_at < p_fim;
end;
$$;

-- Um registro por dia do período, inclusive dias sem venda (faturamento 0).
create function public.faturamento_por_dia(p_inicio timestamptz, p_fim timestamptz)
returns table (dia date, faturamento numeric, quantidade_vendas integer)
language plpgsql
stable
set search_path = ''
as $$
begin
  if not public.eh_proprietario() then
    raise exception 'Apenas o proprietário vê os indicadores.' using errcode = '42501';
  end if;

  return query
  with dias as (
    select generate_series(
      (p_inicio at time zone 'America/Sao_Paulo')::date,
      ((p_fim - interval '1 microsecond') at time zone 'America/Sao_Paulo')::date,
      interval '1 day'
    )::date as dia
  ),
  por_dia as (
    select (v.created_at at time zone 'America/Sao_Paulo')::date as dia,
           sum(v.total) as faturamento,
           count(*) as quantidade
      from public.vendas v
     where v.status = 'concluida'
       and v.created_at >= p_inicio
       and v.created_at < p_fim
     group by 1
  )
  select d.dia, coalesce(p.faturamento, 0), coalesce(p.quantidade, 0)::integer
    from dias d
    left join por_dia p on p.dia = d.dia
   order by d.dia;
end;
$$;

-- Os últimos p_meses meses (incluindo o da referência), um registro por mês.
create function public.faturamento_por_mes(p_referencia timestamptz, p_meses integer default 6)
returns table (mes date, faturamento numeric, quantidade_vendas integer)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_mes_atual   date := date_trunc('month', p_referencia at time zone 'America/Sao_Paulo')::date;
  v_primeiro    date := (v_mes_atual - make_interval(months => greatest(p_meses, 1) - 1))::date;
begin
  if not public.eh_proprietario() then
    raise exception 'Apenas o proprietário vê os indicadores.' using errcode = '42501';
  end if;

  return query
  with meses as (
    select generate_series(v_primeiro, v_mes_atual, interval '1 month')::date as mes
  ),
  por_mes as (
    select date_trunc('month', v.created_at at time zone 'America/Sao_Paulo')::date as mes,
           sum(v.total) as faturamento,
           count(*) as quantidade
      from public.vendas v
     where v.status = 'concluida'
       and v.created_at >= (v_primeiro::timestamp at time zone 'America/Sao_Paulo')
       and v.created_at < ((v_mes_atual + interval '1 month')::timestamp at time zone 'America/Sao_Paulo')
     group by 1
  )
  select m.mes, coalesce(p.faturamento, 0), coalesce(p.quantidade, 0)::integer
    from meses m
    left join por_mes p on p.mes = m.mes
   order by m.mes;
end;
$$;

-- Produtos mais vendidos (por quantidade) no período.
create function public.top_produtos(
  p_inicio timestamptz,
  p_fim timestamptz,
  p_limite integer default 10
)
returns table (produto_id uuid, nome text, unidade text, quantidade integer, faturamento numeric)
language plpgsql
stable
set search_path = ''
as $$
begin
  if not public.eh_proprietario() then
    raise exception 'Apenas o proprietário vê os indicadores.' using errcode = '42501';
  end if;

  return query
  select p.id, p.nome, p.unidade, sum(i.quantidade)::integer, sum(i.subtotal)
    from public.itens_venda i
    join public.vendas v on v.id = i.venda_id
    join public.produtos p on p.id = i.produto_id
   where v.status = 'concluida'
     and v.created_at >= p_inicio
     and v.created_at < p_fim
   group by p.id, p.nome, p.unidade
   order by sum(i.quantidade) desc, sum(i.subtotal) desc, p.nome
   limit least(greatest(p_limite, 1), 50);
end;
$$;

-- Todas as formas de pagamento, inclusive as sem venda no período.
create function public.vendas_por_forma(p_inicio timestamptz, p_fim timestamptz)
returns table (forma_pagamento public.forma_pagamento, quantidade_vendas integer, faturamento numeric)
language plpgsql
stable
set search_path = ''
as $$
begin
  if not public.eh_proprietario() then
    raise exception 'Apenas o proprietário vê os indicadores.' using errcode = '42501';
  end if;

  return query
  select f.forma, count(v.id)::integer, coalesce(sum(v.total), 0)
    from unnest(enum_range(null::public.forma_pagamento)) as f(forma)
    left join public.vendas v
      on v.forma_pagamento = f.forma
     and v.status = 'concluida'
     and v.created_at >= p_inicio
     and v.created_at < p_fim
   group by f.forma
   order by f.forma;
end;
$$;

grant execute on function public.resumo_vendas(timestamptz, timestamptz) to authenticated;
grant execute on function public.faturamento_por_dia(timestamptz, timestamptz) to authenticated;
grant execute on function public.faturamento_por_mes(timestamptz, integer) to authenticated;
grant execute on function public.top_produtos(timestamptz, timestamptz, integer) to authenticated;
grant execute on function public.vendas_por_forma(timestamptz, timestamptz) to authenticated;
