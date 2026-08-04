# Duplicação do Scraper — leadminer / leadminer-api

## Contexto

Existem hoje dois projetos com uma cópia própria do scraper:

- `leadminer` (este projeto — Next.js, em produção na Vercel)
- `leadminer-api` (projeto irmão em `../leadminer-api` — Express, ainda não implantado)

Os arquivos abaixo são **idênticos, byte a byte**, nos dois projetos (verificado por comparação direta):

- `src/scraper/maps.ts`
- `src/scraper/extract.ts`
- `src/scraper/service.ts`
- `src/storage/leads.ts`
- `src/models/lead.ts`

Essa duplicação é intencional por enquanto: o `leadminer-api` foi criado para eventualmente assumir o scraping fora do modelo serverless da Vercel (que tem limite de tempo de execução), mas ainda não está implantado em lugar nenhum nem conectado ao frontend. Até essa migração acontecer de fato, os dois projetos precisam se manter sincronizados manualmente.

## Qual projeto é a fonte principal

**`leadminer` é a fonte principal hoje.** É o único dos dois em produção — o frontend (`app/page.tsx`) consome as próprias rotas deste projeto (`/api/scraper`, `/api/leads`, `/api/export`), não o `leadminer-api`.

O `leadminer-api` é o destino planejado para o futuro (quando/se o scraping for migrado para fora da Vercel), mas até lá deve ser tratado como uma **cópia espelho**, não como fonte de mudanças.

## Arquivos duplicados

| Arquivo | Caminho em `leadminer` | Caminho em `leadminer-api` |
|---|---|---|
| maps.ts | `src/scraper/maps.ts` | `src/scraper/maps.ts` |
| extract.ts | `src/scraper/extract.ts` | `src/scraper/extract.ts` |
| service.ts | `src/scraper/service.ts` | `src/scraper/service.ts` |
| leads.ts | `src/storage/leads.ts` | `src/storage/leads.ts` |
| lead.ts | `src/models/lead.ts` | `src/models/lead.ts` |

Os caminhos relativos são idênticos entre os dois projetos, então nenhum import precisa ser ajustado ao copiar um arquivo de um lado para o outro.

## Como sincronizar alterações futuras

Não existe automação (sem symlink, sem pacote compartilhado, sem script de sync) — o processo é manual:

1. Faça a alteração primeiro em `leadminer` (fonte principal), em um dos 5 arquivos listados acima.
2. Copie o arquivo alterado, com o mesmo nome e mesmo caminho relativo, para `leadminer-api`.
3. Confirme que os dois arquivos voltaram a ficar idênticos (ex.: `diff` entre os dois caminhos).
4. Rode `npm run build` nos dois projetos antes de considerar a mudança concluída.

**Atenção:** se um dos dois lados for alterado sozinho, os projetos divergem silenciosamente — nenhum aviso automático existe hoje. Sempre que mexer em qualquer um dos 5 arquivos, tratar a réplica no outro projeto como parte da mesma tarefa, não como um passo opcional.
