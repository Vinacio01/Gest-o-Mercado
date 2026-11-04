import { z } from "zod";

export const esquemaConfiguracoes = z.object({
  // Checkbox/switch: chega "on" quando marcado e não chega quando desmarcado.
  alertas_ativos: z
    .string()
    .optional()
    .transform((v) => v === "on"),
  email_alerta: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "E-mail longo demais.")
    .transform((v) => (v === "" ? null : v))
    .pipe(z.email("Informe um e-mail válido.").nullable()),
});

export type DadosConfiguracoes = z.infer<typeof esquemaConfiguracoes>;
