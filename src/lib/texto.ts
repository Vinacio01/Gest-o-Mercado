/** Remove acentos e passa para minúsculas: "Feijão" -> "feijao". */
export function normalizarTexto(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Todas as palavras da busca aparecem no texto (sem diferenciar acentos). */
export function contemTermos(texto: string, busca: string): boolean {
  const alvo = normalizarTexto(texto);
  return normalizarTexto(busca)
    .split(/\s+/)
    .filter(Boolean)
    .every((termo) => alvo.includes(termo));
}
