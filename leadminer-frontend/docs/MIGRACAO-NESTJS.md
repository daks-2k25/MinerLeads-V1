# Plano de Migração — Backend Next.js → NestJS

> Documento técnico de análise e planejamento. **Nenhum código foi alterado para produzir este documento.** Objetivo: servir de base para revisão e decisão antes de qualquer implementação.

---

## 1. Resumo executivo

O LeadMiner hoje é um **monólito Next.js** (App Router) rodando na Vercel: o frontend (React) e o backend (rotas em `app/api/*`) vivem no mesmo projeto e compartilham código de domínio via `src/` (scraper Playwright, storage, modelos). Existe também um segundo projeto, `leadminer-api` (Express), criado como **espelho não conectado** — pensado para futuramente assumir o scraping fora do limite de execução da Vercel, mas hoje não implantado e não consumido por ninguém.

A migração proposta:
- Mantém o **frontend em Next.js**, convertendo-o em um cliente puro (SPA-like sobre App Router) que consome uma API HTTP externa.
- Consolida o backend em **um único serviço NestJS**, absorvendo tanto as rotas de `app/api/*` quanto o propósito original do `leadminer-api` (rodar o Playwright fora do modelo serverless).
- É a oportunidade natural para corrigir **duas inconsistências já existentes** no sistema atual (detalhadas na seção 2.7), que independem da migração mas afetam diretamente o desenho do novo backend.

Nenhuma funcionalidade hoje existente foi identificada como "fora de escopo" desta migração — o objetivo é paridade completa, com ganhos de robustez onde a análise apontou fragilidade.

---

## 2. Estado atual do sistema

### 2.1 Visão geral da arquitetura

```
leadminer/                     (Next.js — único projeto em produção)
├── app/
│   ├── page.tsx                → única tela da aplicação (dashboard de leads)
│   └── api/                    → 9 route handlers (backend atual)
├── hooks/                      → única camada que fala com a API (via fetch)
├── components/                 → puramente apresentacional (sem fetch direto)
├── src/                        → "domínio": scraper, storage, models
├── lib/leadStats.ts            → derivação de estatísticas (client-side, puro)
├── data/                       → leads.db (SQLite), leads.json, backups/
└── scripts/backup-db.ts        → script manual de backup do SQLite

leadminer-api/                  (Express — projeto irmão, NÃO implantado, NÃO conectado)
└── src/                        → cópia manual de 5 arquivos de leadminer/src/
```

O frontend nunca fala com `leadminer-api`. Ele é, na prática, um protótipo abandonado no meio do caminho — documentado em [`docs/SCRAPER-DUPLICADO.md`](./SCRAPER-DUPLICADO.md) como cópia espelho mantida manualmente (sem symlink, sem pacote compartilhado, sincronização por copiar-e-colar).

### 2.2 Inventário de funcionalidades (visão do usuário final)

| # | Funcionalidade | Onde vive hoje |
|---|---|---|
| 1 | Buscar empresas no Google Maps por termo/cidade/bairro/categoria, com progresso em tempo real | `POST /api/scraper` + `useScraperSearch` |
| 2 | Listar leads já capturados na sessão | `GET /api/leads` + `useLeads` |
| 3 | Exportar leads para Excel (.xlsx) com formatação (cabeçalho, larguras, autofiltro, congelamento de linha) | `POST /api/export` + `useExportLeads` |
| 4 | Salvar uma configuração de busca (nome + filtros) para reuso | `POST/GET /api/saved-searches` + `useSavedSearches` |
| 5 | Remover uma busca salva | `DELETE /api/saved-searches/:id` |
| 6 | Reaplicar filtros de uma busca salva no formulário | client-side (`handleSelecionarBuscaSalva`) |
| 7 | Histórico de buscas realizadas (auditoria) | `GET/POST /api/search-history` + `useSearchHistory` |
| 8 | Remover item do histórico | `DELETE /api/search-history/:id` |
| 9 | Repetir uma busca do histórico (preenche o formulário) | client-side (`handleRepetirHistorico`) |
| 10 | Exportar para Excel os leads de uma busca específica do histórico | `GET /api/search-history/:id/leads` + `POST /api/export` |
| 11 | Painel de estatísticas (total de leads, % com telefone, % com site, cidade em foco) | `lib/leadStats.ts` (100% client-side, não depende de API) |
| 12 | Detalhe de um lead em painel lateral | client-side, usa dado já carregado |
| 13 | Tema claro/escuro persistido em `localStorage` | client-side puro (`ThemeToggle`, script inline no `layout.tsx`) |
| 14 | Backup manual do banco SQLite | `scripts/backup-db.ts` (CLI, fora da aplicação web) |
| 15 | Log estruturado de execuções de scraping (info/warn/error) | `src/storage/logs.ts` — **gravado mas nunca lido/exposto** por nenhuma rota ou tela |

