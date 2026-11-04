-- =============================================================================
-- APAGA TODOS OS DADOS DO MERCADO: vendas, itens, movimentações, alertas,
-- produtos e categorias. Use antes de começar o uso real, depois da
-- demonstração.
--
-- MANTÉM: usuários (Auth e perfis) e a configuração de alertas.
-- NÃO TEM VOLTA. Faça um backup antes se tiver dúvida.
--
-- Para rodar:
--   local:     npm run db:limpar
--   produção:  cole este arquivo no SQL Editor do Supabase
--
-- Um único bloco: roda numa transação só (ou apaga tudo, ou nada).
-- =============================================================================

do $$
begin
  delete from public.alertas_estoque;
  delete from public.movimentacoes_estoque;
  delete from public.itens_venda;
  delete from public.vendas;
  delete from public.produtos;
  delete from public.categorias;
  raise notice 'Dados do mercado apagados. Usuários e configurações foram mantidos.';
end;
$$;
