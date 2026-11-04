import type { Metadata } from "next";
import { Source_Sans_3, Zilla_Slab } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

// Interface e tabelas: sans humanista, boa leitura de números.
const sourceSans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Logo, títulos e números grandes: serifa pesada, como o "IRACEMA" da placa.
const zillaSlab = Zilla_Slab({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Fruteira Iracema",
    template: "%s | Iracema",
  },
  description: "Caixa, estoque e painel da Mini Mercado e Fruteira Iracema.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${sourceSans.variable} ${zillaSlab.variable} h-full antialiased`}>
      <body className="min-h-full">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster richColors position="top-right" theme="light" />
      </body>
    </html>
  );
}
