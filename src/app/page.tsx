import { redirect } from "next/navigation";

import { destinoInicial, exigirUsuario } from "@/lib/services/sessao";

// Proprietário vai para o painel; funcionário vai para o caixa.
export default async function Inicio() {
  const usuario = await exigirUsuario();
  redirect(destinoInicial(usuario.papel));
}
