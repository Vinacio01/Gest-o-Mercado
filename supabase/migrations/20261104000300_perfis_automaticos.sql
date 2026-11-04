-- =============================================================================
-- Cria o perfil automaticamente quando um usuário é criado no Auth.
-- Todo usuário novo nasce como 'funcionario'. Para torná-lo proprietário,
-- altere perfis.papel pelo painel do Supabase (Table Editor ou SQL).
-- =============================================================================

create function public.criar_perfil_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, nome)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'nome'), ''),
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

-- Só o próprio trigger chama esta função.
revoke execute on function public.criar_perfil_novo_usuario() from public, anon, authenticated;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_novo_usuario();
