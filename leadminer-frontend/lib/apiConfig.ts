// O dashboard consome o backend NestJS (leadminer-backend), que roda como
// serviço separado — diferente das rotas /api/* deste projeto (Next.js),
// que são locais. Configurável via NEXT_PUBLIC_API_URL para produção/Vercel.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
