import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  caminho: string;
  /** Parâmetros atuais da URL (filtros), preservados ao trocar de página. */
  parametros: Record<string, string | undefined>;
  pagina: number;
  total: number;
  porPagina: number;
  rotuloItens: string;
};

export function Paginacao({ caminho, parametros, pagina, total, porPagina, rotuloItens }: Props) {
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  const hrefDaPagina = (n: number) => {
    const busca = new URLSearchParams();
    for (const [chave, valor] of Object.entries(parametros)) {
      if (valor && chave !== "pagina") busca.set(chave, valor);
    }
    if (n > 1) busca.set("pagina", String(n));
    const texto = busca.toString();
    return texto ? `${caminho}?${texto}` : caminho;
  };

  return (
    <div className="flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
      <span>
        {total.toLocaleString("pt-BR")} {rotuloItens}
      </span>
      {totalPaginas > 1 ? (
        <div className="flex items-center gap-2">
          {pagina > 1 ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={hrefDaPagina(pagina - 1)}>
                <ChevronLeft /> Anterior
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft /> Anterior
            </Button>
          )}
          <span>
            Página {pagina} de {totalPaginas}
          </span>
          {pagina < totalPaginas ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={hrefDaPagina(pagina + 1)}>
                Próxima <ChevronRight />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Próxima <ChevronRight />
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
