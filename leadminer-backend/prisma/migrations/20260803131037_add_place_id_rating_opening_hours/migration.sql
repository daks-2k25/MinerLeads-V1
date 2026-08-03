-- CreateEnum
CREATE TYPE "SearchStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('info', 'warn', 'error');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" SERIAL NOT NULL,
    "place_id" TEXT NOT NULL,
    "nome" TEXT,
    "telefone" TEXT,
    "website" TEXT,
    "endereco" TEXT,
    "cidade" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "url_maps" TEXT NOT NULL,
    "rating" DOUBLE PRECISION,
    "opening_hours" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "capturado_em" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_searches" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "termo_busca" TEXT NOT NULL,
    "cidade" TEXT,
    "bairro" TEXT,
    "categoria" TEXT,
    "user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_history" (
    "id" SERIAL NOT NULL,
    "termo_busca" TEXT NOT NULL,
    "cidade" TEXT,
    "bairro" TEXT,
    "categoria" TEXT,
    "quantidade_leads" INTEGER NOT NULL,
    "status" "SearchStatus" NOT NULL DEFAULT 'PENDING',
    "erro_mensagem" TEXT,
    "user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_history_leads" (
    "search_history_id" INTEGER NOT NULL,
    "lead_id" INTEGER NOT NULL,

    CONSTRAINT "search_history_leads_pkey" PRIMARY KEY ("search_history_id","lead_id")
);

-- CreateTable
CREATE TABLE "logs" (
    "id" SERIAL NOT NULL,
    "nivel" "LogLevel" NOT NULL,
    "origem" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "contexto" JSONB,
    "busca_id" INTEGER,
    "user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "leads_place_id_key" ON "leads"("place_id");

-- CreateIndex
CREATE INDEX "leads_cidade_idx" ON "leads"("cidade");

-- CreateIndex
CREATE INDEX "leads_categoria_idx" ON "leads"("categoria");

-- CreateIndex
CREATE INDEX "leads_ativo_idx" ON "leads"("ativo");

-- CreateIndex
CREATE INDEX "saved_searches_user_id_idx" ON "saved_searches"("user_id");

-- CreateIndex
CREATE INDEX "search_history_user_id_idx" ON "search_history"("user_id");

-- CreateIndex
CREATE INDEX "search_history_status_idx" ON "search_history"("status");

-- CreateIndex
CREATE INDEX "search_history_leads_lead_id_idx" ON "search_history_leads"("lead_id");

-- CreateIndex
CREATE INDEX "logs_busca_id_idx" ON "logs"("busca_id");

-- CreateIndex
CREATE INDEX "logs_created_at_idx" ON "logs"("created_at");

-- CreateIndex
CREATE INDEX "logs_user_id_idx" ON "logs"("user_id");

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_history_leads" ADD CONSTRAINT "search_history_leads_search_history_id_fkey" FOREIGN KEY ("search_history_id") REFERENCES "search_history"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_history_leads" ADD CONSTRAINT "search_history_leads_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_busca_id_fkey" FOREIGN KEY ("busca_id") REFERENCES "search_history"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