Não há autenticação, autorização, multi-usuário ou multi-tenant em nenhuma camada.

### 2.3 Inventário completo das rotas Next.js (`app/api`)

| Rota | Método | Função | Entrada | Saída |
|---|---|---|---|---|
| `/api/scraper` | `POST` | Executa scraping no Google Maps via Playwright, transmitindo progresso | `{ termoBusca, cidade, bairro, categoria }` | Stream NDJSON (`application/x-ndjson`) com eventos `status`, `resultado`, `erro` |
| `/api/leads` | `GET` | Lista leads acumulados na memória do processo | — | `Lead[]` |
| `/api/export` | `POST` | Gera arquivo `.xlsx` a partir de uma lista de leads | `Lead[]` | Binário `.xlsx` (`Content-Disposition: attachment`) |
| `/api/saved-searches` | `GET` | Lista buscas salvas (SQLite) | — | `SavedSearch[]` |
| `/api/saved-searches` | `POST` | Cria busca salva | `{ nome, termoBusca, cidade, bairro, categoria }` | `SavedSearch` (201) |
| `/api/saved-searches/[id]` | `DELETE` | Remove busca salva | `id` (path) | `{ ok: true }` |
| `/api/search-history` | `GET` | Lista histórico de buscas (em memória) | — | `SearchHistory[]` |
| `/api/search-history` | `POST` | Registra item de histórico manualmente | `{ termoBusca, cidade, bairro, categoria, quantidadeLeads }` | `SearchHistory` (201) |
| `/api/search-history/[id]` | `DELETE` | Remove item de histórico | `id` (path) | `{ ok: true }` |
| `/api/search-history/[id]/leads` | `GET` | Lista leads vinculados a uma busca do histórico | `id` (path) | `Lead[]` — **hoje sempre retorna objetos vazios `{}`, ver 2.7** |
| `/api/test-stream` | `POST` | Endpoint de demonstração de streaming NDJSON, sem uso real | — | Stream NDJSON com 3 mensagens fixas | 

O endpoint `/api/test-stream` não é chamado por nenhum hook/componente — é resíduo de prova de conceito e pode ser descartado na migração (não faz parte do escopo funcional).

### 2.4 Camada de domínio atual (`src/`)

| Arquivo | Responsabilidade | Observação relevante |
|---|---|---|
| `src/models/lead.ts`, `savedSearch.ts`, `searchHistory.ts` | Interfaces TypeScript (sem validação em runtime) | Puro tipo, sem decorators/validação |
| `src/scraper/maps.ts` | Abre Chromium (via `playwright-core` + `@sparticuz/chromium` em serverless), navega no Google Maps, faz scroll incremental e coleta cards de resultado | Contém muitos `console.log`/`console.time` de debug deixados no código |
| `src/scraper/extract.ts` | Extrai nome/telefone/site/endereço da página de detalhe de uma empresa via `page.evaluate` | Seletores acoplados ao DOM atual do Google Maps (frágil a mudanças do Google) |
| `src/scraper/service.ts` | Orquestra `maps.ts` + `extract.ts`, aplica limpeza de texto, emite progresso via callback `onStatus`, grava cada lead via `inserirLead` | Lock de concorrência via variável `let scrapingEmAndamento` **em memória do processo** |
| `src/storage/leads.ts` | CRUD de leads | **Array em memória (`let leads: Lead[] = []`)** — perde tudo a cada reinício/cold start |
| `src/storage/savedSearches.ts` | CRUD de buscas salvas | Usa `node:sqlite` (`DatabaseSync`), persiste em `data/leads.db`, tabela `saved_searches` |
| `src/storage/searchHistory.ts` | CRUD de histórico + vínculo busca↔leads | **Arrays em memória** (`historico`, `vinculos`) |
| `src/storage/logs.ts` | Registro de logs estruturados | **Array em memória**, nunca lido de volta |
| `src/storage/backup.ts` | Snapshot do SQLite (`node:sqlite` `backup()`) para `data/backups/`, mantém 7 mais recentes | Só cobre `data/leads.db` (ou seja, só protege `saved_searches` de fato) |
| `src/services/storage.ts` | Salva leads em `data/leads.json` | Usado apenas pelo script standalone `src/index.ts`, não pela aplicação web |
| `src/index.ts`, `scraper/test-browser.ts`, `scraper/test-maps.ts` | Scripts manuais de teste/depuração, executados via `tsx` | Não fazem parte do runtime da aplicação (não são chamados pelas rotas) |

### 2.5 O projeto `leadminer-api` (mirror não conectado)

