import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  rotulo: string;
  erro?: string;
  ajuda?: string;
  className?: string;
  children: React.ReactNode;
};

/** Rótulo, campo, texto de ajuda e mensagem de erro, sempre no mesmo formato. */
export function Campo({ id, rotulo, erro, ajuda, className, children }: Props) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{rotulo}</Label>
      {children}
      {erro ? (
        <p id={`${id}-erro`} className="text-sm text-destructive">
          {erro}
        </p>
      ) : ajuda ? (
        <p className="text-xs text-muted-foreground">{ajuda}</p>
      ) : null}
    </div>
  );
}
