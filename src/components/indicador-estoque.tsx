import { Badge } from "@/components/ui/badge";

type Props = {
  quantidade: number;
  estoqueMinimo: number;
  unidade: string;
};

/** Quantidade em estoque com destaque para "sem estoque" e "estoque baixo". */
export function IndicadorEstoque({ quantidade, estoqueMinimo, unidade }: Props) {
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="tabular-nums">
        {quantidade.toLocaleString("pt-BR")} {unidade}
      </span>
      {quantidade === 0 ? (
        <Badge variant="destructive">Sem estoque</Badge>
      ) : quantidade <= estoqueMinimo ? (
        <Badge className="bg-laranja/15 text-laranja-texto">
          Baixo
        </Badge>
      ) : null}
    </div>
  );
}
