-- =============================================================================
-- Corrige o "nascer fechado" das funções (achado na revisão da Fase 8).
--
-- A migration de segurança (20261104000200) usou
--   alter default privileges ... IN SCHEMA public revoke execute ... from public
-- mas no Postgres o default por schema só ACRESCENTA permissões: ele não retira
-- o EXECUTE que toda função nova recebe para PUBLIC (todo mundo, inclusive o
-- anônimo). Por isso as funções criadas depois ficaram executáveis por anon.
-- Elas já recusavam o anônimo no próprio código (exigir_proprietario /
-- eh_usuario_ativo), mas o princípio do projeto é privilégio mínimo: quem não
-- deve chamar nem chega a executar.
--
-- 1. Default GLOBAL (sem "in schema"): funções novas do postgres nascem sem
--    EXECUTE para PUBLIC.
-- 2. Retira PUBLIC e anon de todas as funções existentes em public. As
--    concessões explícitas a authenticated e service_role continuam valendo.
-- =============================================================================

alter default privileges for role postgres revoke execute on functions from public;

revoke execute on all functions in schema public from public, anon;