- Framework: Express 5, TypeScript, `ts-node-dev`.
- Contém apenas os 5 arquivos espelhados (`maps.ts`, `extract.ts`, `service.ts`, `storage/leads.ts`, `models/lead.ts`) e duas rotas: `POST /api/scraper` (síncrona, sem streaming de progresso) e `GET /api/leads`.
- **Não possui**: export para Excel, saved searches, search history, logs, backup.
- **Não está implantado em lugar nenhum** e o frontend não faz nenhuma chamada a ele.
- Seu único valor para a migração é confirmar a intenção original da equipe: tirar o scraping do modelo serverless da Vercel (que tem limite de duração de execução) — exatamente o que a migração para NestJS resolve de forma definitiva e completa.

**Conclusão prática**: `leadminer-api` pode ser tratado como **descartável** — nenhuma lógica dele é mais completa ou mais atual que a de `leadminer/src`. O novo backend NestJS deve nascer a partir de `leadminer/src`, não de `leadminer-api`.

### 2.6 Frontend: hooks e dependência com o backend

Confirmado por busca em todo o projeto: **toda comunicação com a API passa exclusivamente pelos 6 hooks abaixo** (nenhum componente faz `fetch` diretamente).

| Hook | Rotas que consome | Particularidade técnica |
|---|---|---|
| `useLeads` | `GET /api/leads` | Simples |
| `useScraperSearch` | `POST /api/scraper` | **Consome `ReadableStream` manualmente** (`response.body.getReader()`), faz parsing de NDJSON linha a linha — é o ponto de maior acoplamento técnico ao formato de streaming atual |
| `useExportLeads` | `POST /api/export` | Lê `Content-Disposition` do response para nome do arquivo, cria blob e link de download no browser |
| `useExportHistoricoLeads` | `GET /api/search-history/:id/leads` → `POST /api/export` | Encadeia duas chamadas |
| `useSavedSearches` | `GET/POST /api/saved-searches`, `DELETE /api/saved-searches/:id` | CRUD simples com estado local otimista |
| `useSearchHistory` | `GET /api/search-history`, `DELETE /api/search-history/:id` | CRUD simples |

Todos os hooks usam **caminhos relativos** (`/api/...`), possível hoje porque frontend e backend compartilham origem. Ao separar em serviços distintos, isso passa a exigir uma **base URL configurável** (`NEXT_PUBLIC_API_URL` ou proxy/rewrite do Next.js) — é a única mudança estrutural necessária no frontend puramente por causa da separação física dos serviços.

Os `components/*` são 100% apresentacionais (recebem dados/callbacks via props) — nenhuma alteração é necessária neles pela migração de backend.

### 2.7 Achados relevantes (não documentados, descobertos na análise)

Estes pontos não são "opinião de arquitetura" — são comportamentos observáveis hoje que a migração deve decidir corrigir ou preservar conscientemente:

1. **Persistência real menor do que a modelagem existente sugere.** O arquivo `data/leads.db` contém um schema SQLite completo e populado (971 leads, 1 registro de histórico, 33 vínculos busca↔lead, 8 logs — dados de uma versão anterior do produto), incluindo tabelas `leads`, `search_history`, `search_history_leads` e `logs`. **Porém o código-fonte atual não usa mais essas tabelas**: `storage/leads.ts`, `storage/searchHistory.ts` e `storage/logs.ts` foram (em algum momento) trocados para arrays em memória. Só `saved_searches` ainda usa SQLite de fato. Na prática, hoje: **leads, histórico de buscas e logs são perdidos a cada reinício do servidor/cada cold start da Vercel.** Isso é uma regressão funcional silenciosa em relação ao schema existente, independente da migração — mas a migração é o momento natural para resolvê-la, retomando persistência real para essas três entidades.
2. **Bug funcional em "exportar leads do histórico".** `listarLeadsDaBusca()` em `src/storage/searchHistory.ts` retorna `ids.map(() => ({} as Lead))` — ou seja, sempre devolve objetos de lead **vazios**, nunca os dados reais. A funcionalidade #10 da tabela de 2.2 (exportar Excel a partir de uma busca do histórico) está quebrada em produção hoje. Consequência direta do ponto 1: como leads vivem só em memória, não há de onde buscar os dados reais pelo `id` salvo no vínculo.
3. **Lock de concorrência de scraping é local ao processo.** `buscaEmAndamento` (rota) e `scrapingEmAndamento` (serviço) são variáveis `let` em memória — funcionam apenas enquanto houver exatamente uma instância do processo rodando. Em ambiente serverless com múltiplas instâncias (ou no futuro, um NestJS com mais de uma réplica), esse lock **não impede** duas buscas simultâneas de fato.
4. **Nenhuma autenticação/autorização em nenhuma rota.** Todas as 9 rotas atuais são públicas. Se o backend NestJS for exposto publicamente, isso deve ser uma decisão explícita, não um "herdado por acidente".
5. **Nenhum teste automatizado e nenhum CI** foram encontrados em nenhum dos dois projetos (`leadminer`, `leadminer-api`). A migração parte de cobertura zero.
6. **Acoplamento a `node:sqlite`**, API nativa do Node ainda recente/experimental (disponível via flag/versão específica do Node). NestJS não tem restrição de rodar sobre a mesma API, mas é um ponto a decidir conscientemente (ver seção 3.3).
7. **Seletores do scraper acoplados ao DOM do Google Maps** (`[data-item-id^="phone:"]`, `[role="article"]`, etc.) — não é um problema de arquitetura, mas é um risco de manutenção que atravessa a migração inalterado (o scraper é reaproveitado quase como está).
8. **Scraper duplicado propositalmente** entre os dois projetos (seção 2.5), hoje já divergente pelo simples fato de nenhuma sincronização ter sido garantida por ferramenta alguma além de um documento manual.

