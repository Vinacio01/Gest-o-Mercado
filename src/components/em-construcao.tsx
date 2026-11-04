import { Hammer } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type Props = {
  fase: number;
  descricao: string;
};

/** Aviso temporário para telas que ainda serão construídas. */
export function EmConstrucao({ fase, descricao }: Props) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
          <Hammer className="size-5 text-muted-foreground" />
        </div>
        <p className="font-medium">Esta tela será construída na Fase {fase}.</p>
        <p className="max-w-md text-sm text-muted-foreground">{descricao}</p>
      </CardContent>
    </Card>
  );
}
