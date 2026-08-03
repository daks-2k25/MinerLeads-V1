# leadminer-backend

Backend definitivo do LeadMiner, em NestJS. Substitui as rotas `app/api/*` do
projeto Next.js (`leadminer`) e o protótipo Express não conectado
(`leadminer-api`).

> Estado atual: **apenas estrutura**. Nenhuma regra de negócio foi migrada
> ainda — todos os services lançam `NotImplementedException` nos métodos que
> correspondem a funcionalidades do projeto atual. Ver
> [`../leadminer/docs/MIGRACAO-NESTJS.md`](../leadminer/docs/MIGRACAO-NESTJS.md)
> para o plano completo de migração.

## Stack

- NestJS 11 (Express)
- Prisma 7 + PostgreSQL (via `@prisma/adapter-pg`)
- class-validator / class-transformer para DTOs
- Passport + JWT (estrutura de autenticação pronta, login ainda não implementado)

## Como rodar

1. Suba um PostgreSQL local (ou ajuste `DATABASE_URL`).
2. Copie `.env.example` para `.env` e ajuste os valores.
3. `npm install`
4. `npx prisma generate` (necessário sempre que `prisma/schema.prisma` mudar)
5. `npm run start:dev`

A API sobe com prefixo global `/api` (ex.: `GET /api/health`).

## Estrutura

Cada módulo de domínio segue o mesmo padrão: `*.module.ts`, `*.controller.ts`,
`*.service.ts` e uma pasta `dto/`. Ver o documento de migração para a
justificativa completa da arquitetura e a ordem recomendada de implementação
funcional de cada módulo.
