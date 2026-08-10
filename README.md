<div align="center">

<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=0:0D0D0D,50:6B0000,100:FF0000&height=180&section=header&animation=fadeIn" alt="header banner"/>

<sub><code>daks-2k25@github:~$ cd MinerLeads-V1 && cat README.md</code></sub>

<img src="./1x/FULL%20DARK.png" alt="LeadMiner" width="380" />

### Prospecção de leads B2B a partir do Google Maps.
Busca, organiza, enriquece e exporta oportunidades comerciais reais — sem depender de uma API paga.

<img width="100%" src="https://capsule-render.vercel.app/api?type=rect&color=0:0D0D0D,50:8B0000,100:0D0D0D&height=2"/>

<img src="https://img.shields.io/badge/Next.js%2016-0D0D0D?style=for-the-badge&logo=nextdotjs&logoColor=FF3B30" alt="Next.js"/>
<img src="https://img.shields.io/badge/React%2019-0D0D0D?style=for-the-badge&logo=react&logoColor=FF3B30" alt="React"/>
<img src="https://img.shields.io/badge/TypeScript-0D0D0D?style=for-the-badge&logo=typescript&logoColor=FF3B30" alt="TypeScript"/>
<img src="https://img.shields.io/badge/NestJS-0D0D0D?style=for-the-badge&logo=nestjs&logoColor=FF3B30" alt="NestJS"/>
<img src="https://img.shields.io/badge/Prisma-0D0D0D?style=for-the-badge&logo=prisma&logoColor=FF3B30" alt="Prisma"/>
<img src="https://img.shields.io/badge/PostgreSQL-0D0D0D?style=for-the-badge&logo=postgresql&logoColor=FF3B30" alt="PostgreSQL"/>
<img src="https://img.shields.io/badge/Playwright-0D0D0D?style=for-the-badge&logo=playwright&logoColor=FF3B30" alt="Playwright"/>

<img src="https://img.shields.io/badge/STATUS-V1_EM_DESENVOLVIMENTO-0D0D0D?style=for-the-badge&labelColor=0D0D0D&color=FF0000" alt="status"/>
<a href="https://github.com/daks-2k25/MinerLeads-V1"><img src="https://img.shields.io/badge/REPOSITÓRIO-0D0D0D?style=for-the-badge&logo=github&logoColor=FF3B30" alt="repositório"/></a>

