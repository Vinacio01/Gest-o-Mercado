-- =============================================================================
-- Fase 8: cancelamento de venda (só proprietário).
--
-- Numa única transação:
-- 1. Trava a venda (for update): dois cancelamentos simultâneos não devolvem
--    o estoque duas vezes.
-- 2. Recusa venda inexistente ou já cancelada.
-- 3. Marca como 'cancelada' com quem, quando e por quê.
-- 4. Devolve as quantidades ao estoque pela mesma aplicar_movimentacao da
--    Fase 3 (trava o produto, em ordem de id, e registra 'cancelamento_venda').
--    O trigger de alertas resolve o alerta aberto se o estoque voltar acima do
--    mínimo (decisão D).
-- A venda cancelada sai de todos os indicadores: as funções do painel só
-- contam vendas 'concluida'.
-- =============================================================================

create function public.cancelar_venda(p_venda_id uuid, p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venda public.vendas;
  v_item  record;
  v_itens integer := 0;
begin
  perform public.exigir_proprietario();

  if nullif(btrim(p_motivo), '') is null then
    raise exception 'Informe o motivo do cancelamento.' using errcode = 'P0001';
  end if;

  select * into v_venda
    from public.vendas
   where id = p_venda_id
     for update;

  if not found then
    raise exception 'Venda não encontrada.' using errcode = 'P0001';
  end if;

  if v_venda.status = 'cancelada' then
    raise exception 'Esta venda já foi cancelada.' using errcode = 'P0001';
  end if;

  update public.vendas
     set status = 'cancelada',
         cancelada_por = auth.uid(),
         cancelada_em = now(),
         motivo_cancelamento = btrim(p_motivo)
   where id = p_venda_id;

  for v_item in
    select produto_id, quantidade
      from public.itens_venda
     where venda_id = p_venda_id
     order by produto_id
  loop
    perform public.aplicar_movimentacao(
      v_item.produto_id, 'cancelamento_venda', v_item.quantidade, null, p_venda_id
    );
    v_itens := v_itens + 1;
  end loop;

  return jsonb_build_object('venda_id', p_venda_id, 'itens_devolvidos', v_itens);
end;
$$;

grant execute on function public.cancelar_venda(uuid, text) to authenticated;