---

## 3. Arquitetura proposta — Backend NestJS

### 3.1 Visão geral

```
leadminer-backend/                      (NestJS — substitui app/api/* e leadminer-api)
├── src/
│   ├── main.ts                         → bootstrap, CORS, ValidationPipe global, prefix /api
│   ├── app.module.ts
│   ├── config/                         → ConfigModule (env vars tipadas)
│   ├── database/                       → conexão TypeORM/Prisma + migrations
│   ├── leads/                          → módulo: entidade + CRUD de leads
│   ├── scraper/                        → módulo: orquestração Playwright + progresso
│   ├── saved-searches/                 → módulo: CRUD de buscas salvas
│   ├── search-history/                 → módulo: histórico + vínculo com leads
│   ├── export/                         → módulo: geração de .xlsx
│   ├── logs/                           → módulo: logging estruturado persistido
│   └── common/                         → filtros de exceção, interceptors, pipes compartilhados
├── test/                               → e2e (novo — não existia)
└── package.json
```

Módulos são organizados por **domínio de negócio** (padrão NestJS recomendado), não por camada técnica — cada pasta acima é um `@Module` com seu próprio `Controller`, `Service`, DTOs e (quando aplicável) `Entity`.

### 3.2 Módulos, controllers, services, DTOs e entidades

#### `LeadsModule`
- **Entity** `Lead` (TypeORM): `id, nome, telefone, website, endereco, cidade, categoria, urlMaps (unique), capturadoEm` — mapeamento direto do schema já existente em `data/leads.db.leads`.
- **Controller** `LeadsController`: `GET /leads` (lista, com paginação opcional a decidir), `GET /leads/:id`.
- **Service** `LeadsService`: `create`, `bulkCreate` (usado pelo scraper), `findAll`, `findByUrlMaps(urls: string[])` (substitui `buscarIdsPorUrlMaps`), `findByIds`.
- **DTO**: `LeadDto` (response); criação de leads não é feita via input externo do usuário (só internamente pelo scraper), então não precisa de `CreateLeadDto` público.

#### `ScraperModule`
- **Controller** `ScraperController`: `POST /scraper` — inicia busca e retorna progresso.
- **Service** `ScraperService`: orquestra (equivalente a `executarScraping`), delega para:
  - `MapsGateway`/`GoogleMapsService` (equivalente a `maps.ts`): controla o Playwright/Chromium.
  - `ExtractService` (equivalente a `extract.ts`): parsing de dados da página de detalhe.
- **DTO** `StartScraperDto`: `{ termoBusca: string; cidade?: string; bairro?: string; categoria?: string }` com `class-validator` (`@IsString`, `@IsNotEmpty` em `termoBusca`) — primeira validação real de input que o projeto passa a ter.
- **Concorrência**: substituir a variável `let` em memória por um lock real (ver 3.5).
- **Progresso em tempo real**: ver 3.4 para a decisão de transporte (SSE recomendado).

#### `SavedSearchesModule`
- **Entity** `SavedSearch`: `id, nome, termoBusca, cidade, bairro, categoria, criadoEm` — mapeamento direto de `saved_searches` (única tabela já persistida corretamente hoje).
- **Controller**: `GET /saved-searches`, `POST /saved-searches`, `DELETE /saved-searches/:id`.
- **Service**: `create`, `findAll`, `remove`.
- **DTO**: `CreateSavedSearchDto` (`nome`, `termoBusca` obrigatórios; `cidade`, `bairro`, `categoria` opcionais).

