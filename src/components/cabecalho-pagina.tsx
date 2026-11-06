type Props = {
  titulo: string;
  descricao?: string;
  /** Botões ou filtros alinhados à direita do título. */
  acoes?: React.ReactNode;
};

export function CabecalhoPagina({ titulo, descricao, acoes }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-bold text-titulo">{titulo}</h1>
        {descricao ? (
          <p className="text-sm text-muted-foreground">{descricao}</p>
        ) : null}
      </div>
      {acoes ? <div className="flex flex-wrap gap-2">{acoes}</div> : null}
    </div>
  );
}
