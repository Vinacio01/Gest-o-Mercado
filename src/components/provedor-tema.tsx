"use client";

import { ThemeProvider } from "next-themes";

/**
 * Tema claro/escuro. Começa no claro e lembra a escolha de cada pessoa no
 * navegador (localStorage). O next-themes aplica a classe "dark" no <html>
 * antes da página aparecer, então não há "piscada" do tema errado.
 */
export function ProvedorTema({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="iracema-tema"
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