#### `SearchHistoryModule`
- **Entity** `SearchHistory`: `id, termoBusca, cidade, bairro, categoria, quantidadeLeads, criadoEm`.
- **Entity** `SearchHistoryLead` (tabela de junção, já existe no schema legado `search_history_leads`): `searchHistoryId, leadId`.
- **Controller**: `GET /search-history`, `POST /search-history`, `DELETE /search-history/:id`, `GET /search-history/:id/leads`.
- **Service**: `register`, `findAll`, `remove`, `linkLeads(searchHistoryId, leadIds)`, `findLeadsByHistoryId` — **esta última corrige o bug do ponto 2.7.2**, fazendo join real com `LeadsService`/repositório de leads em vez de devolver objetos vazios.
- **DTO**: `RegisterSearchHistoryDto`.

#### `ExportModule`
- **Controller**: `POST /export` — recebe `Lead[]`, devolve stream/buffer `.xlsx`.
- **Service** `ExportService`: reaproveita quase 1:1 a lógica de `app/api/export/route.ts` (ExcelJS), extraída para um método puro `gerarPlanilha(leads: Lead[]): Promise<Buffer>`.
- **DTO**: `ExportLeadsDto` (array de `LeadDto`).

#### `LogsModule`
- **Entity** `Log`: `id, nivel, origem, mensagem, contexto (json), buscaId?, criadoEm` — mapeamento do schema legado `logs`.
- **Service** `LogsService`: `registrar(nivel, origem, mensagem, contexto?, buscaId?)`, injetado nos outros módulos (scraper principalmente) em vez de import direto de função solta.
- Sem necessidade de controller HTTP inicialmente (uso interno), mas fica pronto para expor `GET /logs` no futuro caso vire painel de auditoria.

#### `DatabaseModule` / `ConfigModule` (infraestrutura)
- `ConfigModule` (`@nestjs/config`): tipagem de `PORT`, `DATABASE_PATH`/`DATABASE_URL`, `CORS_ORIGIN`, `NODE_ENV`.
- `TypeOrmModule` (ou Prisma — decisão em aberto, ver seção 8) configurado a partir do `ConfigModule`.

### 3.3 Persistência de dados

Recomendação: **unificar tudo em SQLite via ORM** (TypeORM ou Prisma — ver decisão pendente na seção 8), abandonando `node:sqlite` cru e as três storages em memória.

- O schema já existe e está validado em produção (`data/leads.db`): `leads`, `saved_searches`, `search_history`, `search_history_leads`, `logs`. A migração deve **gerar entidades a partir desse schema**, não recriar do zero — isso preserva os 971 leads e demais dados legados já presentes no arquivo.
- Ganho imediato sobre o estado atual: leads, histórico e logs passam a sobreviver a reinícios (corrige 2.7.1) e o export do histórico volta a funcionar de verdade (corrige 2.7.2).
- SQLite continua adequado para o volume atual (single-writer, baixo volume, deploy simples), mas como o novo backend deixa de ser serverless (roda em processo Node persistente), fica aberta a porta para Postgres se o produto crescer — o ORM torna essa troca um detalhe de configuração, não uma reescrita.
- `scripts/backup-db.ts` é reaproveitável quase sem alteração, adaptado para o caminho de banco do NestJS.

### 3.4 Progresso do scraping em tempo real

Hoje: NDJSON sobre `ReadableStream` bruto do Web Fetch API (Next.js Route Handler). Em NestJS, as opções equivalentes são:

- **Server-Sent Events (SSE)** — nativo no NestJS (`@Sse()` decorator, `Observable`), transporte HTTP simples, unidirecional (servidor → cliente), mesma semântica de "stream de eventos" que já existe hoje. **Recomendado**: é a migração mais direta do comportamento atual, exige a menor mudança no hook `useScraperSearch` (troca o parsing manual de NDJSON por `EventSource`, ou mantém-se NDJSON puro sobre um endpoint de streaming manual do Nest, que também é suportado).
- **WebSocket** (`@nestjs/websockets`) — mais poderoso (bidirecional), mas overhead desnecessário para um fluxo que é puramente servidor→cliente.

Recomendação: manter o formato de evento (`status`/`resultado`/`erro`) e migrar o transporte para SSE, ajustando `useScraperSearch` para usar `EventSource` (mais simples e resiliente que o parsing manual de NDJSON atual).

### 3.5 Scraper como serviço (Playwright) e concorrência

