-- AlterTable
ALTER TABLE "search_history" ADD COLUMN     "quantidade_cache" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quantidade_novos" INTEGER NOT NULL DEFAULT 0;
