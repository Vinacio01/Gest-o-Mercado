-- =============================================================================
-- Fase 4: registrar_venda.
--
-- Uma única transação:
-- 1. Cria a venda pela chave de idempotência. Se a chave já existe, devolve a
--    venda existente sem processar de novo. Dois envios simultâneos com a mesma
--    chave: o segundo espera o primeiro terminar (índice único) e devolve a
--    mesma venda.
-- 2. Trava os produtos em ordem de id (evita deadlock entre duas vendas).
-- 3. Confere produto ativo e estoque suficiente; qualquer falha desfaz tudo.
-- 4. Preço e custo vêm do banco, nunca do navegador.
-- 5. Grava os itens, baixa o estoque e registra uma movimentação por item.
-- 6. Os alertas são abertos pelo trigger de produtos (Fase 3); a função
--    devolve os ids dos alertas criados nesta transação.
-- =============================================================================

create function public.registrar_venda(
  p_chave_idempotencia uuid,
  p_forma_pagamento public.forma_pagamento,
  p_itens jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venda_id     uuid;
  v_existente    public.vendas;
  v_ids          uuid[];
  v_qtds         integer[];
  v_i            integer;
  v_quantidade   integer;
  v_produto      public.produtos;
  v_total        numeric(10, 2);
  v_custo_total  numeric(10, 2);
  v_alertas      uuid[];
  v_qtd_produtos integer;
begin
  -- Funcionário e proprietário vendem; anônimo e desativado não.
  if not public.eh_usuario_ativo() then
    raise exception 'Você não tem permissão para registrar vendas.' using errcode = '42501';
  end if;

  if p_chave_idempotencia is null or p_forma_pagamento is null then
    raise exception 'Venda inválida. Recarregue a página e tente de novo.' using errcode = 'P0001';
  end if;

  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'A venda não tem itens.' using errcode = 'P0001';
  end if;

  if jsonb_array_length(p_itens) > 200 then
    raise exception 'A venda tem itens demais.' using errcode = 'P0001';
  end if;

  -- 1. Idempotência: a venda nasce aqui; o total é preenchido no fim.
  insert into public.vendas (
    chave_idempotencia, forma_pagamento, total, custo_total, operador_id
  )
  values (p_chave_idempotencia, p_forma_pagamento, 0, 0, auth.uid())
  on conflict (chave_idempotencia) do nothing
  returning id into v_venda_id;

  if v_venda_id is null then
    select * into v_existente
      from public.vendas
     where chave_idempotencia = p_chave_idempotencia;

    return jsonb_build_object(
      'venda_id', v_existente.id,
      'total', v_existente.total,
      'ja_registrada', true,
      'alertas', '[]'::jsonb
    );
  end if;

  -- Itens: só produto_id e quantidade são lidos (qualquer outro campo, como
  -- preço, é ignorado). O mesmo produto repetido é somado numa linha.
  begin
    select array_agg(produto_id order by produto_id),
           array_agg(quantidade order by produto_id)
      into v_ids, v_qtds
      from (
        select (item ->> 'produto_id')::uuid as produto_id,
               sum((item ->> 'quantidade')::integer)::integer as quantidade
          from jsonb_array_elements(p_itens) as item
         group by 1
      ) agrupado;
  exception
    when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'Há item inválido na venda.' using errcode = 'P0001';
  end;

  if array_position(v_ids, null) is not null
     or exists (select 1 from unnest(v_qtds) q where q is null or q <= 0) then
    raise exception 'Há item com quantidade inválida na venda.' using errcode = 'P0001';
  end if;

  -- 2. Trava os produtos em ordem de id.
  perform 1
    from public.produtos
   where id = any (v_ids)
   order by id
     for update;

  select count(*) into v_qtd_produtos from public.produtos where id = any (v_ids);

  if v_qtd_produtos <> cardinality(v_ids) then
    raise exception 'Um dos produtos da venda não existe mais. Recarregue a página.'
      using errcode = 'P0001';
  end if;

  -- 3, 4 e 5. Confere, grava o item e baixa o estoque, produto a produto.
  for v_i in 1 .. cardinality(v_ids) loop
    select * into v_produto from public.produtos where id = v_ids[v_i];
    v_quantidade := v_qtds[v_i];

    if not v_produto.ativo then
      raise exception '% está desativado e não pode ser vendido.', v_produto.nome
        using errcode = 'P0001';
    end if;

    if v_produto.quantidade < v_quantidade then
      raise exception 'Estoque insuficiente de %: há % % em estoque.',
        v_produto.nome, v_produto.quantidade, v_produto.unidade
        using errcode = 'P0001';
    end if;

    insert into public.itens_venda (
      venda_id, produto_id, quantidade, preco_unitario, custo_unitario, subtotal
    )
    values (
      v_venda_id,
      v_produto.id,
      v_quantidade,
      v_produto.preco_venda,
      v_produto.preco_custo,
      v_quantidade * v_produto.preco_venda
    );

    perform public.aplicar_movimentacao(
      v_produto.id, 'venda', v_quantidade, null, v_venda_id
    );
  end loop;

  -- Totais somados no banco (numeric, sem ponto flutuante).
  select sum(subtotal), sum(quantidade * custo_unitario)
    into v_total, v_custo_total
    from public.itens_venda
   where venda_id = v_venda_id;

  update public.vendas
     set total = v_total,
         custo_total = v_custo_total
   where id = v_venda_id;

  -- 6. Alertas abertos por esta transação (xmin = id da transação atual).
  select coalesce(array_agg(id), '{}') into v_alertas
    from public.alertas_estoque
   where produto_id = any (v_ids)
     and resolvido_em is null
     and xmin = pg_current_xact_id()::xid;

  return jsonb_build_object(
    'venda_id', v_venda_id,
    'total', v_total,
    'ja_registrada', false,
    'alertas', to_jsonb(v_alertas)
  );
end;
$$;

grant execute on function public.registrar_venda(uuid, public.forma_pagamento, jsonb)
  to authenticated;
