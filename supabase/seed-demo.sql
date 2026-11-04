-- =============================================================================
-- DADOS DE DEMONSTRAÇÃO — só para demo e desenvolvimento.
--
-- NUNCA roda automaticamente. Para rodar (ver README, "Dados de demonstração"):
--   local:     npm run db:demo
--   produção:  cole este arquivo no SQL Editor do Supabase
--
-- Cria categorias, 30 produtos de mercadinho e ~90 dias de vendas com variação
-- entre os meses (crescimento leve, sábado forte, domingo fraco), algumas
-- vendas canceladas e alguns produtos perto ou abaixo do estoque mínimo.
--
-- O histórico é coerente: cada venda tem itens com preço e custo, baixa o
-- estoque e registra a movimentação 'venda' na hora em que aconteceu;
-- reposições aparecem como 'entrada'. Para apagar tudo antes do uso real:
-- supabase/limpar-dados.sql.
--
-- Pré-requisito: pelo menos um usuário com papel 'proprietario' (as vendas e
-- movimentações precisam de um operador).
-- =============================================================================

do $$
declare
  c_fuso constant text := 'America/Sao_Paulo';
  v_dono uuid;
  v_func uuid;
  v_inicio date := (now() at time zone c_fuso)::date - 89;
  v_hoje date := (now() at time zone c_fuso)::date;
  v_mes_atual date := date_trunc('month', now() at time zone c_fuso)::date;

  -- Catálogo: nome, categoria, unidade, custo, venda, mínimo, popularidade (peso), termina_baixo
  v_catalogo jsonb := $json$[
    ["Arroz Tipo 1 5 kg",              "Mercearia",          "un", 21.40, 27.90, 10, 9, false],
    ["Feijão Carioca 1 kg",            "Mercearia",          "un",  6.20,  8.99, 12, 9, true ],
    ["Feijão Preto 1 kg",              "Mercearia",          "un",  6.60,  9.49, 10, 6, false],
    ["Açúcar Refinado 1 kg",           "Mercearia",          "un",  3.40,  4.99, 10, 7, false],
    ["Café Torrado e Moído 500 g",     "Mercearia",          "un", 15.80, 21.90, 10, 8, true ],
    ["Óleo de Soja 900 ml",            "Mercearia",          "un",  5.30,  7.49, 10, 7, false],
    ["Macarrão Espaguete 500 g",       "Mercearia",          "un",  2.70,  4.29, 10, 7, false],
    ["Farinha de Trigo 1 kg",          "Mercearia",          "un",  3.80,  5.49,  8, 4, false],
    ["Sal Refinado 1 kg",              "Mercearia",          "un",  1.60,  2.99,  6, 3, false],
    ["Molho de Tomate 340 g",          "Mercearia",          "un",  1.70,  2.79, 10, 6, false],
    ["Ovos Brancos (dúzia)",           "Mercearia",          "cx",  8.40, 11.90,  8, 6, false],
    ["Leite Integral 1 L",             "Laticínios e frios", "un",  4.10,  5.49, 24, 10, true ],
    ["Manteiga 200 g",                 "Laticínios e frios", "un",  9.20, 12.90,  6, 4, false],
    ["Iogurte Natural 170 g",          "Laticínios e frios", "un",  2.20,  3.49, 10, 5, false],
    ["Queijo Mussarela Fatiado 150 g", "Laticínios e frios", "un",  6.80,  9.90,  8, 6, false],
    ["Presunto Fatiado 150 g",         "Laticínios e frios", "un",  5.40,  7.90,  8, 5, false],
    ["Pão Francês (pacote 10 un)",     "Padaria",            "un",  5.00,  8.50, 15, 10, false],
    ["Pão de Forma 500 g",             "Padaria",            "un",  6.10,  8.99,  8, 6, false],
    ["Bolacha Recheada 130 g",         "Padaria",            "un",  2.10,  3.29, 12, 6, false],
    ["Refrigerante Cola 2 L",          "Bebidas",            "un",  7.60, 10.99, 12, 8, false],
    ["Refrigerante Guaraná 2 L",       "Bebidas",            "un",  6.10,  8.99, 12, 6, true ],
    ["Água Mineral 500 ml",            "Bebidas",            "un",  1.10,  2.50, 24, 7, false],
    ["Cerveja Lata 350 ml",            "Bebidas",            "un",  3.10,  4.49, 24, 8, false],
    ["Suco de Uva Integral 1 L",       "Bebidas",            "un", 10.20, 14.90,  6, 4, false],
    ["Detergente Líquido 500 ml",      "Limpeza",            "un",  1.60,  2.69, 10, 5, false],
    ["Sabão em Pó 800 g",              "Limpeza",            "un",  9.80, 13.90,  6, 3, false],
    ["Água Sanitária 1 L",             "Limpeza",            "un",  2.70,  4.49,  8, 3, true ],
    ["Papel Higiênico 12 rolos",       "Higiene",            "un", 15.90, 21.90,  6, 4, false],
    ["Sabonete 85 g",                  "Higiene",            "un",  1.40,  2.49, 12, 4, false],
    ["Creme Dental 90 g",              "Higiene",            "un",  3.10,  4.99, 10, 4, false]
  ]$json$;

  v_item jsonb;
  v_i integer;
  v_ids uuid[] := '{}';
  v_pesos integer[] := '{}';
  v_baixo boolean[] := '{}';
  v_peso_total integer := 0;
  v_cat uuid;
  v_prod uuid;

  v_dia date;
  v_qtd_vendas integer;
  v_fator numeric;
  v_horario timestamptz;
  v_horarios timestamptz[];
  v_venda uuid;
  v_operador uuid;
  v_n_itens integer;
  v_escolhidos uuid[];
  v_sorteio integer;
  v_acumulado integer;
  v_j integer;
  v_quantidade integer;
  v_p public.produtos;
  v_forma public.forma_pagamento;
  v_r numeric;
  v_reposicao integer;
  v_mov record;
