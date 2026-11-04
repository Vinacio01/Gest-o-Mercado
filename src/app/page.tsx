import { redirect } from "next/navigation";

// Fase 2: o destino passará a depender do papel
// (proprietário -> /painel, funcionário -> /caixa).
export default function Inicio() {
  redirect("/painel");
}
