@AGENTS.md
# LeadMiner

## Objetivo do projeto

Criar uma ferramenta para gerar leads empresariais automaticamente.

A primeira versão deve:
- Pesquisar empresas por cidade e segmento.
- Coletar informações públicas.
- Gerar arquivo Excel.

## V1

Foco:
- Velocidade de entrega.
- Código simples.
- Validar a ideia.

Funcionalidades:
- Entrada:
  - Cidade
  - Segmento
  - Quantidade de empresas

- Saída:
  - Arquivo .xlsx

Dados desejados:
- Nome da empresa
- Segmento
- Telefone
- Email
- Endereço
- Site


## Tecnologias

Usar:
- Next.js
- TypeScript
- Playwright
- ExcelJS

## Regras de desenvolvimento

- Não criar funcionalidades fora do escopo atual.
- Não instalar dependências sem necessidade.
- Preferir soluções simples.
- Usar TypeScript.
- Explicar alterações importantes antes de implementar.

## V1 NÃO possui:

- Banco de dados
- Login
- Dashboard complexo
- Sistema de usuários
- IA avançada
- n8n

## Estrutura esperada

app/
Interface Next.js

scraper/
Automação Playwright

lib/
Funções auxiliares

exports/
Arquivos gerados

types/
Interfaces TypeScript