begin
  if exists (select 1 from public.produtos where codigo_barras like '2000000000%') then
    raise exception 'Os dados de demonstração já existem. Rode supabase/limpar-dados.sql antes de rodar de novo.';
  end if;

  select id into v_dono from public.perfis where papel = 'proprietario' and ativo order by id limit 1;
  if v_dono is null then
    raise exception 'Crie um usuário proprietário antes (veja o README).';
  end if;
  select id into v_func from public.perfis where papel = 'funcionario' and ativo order by id limit 1;

  perform setseed(0.42); -- mesmos dados a cada execução

  -- O histórico é escrito direto nas tabelas, com as datas do passado. Os
  -- alertas são avaliados uma vez no fim, como se o sistema estivesse em uso.
  alter table public.produtos disable trigger produtos_alerta_ao_criar;
  alter table public.produtos disable trigger produtos_alerta_ao_alterar;

  -- Categorias (aproveita as que já existirem com o mesmo nome)
  insert into public.categorias (nome)
  select distinct item ->> 1 from jsonb_array_elements(v_catalogo) item
  on conflict do nothing;

  -- Produtos, com o estoque inicial lançado como entrada há 90 dias
  v_i := 0;
  for v_item in select * from jsonb_array_elements(v_catalogo) loop
    v_i := v_i + 1;
    select id into v_cat from public.categorias where lower(nome) = lower(v_item ->> 1);

    insert into public.produtos (
      nome, categoria_id, codigo_barras, unidade, preco_custo, preco_venda,
      estoque_minimo, quantidade, created_at
    )
    values (
      v_item ->> 0, v_cat, '2000000000' || lpad(v_i::text, 3, '0'), v_item ->> 2,
      (v_item ->> 3)::numeric, (v_item ->> 4)::numeric, (v_item ->> 5)::integer,
      (v_item ->> 5)::integer * 6,
      (v_inicio::timestamp + interval '7 hours') at time zone c_fuso
    )
    returning id into v_prod;

    insert into public.movimentacoes_estoque (
      produto_id, tipo, quantidade, quantidade_anterior, quantidade_posterior,
      usuario_id, motivo, created_at
    )
    values (
      v_prod, 'entrada', (v_item ->> 5)::integer * 6, 0, (v_item ->> 5)::integer * 6,
      v_dono, 'Estoque inicial',
      (v_inicio::timestamp + interval '7 hours') at time zone c_fuso
    );

    v_ids := v_ids || v_prod;
    v_pesos := v_pesos || (v_item ->> 6)::integer;
    v_baixo := v_baixo || (v_item ->> 7)::boolean;
    v_peso_total := v_peso_total + (v_item ->> 6)::integer;
  end loop;

  -- Vendas dia a dia
  for v_dia in select generate_series(v_inicio, v_hoje, interval '1 day')::date loop
    -- Crescimento leve mês a mês, sábado forte e domingo fraco, ruído de ±25%.
    v_fator := case
      when v_dia >= v_mes_atual then 1.12
      when v_dia >= (v_mes_atual - interval '1 month') then 1.00
      when v_dia >= (v_mes_atual - interval '2 months') then 0.90
      else 0.82
    end
    * case extract(isodow from v_dia) when 6 then 1.45 when 7 then 0.55 else 1 end
    * (0.75 + random() * 0.5);
    v_qtd_vendas := greatest(round(30 * v_fator)::integer, 2);

    -- Horários entre 7h30 e 20h30, em ordem (o saldo de estoque segue o relógio).
    select array_agg(h order by h) into v_horarios
      from (
        select (v_dia::timestamp + interval '7 hours 30 minutes' + random() * interval '13 hours')
                 at time zone c_fuso as h
          from generate_series(1, v_qtd_vendas)
      ) s
     where h < now();

    continue when v_horarios is null;

    foreach v_horario in array v_horarios loop
      v_operador := case when v_func is not null and random() < 0.7 then v_func else v_dono end;
      v_r := random();
      v_forma := case
        when v_r < 0.40 then 'pix'
        when v_r < 0.65 then 'dinheiro'
        when v_r < 0.85 then 'debito'
        else 'credito'
      end;

      insert into public.vendas (
        chave_idempotencia, forma_pagamento, total, custo_total, operador_id, created_at
      )
      values (gen_random_uuid(), v_forma, 0, 0, v_operador, v_horario)
      returning id into v_venda;

      v_n_itens := 1 + floor(random() * random() * 6)::integer; -- quase sempre poucos itens
      v_escolhidos := '{}';

      for v_j in 1 .. v_n_itens loop
        -- Sorteio ponderado pela popularidade.
        -- (laço while: a variável de um "for" não existe fora dele)
        v_sorteio := 1 + floor(random() * v_peso_total)::integer;
        v_acumulado := 0;
        v_i := 0;
        while v_acumulado < v_sorteio loop
          v_i := v_i + 1;
          v_acumulado := v_acumulado + v_pesos[v_i];
        end loop;

        continue when v_ids[v_i] = any (v_escolhidos);
        v_escolhidos := v_escolhidos || v_ids[v_i];

        select * into v_p from public.produtos where id = v_ids[v_i];
        v_quantidade := case when random() < 0.7 then 1 when random() < 0.7 then 2 else 3 end;

        -- Reposição quando o estoque fica perto do mínimo. Os produtos que
        -- devem terminar baixos param de ser repostos nos últimos 12 dias.
        if v_p.quantidade - v_quantidade <= v_p.estoque_minimo
           and not (v_baixo[v_i] and v_dia > v_hoje - 12) then
          v_reposicao := v_p.estoque_minimo * 5;
          insert into public.movimentacoes_estoque (
            produto_id, tipo, quantidade, quantidade_anterior, quantidade_posterior,
            usuario_id, motivo, created_at
          )
          values (
            v_p.id, 'entrada', v_reposicao, v_p.quantidade, v_p.quantidade + v_reposicao,
            v_dono, 'Reposição do fornecedor', v_horario - interval '1 minute'
          );
          update public.produtos set quantidade = quantidade + v_reposicao where id = v_p.id
          returning * into v_p;
        end if;

        continue when v_p.quantidade < v_quantidade;

        insert into public.itens_venda (
          venda_id, produto_id, quantidade, preco_unitario, custo_unitario, subtotal
        )
        values (
          v_venda, v_p.id, v_quantidade, v_p.preco_venda, v_p.preco_custo,
          v_quantidade * v_p.preco_venda
        );

        insert into public.movimentacoes_estoque (
          produto_id, tipo, quantidade, quantidade_anterior, quantidade_posterior,
          usuario_id, venda_id, created_at
        )
        values (
          v_p.id, 'venda', v_quantidade, v_p.quantidade, v_p.quantidade - v_quantidade,
          v_operador, v_venda, v_horario
        );

        update public.produtos set quantidade = quantidade - v_quantidade where id = v_p.id;
      end loop;

      -- Venda sem nenhum item (estoque acabou): descarta.
      if not exists (select 1 from public.itens_venda where venda_id = v_venda) then
        delete from public.vendas where id = v_venda;
        continue;
      end if;

      update public.vendas v
         set total = s.total, custo_total = s.custo
        from (
          select sum(subtotal) as total, sum(quantidade * custo_unitario) as custo
            from public.itens_venda where venda_id = v_venda
        ) s
       where v.id = v_venda;

      -- ~1% das vendas foram canceladas pelo proprietário logo depois, com
      -- estorno do estoque (ficam fora de todos os indicadores).
      if random() < 0.01 then
        update public.vendas
           set status = 'cancelada', cancelada_por = v_dono,
               cancelada_em = v_horario + interval '5 minutes',
               motivo_cancelamento = 'Cliente desistiu da compra'
         where id = v_venda;

        for v_mov in
          select i.produto_id, i.quantidade, p.quantidade as atual
            from public.itens_venda i join public.produtos p on p.id = i.produto_id
           where i.venda_id = v_venda
        loop
          insert into public.movimentacoes_estoque (
            produto_id, tipo, quantidade, quantidade_anterior, quantidade_posterior,
            usuario_id, venda_id, created_at
          )
          values (
            v_mov.produto_id, 'cancelamento_venda', v_mov.quantidade, v_mov.atual,
            v_mov.atual + v_mov.quantidade, v_dono, v_venda, v_horario + interval '5 minutes'
          );
          update public.produtos set quantidade = quantidade + v_mov.quantidade
           where id = v_mov.produto_id;
        end loop;
      end if;
    end loop;
  end loop;

  -- Os produtos marcados terminam perto ou abaixo do mínimo (contagem feita
  -- agora); os demais terminam com folga. Data = agora, depois de todas as vendas.
  v_horario := now();
  for v_k in 1 .. array_length(v_ids, 1) loop
    v_i := v_k;
    select * into v_p from public.produtos where id = v_ids[v_i];

    if v_baixo[v_i] and v_p.quantidade > v_p.estoque_minimo then
      v_quantidade := greatest(v_p.estoque_minimo - 1 - floor(random() * 4)::integer, 0);
      insert into public.movimentacoes_estoque (
        produto_id, tipo, quantidade, quantidade_anterior, quantidade_posterior,
        usuario_id, motivo, created_at
      )
      values (v_p.id, 'ajuste', v_quantidade, v_p.quantidade, v_quantidade, v_dono,
              'Contagem de estoque', v_horario);
      update public.produtos set quantidade = v_quantidade where id = v_p.id;
    elsif not v_baixo[v_i] and v_p.quantidade <= v_p.estoque_minimo then
      v_reposicao := v_p.estoque_minimo * 4;
      insert into public.movimentacoes_estoque (
        produto_id, tipo, quantidade, quantidade_anterior, quantidade_posterior,
        usuario_id, motivo, created_at
      )
      values (v_p.id, 'entrada', v_reposicao, v_p.quantidade, v_p.quantidade + v_reposicao,
              v_dono, 'Reposição do fornecedor', v_horario);
      update public.produtos set quantidade = quantidade + v_reposicao where id = v_p.id;
    end if;
  end loop;

  alter table public.produtos enable trigger produtos_alerta_ao_criar;
  alter table public.produtos enable trigger produtos_alerta_ao_alterar;

  -- Alertas dos produtos que terminaram no mínimo (um por produto, pendente).
  insert into public.alertas_estoque (produto_id, quantidade_no_alerta, estoque_minimo_no_alerta)
  select p.id, p.quantidade, p.estoque_minimo
    from public.produtos p
   where p.id = any (v_ids)
     and p.quantidade <= p.estoque_minimo
  on conflict (produto_id) where resolvido_em is null do nothing;

  raise notice 'Demonstração criada: % produtos, % vendas.',
    array_length(v_ids, 1),
    (select count(*) from public.vendas v
      where exists (select 1 from public.itens_venda i where i.venda_id = v.id and i.produto_id = any (v_ids)));
end;
$$;
