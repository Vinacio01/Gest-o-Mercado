import { cookies } from "next/headers";

import { AppSidebar } from "@/components/app-sidebar";
import { RodapeUsuario } from "@/components/rodape-usuario";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { itensDoPapel } from "@/lib/navegacao";
import { exigirUsuario } from "@/lib/services/sessao";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await exigirUsuario();

  // Lembra se a sidebar estava recolhida (cookie gravado pelo próprio componente).
  const cookieStore = await cookies();
  const sidebarAberta = cookieStore.get("sidebar_state")?.value !== "false";

  // Esconder itens é só conveniência: cada página e o banco checam o papel.
  const hrefsPermitidos = itensDoPapel(usuario.papel).map((item) => item.href);

  return (
    <SidebarProvider defaultOpen={sidebarAberta}>
      <AppSidebar
        hrefsPermitidos={hrefsPermitidos}
        rodape={<RodapeUsuario usuario={usuario} />}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <span className="text-sm text-muted-foreground">Estoque Mercadinho</span>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
