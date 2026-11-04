import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O indicador de desenvolvimento do Next cobria o rodapé da sidebar (botão Sair).
  devIndicators: { position: "bottom-right" },
  // Cache Components (padrão do template) fica desligado de propósito:
  // quase toda tela depende do usuário logado e do RLS do Supabase, então
  // renderizamos por requisição e evitamos qualquer risco de cache
  // compartilhar dados entre usuários.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
