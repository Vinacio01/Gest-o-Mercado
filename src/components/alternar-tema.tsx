"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

/** true só no navegador: o tema salvo não é conhecido na renderização do servidor. */
function useMontado() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/**
 * Escolha do tema no rodapé da sidebar: dois botões (☀ Claro / ☾ Escuro).
 * Com a sidebar recolhida, vira um único botão que alterna.
 */
export function AlternarTema() {
  const { resolvedTheme, setTheme } = useTheme();
  const montado = useMontado();
  const escuro = montado && resolvedTheme === "dark";

  const opcoes = [
    { valor: "light", rotulo: "Claro", icone: Sun, ativo: montado && !escuro },
    { valor: "dark", rotulo: "Escuro", icone: Moon, ativo: escuro },
  ] as const;

  return (
    <SidebarMenuItem>
      {/* Sidebar aberta: os dois botões lado a lado. */}
      <div
        role="radiogroup"
        aria-label="Tema"
        className="grid grid-cols-2 gap-1 rounded-lg bg-sidebar-accent/60 p-1 group-data-[collapsible=icon]:hidden"
      >
        {opcoes.map((o) => (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={o.ativo}
            onClick={() => setTheme(o.valor)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              o.ativo
                ? "bg-sidebar text-sidebar-foreground shadow-sm"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
            )}
          >
            <o.icone className={cn("size-4", o.ativo && o.valor === "light" && "text-limao")} />
            {o.rotulo}
          </button>
        ))}
      </div>

      {/* Sidebar recolhida: um botão só, que alterna. */}
      <SidebarMenuButton
        className="hidden group-data-[collapsible=icon]:flex"
        tooltip={escuro ? "Mudar para o tema claro" : "Mudar para o tema escuro"}
        onClick={() => setTheme(escuro ? "light" : "dark")}
      >
        {escuro ? <Sun /> : <Moon />}
        <span className="sr-only">{escuro ? "Tema claro" : "Tema escuro"}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
