import { cn } from "@/lib/utils";

type Props = {
  /** "compacto": só o "I" (sidebar recolhida). */
  tamanho?: "normal" | "grande" | "compacto";
  className?: string;
};

/**
 * O selo oval da fachada da loja, refeito em código (sem a imagem): fundo
 * branco, contorno vermelho, "Mini Mercado e Fruteira" pequeno e IRACEMA
 * grande em serifa pesada.
 */
export function SeloIracema({ tamanho = "normal", className }: Props) {
  if (tamanho === "compacto") {
    return (
      <span
        aria-label="Fruteira Iracema"
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-[50%] border-2 border-iracema bg-white font-display text-lg leading-none font-bold text-iracema",
          className,
        )}
      >
        I
      </span>
    );
  }

  const grande = tamanho === "grande";
  return (
    <span
      role="img"
      aria-label="Mini Mercado e Fruteira Iracema"
      className={cn(
        "flex flex-col items-center justify-center rounded-[50%] border-iracema bg-white text-center text-iracema",
        grande ? "border-[3px] px-10 py-5" : "border-2 px-5 py-2.5",
        className,
      )}
    >
      <span
        className={cn(
          "font-display font-semibold tracking-wide text-folha",
          grande ? "text-sm" : "text-[0.62rem] leading-tight",
        )}
      >
        Mini Mercado e Fruteira
      </span>
      <span
        className={cn(
          "font-display leading-none font-bold tracking-wide",
          grande ? "text-5xl" : "text-[1.65rem]",
        )}
      >
        IRACEMA
      </span>
    </span>
  );
}
