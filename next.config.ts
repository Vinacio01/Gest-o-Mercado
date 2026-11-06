import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O indicador de desenvolvimento do Next cobria o rodapé da sidebar (botão Sair).
  devIndicators: { position: "bottom-right" },
  // Cache Components (padrão do template) fica desligado de propósito:
  // quase toda tela depende do usuário logado e do RLS do Supabase, então
  // renderizamos por requisição e evitamos qualquer risco de cache
  // compartilhar dados entre usuários.
  // Cabeçalhos de segurança em todas as respostas (a Vercel já envia o HSTS).
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
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
