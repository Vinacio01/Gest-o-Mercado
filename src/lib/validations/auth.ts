import { z } from "zod";

export const esquemaLogin = z.object({
  email: z.email("Informe um e-mail válido.").trim().toLowerCase(),
  senha: z.string().min(1, "Informe a senha."),
});

export type DadosLogin = z.infer<typeof esquemaLogin>;
