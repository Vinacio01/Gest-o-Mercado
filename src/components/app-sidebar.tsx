"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { ITENS_NAVEGACAO } from "@/lib/navegacao";

type Props = {
  /**
   * Endereços que o usuário pode ver. Recebemos só os hrefs (texto) porque
   * ícones são componentes e não podem ser enviados do servidor ao cliente.
   */
  hrefsPermitidos: readonly string[];
};

export function AppSidebar({ hrefsPermitidos }: Props) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const itens = ITENS_NAVEGACAO.filter((item) =>
    hrefsPermitidos.includes(item.href),
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Store className="size-4" />
          </div>
          <span className="truncate font-semibold group-data-[collapsible=icon]:hidden">
            Estoque Mercadinho
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {itens.map((item) => {
                const ativo =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={ativo} tooltip={item.titulo}>
                      <Link href={item.href} onClick={() => setOpenMobile(false)}>
                        <item.icone />
                        <span>{item.titulo}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
