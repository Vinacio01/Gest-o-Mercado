import {
  Boxes,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";

export type Papel = "proprietario" | "funcionario";

export type ItemNavegacao = {
  titulo: string;
  href: string;
  icone: LucideIcon;
  /** Papéis que enxergam o item. A permissão real é garantida no banco. */
  papeis: readonly Papel[];
};

export const ITENS_NAVEGACAO: readonly ItemNavegacao[] = [
  { titulo: "Painel", href: "/painel", icone: LayoutDashboard, papeis: ["proprietario"] },
  { titulo: "Caixa", href: "/caixa", icone: ShoppingCart, papeis: ["proprietario", "funcionario"] },
  { titulo: "Produtos", href: "/produtos", icone: Package, papeis: ["proprietario", "funcionario"] },
  { titulo: "Estoque", href: "/estoque", icone: Boxes, papeis: ["proprietario"] },
  { titulo: "Vendas", href: "/vendas", icone: Receipt, papeis: ["proprietario"] },
  { titulo: "Configurações", href: "/configuracoes", icone: Settings, papeis: ["proprietario"] },
];

export function itensDoPapel(papel: Papel): ItemNavegacao[] {
  return ITENS_NAVEGACAO.filter((item) => item.papeis.includes(papel));
}
