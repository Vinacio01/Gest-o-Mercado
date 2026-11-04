"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { SeloIracema } from "@/components/selo-iracema";
import { ITENS_NAVEGACAO } from "@/lib/navegacao";

type Props = {
  /**
   * Endereços que o usuário pode ver. Recebemos só os hrefs (texto) porque
   * ícones são componentes e não podem ser enviados do servidor ao cliente.
   */
  hrefsPermitidos: readonly string[];
  /** Conteúdo do rodapé (usuário logado e botão de sair), vindo do servidor. */
  rodape: React.ReactNode;
};

export function AppSidebar({ hrefsPermitidos, rodape }: Props) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const itens = ITENS_NAVEGACAO.filter((item) =>
    hrefsPermitidos.includes(item.href),
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href="/"
          className="flex justify-center px-1 pt-3 pb-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:pt-2"
          aria-label="Início"
        >
          <SeloIracema className="group-data-[collapsible=icon]:hidden" />
          <SeloIracema tamanho="compacto" className="hidden group-data-[collapsible=icon]:flex" />
        </Link>
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
                    <SidebarMenuButton
                      asChild
                      isActive={ativo}
                      tooltip={item.titulo}
                      // Item ativo: marca amarela (limão) à esquerda, além do fundo.
                      className="h-9 data-[active=true]:shadow-[inset_3px_0_0_var(--limao)]"
                    >
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

      <SidebarFooter>{rodape}</SidebarFooter>
    </Sidebar>
  );
}
