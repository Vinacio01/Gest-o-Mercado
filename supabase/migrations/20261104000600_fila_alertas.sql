-- =============================================================================
-- Fase 5: fila de envio dos alertas de estoque.
--
-- Três lugares podem tentar enviar o mesmo alerta ao mesmo tempo: a venda (logo
-- depois de concluída), o cron e o botão "Reenviar" do proprietário. Para que
-- cada alerta gere exatamente um e-mail, quem vai enviar primeiro "reserva" o
-- alerta (processando_desde = now()) com for update skip locked: um segundo
-- processador pula os alertas já reservados.
--
-- Uma reserva com mais de 10 minutos é considerada abandonada (o servidor caiu
-- no meio do envio) e pode ser retomada.
--
-- Só o servidor (service role) chama estas funções.
-- =============================================================================

alter table public.alertas_estoque
  add column processando_desde timestamptz;

comment on column public.alertas_estoque.processando_desde is
  'Preenchido enquanto um processador envia o e-mail; evita envio duplicado.';

create function public.reservar_alertas_para_envio(
  p_ids uuid[] default null,
  p_limite_tentativas integer default 5
)
returns table (
  alerta_id uuid,
  tentativas_anteriores integer,
  produto_nome text,
  produto_quantidade integer,
  produto_estoque_minimo integer,
  produto_unidade text
)
language sql
security definer
set search_path = ''
as $$
  -- Decisão E (e pendência da Fase 3): alerta cujo produto voltou acima do
  -- mínimo ou foi desativado não envia e-mail; é resolvido.
  update public.alertas_estoque a
     set resolvido_em = now(),
         processando_desde = null
    from public.produtos p
   where p.id = a.produto_id
     and a.resolvido_em is null
     and a.status in ('pendente', 'falhou')
     and (p_ids is null or a.id = any (p_ids))
     and (p.quantidade > p.estoque_minimo or not p.ativo);

  with candidatos as (
    select a.id
      from public.alertas_estoque a
     where a.resolvido_em is null
       and a.status in ('pendente', 'falhou')
       and (p_ids is null or a.id = any (p_ids))
       and (p_limite_tentativas is null or a.tentativas < p_limite_tentativas)
       and (a.processando_desde is null or a.processando_desde < now() - interval '10 minutes')
     order by a.created_at
     limit 50
       for update skip locked
  ),
  reservados as (
    update public.alertas_estoque a
       set processando_desde = now()
      from candidatos c
     where a.id = c.id
    returning a.id, a.tentativas, a.produto_id
  )
  select r.id, r.tentativas, p.nome, p.quantidade, p.estoque_minimo, p.unidade
    from reservados r
    join public.produtos p on p.id = r.produto_id;
$$;

revoke execute on function public.reservar_alertas_para_envio(uuid[], integer)
  from public, anon, authenticated;
grant execute on function public.reservar_alertas_para_envio(uuid[], integer)
  to service_role;
