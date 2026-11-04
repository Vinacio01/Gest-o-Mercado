import { z } from "zod";

/**
 * Variáveis públicas (podem ir para o navegador).
 * Os nomes precisam aparecer literalmente (process.env.NEXT_PUBLIC_...)
 * para o Next.js conseguir embuti-los no bundle do cliente.
 */
const esquemaEnvPublico = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type EnvPublico = z.infer<typeof esquemaEnvPublico>;

export function lerEnvPublico(): EnvPublico {
  const resultado = esquemaEnvPublico.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!resultado.success) {
    throw new Error(
      "Variáveis do Supabase ausentes ou inválidas. Copie .env.example para .env.local e preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return resultado.data;
}