- A lógica de `maps.ts` e `extract.ts` é **framework-agnostic** hoje (não depende de Next.js) — vira um `Service` do NestJS com poucas adaptações (injeção de dependência, remoção dos `console.log` de debug em favor do `Logger` nativo do Nest).
- Como o backend deixa de rodar em modelo serverless, o desvio via `@sparticuz/chromium` (necessário só para contornar limitações da Vercel) deixa de ser estritamente necessário — pode-se rodar Playwright com Chromium completo direto no container/VM. Isso simplifica `maps.ts`, mas **não é obrigatório fazer essa simplificação na mesma etapa** da migração (ver plano, seção 4).
- Concorrência: substituir a flag em memória por um mecanismo real de lock — na primeira versão, um lock simples em memória **é aceitável se o backend rodar como instância única** (decisão de infraestrutura, não só de código); se houver múltiplas réplicas, precisa de lock distribuído (ex.: registro "em andamento" na própria tabela `search_history`/`logs`, ou Redis). Recomenda-se decidir isso junto da escolha de hospedagem (seção 6/8).

### 3.6 Configuração, CORS e ambiente

- `main.ts` habilita CORS explicitamente para o domínio do frontend Next.js (hoje implícito, pois same-origin).
- `ValidationPipe` global (`whitelist: true, forbidNonWhitelisted: true`) — passa a validar todo input, o que hoje não existe (as rotas atuais fazem apenas checagens manuais de campo obrigatório).
- Variáveis de ambiente: `PORT`, `DATABASE_PATH`, `CORS_ORIGIN`, `NODE_ENV` — expandindo o único `.env` atual (`PORT`) do `leadminer-api`.

### 3.7 Frontend (Next.js) — impacto da separação

- Hooks continuam a mesma API pública (assinatura/retorno), só trocam a URL base de `/api/...` para `${NEXT_PUBLIC_API_URL}/api/...` (ou usar `next.config.ts` → `rewrites()` para manter os caminhos relativos, evitando tocar nos hooks).
- `useScraperSearch` é o único hook que exige mudança de lógica (não só de URL) caso se adote SSE em vez de NDJSON bruto (seção 3.4).
- Componentes: nenhuma alteração.
- `app/api/*` inteiro é removido do projeto Next.js ao final da migração.

---

## 4. Plano de migração em etapas (menor → maior complexidade)

| Etapa | Escopo | Complexidade | Por quê nessa ordem |
|---|---|---|---|
| **0** | Decisões de infraestrutura: ORM (TypeORM vs Prisma), hospedagem do NestJS, estratégia de lock de concorrência (seção 8) | — | Pré-requisito; evita retrabalho nas etapas seguintes |
| **1** | Bootstrap do projeto NestJS vazio + `ConfigModule` + `DatabaseModule` conectado a uma cópia de `data/leads.db`, com entidades geradas a partir do schema existente | Baixa | Não depende de nenhuma outra funcionalidade; valida a base de persistência antes de portar lógica de negócio |
| **2** | `SavedSearchesModule` completo (CRUD) | Baixa | Domínio mais simples do sistema, sem dependência de outros módulos, já usa SQLite hoje — bom teste de fumaça ponta a ponta (frontend → NestJS → SQLite) |
| **3** | `LeadsModule` (somente leitura: `findAll`) + `ExportModule` | Baixa/Média | `ExportModule` é uma função pura (ExcelJS) sem estado; só depende de receber uma lista de leads |
| **4** | `LogsModule` | Baixa | Sem dependentes externos ainda; prepara infraestrutura de logging para o `ScraperModule` |
| **5** | `SearchHistoryModule` (CRUD básico, sem o vínculo com leads ainda) | Média | Depende de `LeadsModule` existir, mas não do scraper |
| **6** | `ScraperModule` (scraping síncrono, sem streaming de progresso ainda; grava leads via `LeadsModule`) | Média/Alta | Maior peça de lógica de negócio (Playwright); isolar a complexidade do streaming permite validar a extração de dados primeiro |
| **7** | Progresso em tempo real (SSE) no `ScraperModule` + ajuste do hook `useScraperSearch` no frontend | Alta | Depende do scraper síncrono já funcionar; é a parte de maior mudança de contrato entre frontend e backend |
| **8** | Vínculo `SearchHistory` ↔ `Leads` (`linkLeads`/`findLeadsByHistoryId`) — **corrige o bug 2.7.2** | Média | Depende de `ScraperModule` (etapa 6/7) e `LeadsModule` (etapa 3) estarem prontos |
| **9** | Corte do frontend: apontar todos os hooks para o novo backend, remover `app/api/*` do projeto Next.js | Média | Só é seguro depois que todas as rotas tiverem equivalente funcional completo no NestJS |
| **10** | Descomissionar `leadminer-api` (Express) definitivamente | Baixa | Sem dependentes; pode ser feito a qualquer momento após a etapa 0, mas faz sentido simbolicamente encerrar a migração aqui |
| **11** (opcional) | Concorrência real (lock distribuído) e simplificação do Playwright (remover fallback `@sparticuz/chromium` se a hospedagem não for mais serverless) | Média | Só necessário se a etapa 0 definir hospedagem com múltiplas réplicas |

