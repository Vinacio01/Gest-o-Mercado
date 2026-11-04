import { LogOut } from "lucide-react";

import { sair } from "@/app/login/actions";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import type { UsuarioAtual } from "@/lib/services/sessao";

const ROTULO_PAPEL = {
  proprietario: "Proprietário",
  funcionario: "Funcionário",
} as const;

type Props = {
  usuario: UsuarioAtual;
};

export function RodapeUsuario({ usuario }: Props) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="px-2 py-1.5 group-data-[collapsible=icon]:hidden">
          <p className="truncate text-sm font-medium">{usuario.nome}</p>
          <p className="truncate text-xs text-sidebar-foreground/70">
            {ROTULO_PAPEL[usuario.papel]}
          </p>
        </div>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <form action={sair}>
          <SidebarMenuButton type="submit" tooltip="Sair">
            <LogOut />
            <span>Sair</span>
          </SidebarMenuButton>
        </form>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