**[`Sobre`](#sobre-o-projeto) · [`Funcionalidades`](#funcionalidades) · [`Screenshots`](#screenshots) · [`Arquitetura`](#arquitetura) · [`Stack`](#tech-stack) · [`Como funciona`](#como-funciona) · [`Instalação`](#instalação-local) · [`Deploy`](#deploy) · [`Roadmap`](#roadmap)**

</div>

<img width="100%" src="https://capsule-render.vercel.app/api?type=rect&color=0:0D0D0D,50:8B0000,100:0D0D0D&height=3"/>

## Sobre o projeto
<sub><code>$ cat about.md</code></sub>

**LeadMiner** é uma plataforma de prospecção comercial que captura leads B2B reais a partir de dados públicos do Google Maps. Em vez de depender de uma API paga (Google Places), o backend automatiza um navegador (Playwright + Chromium) para buscar empresas por termo, cidade, bairro e categoria, extrair nome, telefone, site/rede social e endereço, e organizar tudo numa lista pronta para prospecção.

**Para quem é**: times comerciais, agências e profissionais de vendas B2B que precisam montar listas de prospecção segmentadas por localização e nicho, sem pagar por uma API de dados comerciais.

**Problema que resolve**: montar uma lista de leads qualificados manualmente (empresa por empresa, aba por aba do Google Maps) é lento e repetitivo. O LeadMiner faz essa coleta de forma automatizada, evita recapturar a mesma empresa duas vezes (cache por identificador único) e entrega os dados prontos para exportação.

**Como funciona, em uma frase**: o usuário define os filtros de busca no frontend, o backend controla um Chromium headless que navega e coleta os resultados do Google Maps, os dados são persistidos num banco Postgres e ficam disponíveis na interface — com histórico, buscas salvas e exportação para Excel.

<img width="100%" src="https://capsule-render.vercel.app/api?type=rect&color=0:0D0D0D,50:8B0000,100:0D0D0D&height=3"/>

## Funcionalidades
<sub><code>$ ls -la features/</code></sub>

Cada item abaixo foi confirmado diretamente no código — nada listado aqui é aspiracional.

| | |
|---|---|
| 🔎 **Busca de leads** | Busca empresas no Google Maps por termo, cidade, bairro e categoria, com scraping automatizado (Playwright). |
| 🧠 **Deduplicação & cache** | Cada empresa é identificada por um `placeId` único; empresas já capturadas antes são reconhecidas como cache em vez de reprocessadas do zero. |
| 📊 **Dashboard** | Métricas agregadas: total de leads, leads novos, total de pesquisas, leads reaproveitados do cache. |
| 📋 **Histórico de buscas** | Lista as buscas já realizadas, com opção de repetir os mesmos filtros ou exportar os leads daquela busca específica. |
| ⭐ **Buscas salvas** | Salva uma combinação de filtros (termo, cidade, bairro, categoria) para reexecutar depois com um clique. |
| 📥 **Exportação para Excel** | Gera uma planilha `.xlsx` formatada (cabeçalho, autofiltro, largura de coluna automática) com os leads da lista atual. |
| ⏹️ **Cancelamento de busca** | Uma busca em andamento pode ser cancelada sem perder os leads já capturados até aquele ponto. |
| 📱 **Instagram / Facebook** | Quando o "site" cadastrado da empresa no Maps é um perfil social, o link real do perfil é capturado — não apenas o rótulo genérico. |
| 🌓 **Dark / Light mode** | Tema persistente (localStorage), sem flash do tema errado no carregamento. |
| ⚡ **Tabela virtualizada** | A lista de leads renderiza apenas as linhas visíveis, mantendo performance com centenas de resultados na tela. |
| 🔐 **Autenticação** | 🚧 Estrutura pronta (JWT + Passport, guard e DTOs implementados), mas login **ainda não está ativo** — hoje a API não exige autenticação. |

<img width="100%" src="https://capsule-render.vercel.app/api?type=rect&color=0:0D0D0D,50:8B0000,100:0D0D0D&height=3"/>

## Screenshots
<sub><code>$ ls screenshots/</code></sub>

Capturas reais da aplicação rodando localmente, com dados reais já processados pelo scraper (tema escuro).

<div align="center">

**Dashboard** — métricas agregadas de leads, pesquisas e cache
<img src="docs/screenshots/dashboard.png" alt="Dashboard do LeadMiner" width="100%"/>

<br/><br/>

**Busca de leads** — filtros por termo, cidade, bairro e categoria
<img src="docs/screenshots/search.png" alt="Tela de busca do LeadMiner" width="100%"/>

<br/><br/>

**Listagem de leads** — resultados reais capturados do Google Maps
<img src="docs/screenshots/leads.png" alt="Listagem de leads do LeadMiner" width="100%"/>

<br/><br/>

**Detalhes do lead** — inclui o link real de Instagram capturado, não apenas o rótulo
<img src="docs/screenshots/lead-details.png" alt="Painel de detalhes de um lead" width="100%"/>

<br/><br/>

**Histórico de buscas** — buscas anteriores, com filtro por período
<img src="docs/screenshots/history.png" alt="Histórico de buscas do LeadMiner" width="100%"/>

</div>

<sub>Outras telas (modal de busca salva, tema claro) ficam para uma próxima atualização.</sub>

<img width="100%" src="https://capsule-render.vercel.app/api?type=rect&color=0:0D0D0D,50:8B0000,100:0D0D0D&height=3"/>

## Arquitetura
<sub><code>$ ./architecture.sh</code></sub>

```mermaid
%%{init: {'theme':'base', 'themeVariables': {
  'primaryColor': '#1a0505',
  'primaryTextColor': '#e8e8e8',
  'primaryBorderColor': '#ff3b30',
  'lineColor': '#ff3b30',
  'secondaryColor': '#0d0d0d',
  'tertiaryColor': '#0d0d0d',
  'background': '#0d0d0d',
  'mainBkg': '#1a0505',
  'textColor': '#e8e8e8'
}}}%%
flowchart TD
    U["Usuário"] -->|HTTPS| FE["Frontend — Next.js<br/>(Vercel)"]
    FE -->|"REST API · fetch + CORS"| BE["Backend — NestJS<br/>(VPS)"]
    BE -->|Playwright| CH["Chromium headless"]
    CH -->|scraping| GM["Google Maps"]
    BE -->|"Prisma ORM"| DB[("PostgreSQL — Neon")]
    BE -->|ExcelJS| XLSX["Exportação .xlsx"]
```

- **Frontend** (`leadminer-frontend`): Next.js (App Router) + TypeScript + Tailwind. Consome a API do backend via `fetch`, sem rotas de API próprias — toda a lógica de negócio vive no backend.
- **Backend** (`leadminer-backend`): NestJS, organizado em módulos de domínio (`scraper`, `leads`, `dashboard`, `search-history`, `saved-searches`, `export`, `auth`), cada um com `controller` + `service` + `dto`.
- **Scraper**: módulo dedicado dentro do backend, usa `playwright-core` para controlar um Chromium headless que navega no Google Maps, coleta a lista de resultados e extrai os dados de cada empresa.
- **Banco**: PostgreSQL hospedado no Neon, acessado via Prisma (com adapter de conexão via pooler em runtime e conexão direta para migrations).
- **Autenticação**: módulo `auth` com JWT/Passport já estruturado (guard, decorator `@Public()`, DTOs), mas **não é aplicado globalmente ainda** — todos os endpoints estão acessíveis sem login nesta fase da V1.
- **Comunicação entre serviços**: só há dois serviços (frontend e backend); a comunicação é HTTP/REST simples, liberada por uma allowlist de origens via `CORS_ORIGIN`. Não há fila, mensageria ou processamento assíncrono em background — a busca é uma requisição síncrona que só responde quando o scraping termina.

<img width="100%" src="https://capsule-render.vercel.app/api?type=rect&color=0:0D0D0D,50:8B0000,100:0D0D0D&height=3"/>

## Tech Stack
<sub><code>$ ls tech-stack/</code></sub>

### 🔴 Frontend
| Tecnologia | Uso |
|---|---|
| <img src="https://img.shields.io/badge/Next.js%2016-0D0D0D?style=flat-square&logo=nextdotjs&logoColor=FF3B30"/> | Framework React (App Router), build e roteamento |
| <img src="https://img.shields.io/badge/React%2019-0D0D0D?style=flat-square&logo=react&logoColor=FF3B30"/> | Interface |
| <img src="https://img.shields.io/badge/TypeScript-0D0D0D?style=flat-square&logo=typescript&logoColor=FF3B30"/> | Tipagem estática |
| <img src="https://img.shields.io/badge/Tailwind%20CSS%204-0D0D0D?style=flat-square&logo=tailwindcss&logoColor=FF3B30"/> | Estilização, tema dark/light via CSS variables |

### 🔴 Backend
| Tecnologia | Uso |
|---|---|
| <img src="https://img.shields.io/badge/NestJS%2011-0D0D0D?style=flat-square&logo=nestjs&logoColor=FF3B30"/> | Framework da API (sobre Express) |
| <img src="https://img.shields.io/badge/TypeScript-0D0D0D?style=flat-square&logo=typescript&logoColor=FF3B30"/> | Tipagem estática |
| `class-validator` / `class-transformer` | Validação de DTOs de entrada |
| Passport + JWT | Estrutura de autenticação (pronta, não ativa) |

### 🔴 Database
| Tecnologia | Uso |
|---|---|
| <img src="https://img.shields.io/badge/PostgreSQL-0D0D0D?style=flat-square&logo=postgresql&logoColor=FF3B30"/> | Banco relacional, hospedado no [Neon](https://neon.tech) |
| <img src="https://img.shields.io/badge/Prisma%207-0D0D0D?style=flat-square&logo=prisma&logoColor=FF3B30"/> | ORM, migrations e client tipado |

### 🔴 Scraping
| Tecnologia | Uso |
|---|---|
| <img src="https://img.shields.io/badge/Playwright-0D0D0D?style=flat-square&logo=playwright&logoColor=FF3B30"/> | Automação de navegador (`playwright-core`) |
| Chromium | Navegador headless controlado pelo scraper |

### 🔴 Exportação
| Tecnologia | Uso |
|---|---|
| ExcelJS | Geração da planilha `.xlsx` de leads |

### 🔴 Deploy
| Camada | Onde |
|---|---|
| Frontend | Vercel |
| Backend + Scraper | VPS Linux próprio |
| Banco | Neon (PostgreSQL gerenciado) |

### 🔴 Tools
| Ferramenta | Uso |
|---|---|
| ESLint + Prettier | Padronização de código |
| Jest | Testes (estrutura criada no backend) |
| PM2 | Processo contínuo do backend em produção |

<img width="100%" src="https://capsule-render.vercel.app/api?type=rect&color=0:0D0D0D,50:8B0000,100:0D0D0D&height=3"/>

## Como funciona
<sub><code>$ ./how-it-works.sh</code></sub>

Fluxo real de uma busca, do clique em "Pesquisar" até o resultado na tela:

1. O usuário preenche os filtros (termo, cidade, bairro, categoria) e clica em **Pesquisar**.
2. O frontend envia a busca para a API (`POST /api/scraper`).
3. O backend abre um contexto de navegador (Chromium via Playwright) e acessa o Google Maps.
4. A lista de resultados é coletada com scroll incremental, até esgotar os resultados ou atingir o limite de segurança.
5. Cada empresa da lista é aberta individualmente para extrair nome, telefone, site (incluindo o link real quando é um perfil de Instagram/Facebook), endereço e categoria — com concorrência limitada e timeout por empresa, para não travar a busca inteira por causa de uma empresa problemática.
6. Empresas já conhecidas (mesmo `placeId` de uma busca anterior) são identificadas via cache, em vez de reprocessadas.
7. Cada lead é persistido no PostgreSQL via Prisma, e a busca inteira é registrada no histórico.
8. Os resultados aparecem na tabela do frontend — prontos para visualizar detalhes, salvar a busca, exportar para Excel ou repetir depois pelo histórico.

Cancelar a busca em qualquer momento interrompe o processamento de novas empresas, mas preserva os leads já capturados até aquele instante.

<img width="100%" src="https://capsule-render.vercel.app/api?type=rect&color=0:0D0D0D,50:8B0000,100:0D0D0D&height=3"/>

## Instalação local
<sub><code>$ ./install.sh</code></sub>

### Requisitos

- Node.js 20 ou superior
- npm
- Uma instância PostgreSQL acessível (local ou Neon)

### 1. Clonar o repositório

```bash
git clone https://github.com/daks-2k25/MinerLeads-V1.git
cd MinerLeads-V1
```

### 2. Backend (`leadminer-backend`)

```bash
cd leadminer-backend
npm install

# copie o exemplo e preencha com valores reais (nunca comite o .env)
cp .env.example .env

npx prisma generate
npx prisma migrate deploy   # ou "npx prisma migrate dev" se estiver criando uma migration nova

# baixa o Chromium usado pelo scraper (uma vez só, não a cada execução)
npx playwright-core install chromium

npm run start:dev
```

A API sobe com prefixo `/api` (padrão `http://localhost:3001/api`). Variáveis mínimas exigidas no `.env`: `DATABASE_URL`, `CORS_ORIGIN`, `JWT_SECRET` — a aplicação recusa subir se alguma delas estiver ausente (validação em `src/config/env.validation.ts`).

### 3. Frontend (`leadminer-frontend`)

```bash
cd leadminer-frontend
npm install
npm run dev
```

Abra `http://localhost:3000`. O frontend consome a API via `NEXT_PUBLIC_API_URL` (padrão `http://localhost:3001` se a variável não for definida).

### 4. Testar

```bash
# em cada projeto
npx tsc --noEmit
npm run build
```

<img width="100%" src="https://capsule-render.vercel.app/api?type=rect&color=0:0D0D0D,50:8B0000,100:0D0D0D&height=3"/>

## Deploy
<sub><code>$ ./deploy.sh</code></sub>

Arquitetura de produção definida e documentada (checklist completo em [`leadminer-backend/docs/DEPLOY-VPS.md`](leadminer-backend/docs/DEPLOY-VPS.md)):

| Camada | Destino | Status |
|---|---|---|
| Frontend | Vercel | 📌 Pronto para deploy, ainda não publicado |
| Backend + Scraper | VPS Linux (Node + PM2 + proxy reverso) | 📌 Checklist pronto, VPS ainda não provisionado |
| Banco | Neon (PostgreSQL) | ✅ Em uso já em desenvolvimento |

Não há URL pública em produção no momento — a aplicação roda hoje em ambiente local/desenvolvimento. O guia de deploy cobre Chromium no VPS, variáveis de ambiente, proxy reverso com timeout adequado para o scraping síncrono, HTTPS e processo contínuo via PM2.

<img width="100%" src="https://capsule-render.vercel.app/api?type=rect&color=0:0D0D0D,50:8B0000,100:0D0D0D&height=3"/>

## Roadmap
<sub><code>$ cat roadmap.md</code></sub>

**✅ Implementado**
- Busca de leads via scraping do Google Maps
- Persistência com deduplicação por `placeId`
- Dashboard de métricas
- Histórico de buscas e buscas salvas
- Exportação para Excel
- Cancelamento de busca em andamento
- Captura de link real de Instagram/Facebook
- Dark/Light mode
- Tabela de leads virtualizada

**🚧 Em desenvolvimento**
- Deploy em produção (Vercel + VPS) — infraestrutura documentada, ainda não publicada
- Ativação da autenticação (estrutura JWT já existe, login ainda não é exigido pela API)

**📌 Futuro**
- Login/autenticação obrigatória nos endpoints
- Alguma proteção mínima da API pública no VPS (ex.: rate limiting)
- Paginação nas listagens (leads, histórico, buscas salvas)
- Cobertura de testes automatizados sobre as regras de negócio principais

<img width="100%" src="https://capsule-render.vercel.app/api?type=rect&color=0:0D0D0D,50:8B0000,100:0D0D0D&height=3"/>

<div align="center">

<sub><code>root@leadminer:~$ echo "V1 em desenvolvimento — próximo commit: deploy no VPS"</code></sub>

<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=0:0D0D0D,50:6B0000,100:FF0000&height=100&section=footer"/>

</div>