Cada etapa é entregável e testável isoladamente — o frontend pode continuar apontando para as rotas antigas do Next.js até a etapa 9, permitindo migração incremental sem downtime.

---

## 5. Reaproveitamento de arquivos

### 5.1 Reaproveitáveis sem alteração (frontend)

Todos os `components/*` (21 arquivos) — são puramente apresentacionais, não têm nenhum acoplamento a como os dados chegam.

Também sem alteração: `lib/leadStats.ts` (função pura, não fala com API), `types/company.ts` (não usado atualmente pelo fluxo real, avaliar se ainda é necessário — ver observação em 5.4).

### 5.2 Reaproveitáveis com pequenos ajustes

| Arquivo | Ajuste necessário |
|---|---|
| `src/scraper/maps.ts` | Remover `console.log`/`console.time` de debug, trocar por `Logger` do Nest; opcionalmente simplificar detecção de ambiente serverless (depende da etapa 0/11) |
| `src/scraper/extract.ts` | Nenhum ajuste funcional — só adaptação de import ao mover de pasta |
| `src/models/lead.ts`, `savedSearch.ts`, `searchHistory.ts` | Viram base para `Entity` (TypeORM) e `Dto` (class-validator) — a interface em si se mantém, ganha decorators |
| `app/api/export/route.ts` (lógica ExcelJS) | Extrair o corpo da função para um `ExportService.gerarPlanilha()` puro — a lógica de geração da planilha em si não muda |
| Todos os 6 hooks (`hooks/*.ts`) | Só a URL base muda (ou nada, se usado `rewrites()` do Next.js); `useScraperSearch` também muda o parsing se adotado SSE (seção 3.4) |
| `scripts/backup-db.ts` | Adaptar caminho do banco para o novo backend, mover para dentro do projeto NestJS |

### 5.3 Precisam reescrita completa

| Arquivo atual | Motivo |
|---|---|
| `app/api/scraper/route.ts` | Vira `ScraperController` + `ScraperService`; lógica de streaming muda de `ReadableStream` bruto para SSE/Nest |
| `app/api/leads/route.ts`, `saved-searches/*`, `search-history/*` | Viram Controllers NestJS com DTOs e injeção de dependência — estrutura de rota muda completamente mesmo que a regra de negócio seja simples |
| `src/storage/leads.ts` | Troca de array em memória para `Repository<Lead>` (TypeORM) |
| `src/storage/searchHistory.ts` | Troca de arrays em memória para entidades reais + correção do bug de `listarLeadsDaBusca` |
| `src/storage/savedSearches.ts` | Troca de `node:sqlite` cru para `Repository<SavedSearch>` (TypeORM) — regra de negócio idêntica, camada de acesso a dados muda |
| `src/storage/logs.ts` | Troca de array em memória para `Repository<Log>` |
| `src/scraper/service.ts` | Reescrito como `ScraperService` com injeção de `LeadsService`, `LogsService`, `SearchHistoryService`; lock de concorrência revisado |
| `leadminer-api/*` (projeto inteiro) | Descartado — nenhuma lógica sua é mais nova que `leadminer/src`; não é ponto de partida para nada |
| `app/api/test-stream/route.ts` | Não portado (endpoint de demonstração sem uso real) |

### 5.4 A confirmar com o usuário

- `types/company.ts` (interface `Company`) não é referenciado em nenhum fluxo ativo encontrado na análise — parece resíduo de uma versão anterior do modelo de dados (antes de `Lead`). Sinalizar para remoção ou justificar uso antes de portar.
- `src/services/storage.ts`, `src/index.ts` e os scripts em `scraper/test-*.ts` são utilitários de desenvolvimento/depuração, não integrados à aplicação web — confirmar se devem ser portados como scripts de apoio no novo repositório ou descartados.

---

## 6. Riscos da migração

| Risco | Impacto | Mitigação sugerida |
|---|---|---|
| **Mudança de modelo de hospedagem.** O backend deixa de ser serverless (Vercel Functions) e passa a exigir um processo Node persistente (Docker/VM/PaaS) para rodar Playwright sem o limite de duração de execução que motivou a criação do `leadminer-api`. | Alto — é uma decisão de infraestrutura nova, com custo operacional que hoje não existe (nada a manter/monitorar além da Vercel) | Definir provedor (Railway, Render, Fly.io, VPS próprio, etc.) na etapa 0 do plano, antes de escrever código |
| **Perda de dados durante a migração de storage em memória → persistente.** Leads/histórico/logs atualmente vivem só em memória; qualquer erro na migração do schema pode não ser percebido (não há "antes" persistido para comparar, exceto o `leads.db` legado com 971 registros) | Médio | Etapa 1 do plano trata a migração de schema isoladamente, com validação manual dos dados legados antes de seguir |
| **Regressão silenciosa no parsing de streaming.** O hook `useScraperSearch` faz parsing manual de NDJSON; ao trocar para SSE, um erro de formatação pode quebrar a barra de progresso sem quebrar a busca em si (silencioso) | Médio | Testar manualmente o fluxo de progresso ponta a ponta na etapa 7 antes de remover o NDJSON antigo |
| **Fragilidade do scraper a mudanças no DOM do Google Maps.** Não é introduzido pela migração, mas atravessa para o novo backend sem alteração — qualquer mudança no Google Maps quebra a extração igualmente nos dois modelos | Médio (pré-existente) | Fora do escopo desta migração; registrar como débito técnico à parte |
| **Ausência total de testes automatizados hoje.** A migração corre o risco de reintroduzir os mesmos bugs (ex.: 2.7.2) sem perceber, por falta de rede de segurança | Médio | Escrever ao menos testes e2e básicos por módulo à medida que cada etapa do plano é implementada, não só ao final |
| **CORS e exposição pública de uma API antes fechada por same-origin.** Separar frontend/backend fisicamente expõe a API a partir de qualquer origem se CORS não for configurado com cuidado | Baixo/Médio | Configurar `CORS_ORIGIN` restrito ao domínio do frontend desde o `main.ts` inicial (etapa 1) |
| **Concorrência de scraping em ambiente com múltiplas réplicas.** O lock atual (variável em memória) já é frágil hoje; se a nova hospedagem escalar horizontalmente, duas buscas simultâneas podem rodar sem bloqueio nenhum | Baixo hoje, cresce com escala | Se a etapa 0 decidir por múltiplas réplicas, tratar lock distribuído como pré-requisito da etapa 6, não como melhoria futura |
| **`leadminer-api` divergente sendo confundido com fonte de verdade.** Alguém pode, por engano, portar lógica do projeto Express achando que é mais atual | Baixo | Este documento e o `docs/SCRAPER-DUPLICADO.md` deixam explícito que `leadminer/src` é a única fonte válida |
| **Chromium/Playwright em novo ambiente de hospedagem.** Sair do binário serverless (`@sparticuz/chromium`) para um Chromium completo em container exige garantir dependências de sistema (fontes, libs gráficas) no Dockerfile | Médio | Validar imagem Docker com Playwright completo (imagem oficial `mcr.microsoft.com/playwright`) antes de descartar o fallback serverless |

---

## 7. Resumo visual — o que muda vs. o que não muda

```
NÃO MUDA                              MUDA
─────────────────────                 ─────────────────────
components/*                          app/api/* → NestJS Controllers
lib/leadStats.ts                      src/storage/* (memória/sqlite cru) → TypeORM
Lógica de scraping (Maps/Extract)     src/scraper/service.ts → ScraperService + DI
Lógica de geração de Excel            Transporte de progresso (NDJSON → SSE)
Formato dos dados (Lead, SavedSearch, Concorrência de scraping (lock local → real)
  SearchHistory)                      Hospedagem (serverless → processo persistente)
Fluxo de telas / UX                   leadminer-api (descartado)
```

---

## 8. Decisões em aberto (para o usuário definir antes da etapa 0)

1. **ORM**: TypeORM ou Prisma? (ambos suportam SQLite; TypeORM tem integração "oficial" mais direta com NestJS via `@nestjs/typeorm`, Prisma tem DX/type-safety mais forte mas exige camada extra de integração)
2. **Hospedagem do backend NestJS**: PaaS gerenciado (Railway/Render/Fly.io) vs. VM própria vs. container em nuvem própria (AWS/GCP)?
3. **Transporte de progresso do scraper**: confirmar SSE como direção, ou preferência por manter NDJSON bruto sobre um endpoint de streaming manual do Nest (também suportado, muda menos o hook)?
4. **Banco de dados**: manter SQLite (adequado ao volume atual) ou já migrar para Postgres nesta mesma iniciativa (mais trabalho agora, evita segunda migração depois)?
5. **Autenticação**: fica fora de escopo desta migração (API pública, como hoje) ou é o momento de introduzir alguma proteção mínima já que o backend passa a ser publicamente endereçável fora do guarda-chuva da Vercel?
6. **`types/company.ts` e scripts de depuração** (seção 5.4): descartar ou preservar?

Este documento não assume respostas para essas perguntas — a arquitetura proposta na seção 3 é compatível com qualquer combinação de escolhas acima, mas o plano de etapas (seção 4) deve ser ajustado depois que forem respondidas.
