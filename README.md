# Radar Político — Estrutura inicial

Projeto inicial para o site "Radar Político" usando:

- Vite (dev tooling)
- React + TypeScript
- TanStack Query (@tanstack/react-query)
- Tailwind CSS (config básica)

Instruções rápidas:

1. Instale dependências:

```bash
npm install
# ou
# pnpm install
# yarn
```

2. Rode em desenvolvimento:

```bash
npm run dev
```

O repositório já contém a estrutura básica: `index.html`, `src/`, `public/`, configurações do Vite e do Tailwind.

Próximo passo: me diga se prefere JavaScript em vez de TypeScript, se quer incluir TanStack Router, ou se prefere outro CSS framework; eu ajusto a estrutura e os arquivos.

## Neon Postgres

1. Copie `.env.example` para `.env` e cole em `DATABASE_URL` a connection string **pooled** do Neon.
2. Defina um valor longo e aleatório em `INGEST_TOKEN`.
3. Crie as tabelas e faça a primeira coleta:

```bash
npm run db:migrate
npm run news:ingest
npm run images:refresh
npm run media:sync
```

O site lê apenas matérias publicadas no Postgres quando `DATABASE_URL` está configurada. Sem essa variável, mantém temporariamente o coletor e o snapshot locais como contingência.

O painel manual fica em `/admin/editorial` e utiliza o valor de `INGEST_TOKEN` como token de acesso. O token é mantido apenas na sessão do navegador. Cada leitura pode passar por conteúdo bruto, rascunho, revisão e editorial pronto.

### Atualização automática

Em produção, agende uma chamada `POST /api/admin/ingest` a cada 15 minutos com o header:

```text
Authorization: Bearer <INGEST_TOKEN>
```

Agende também `POST /api/admin/media-sync` a cada 2 horas com o mesmo header. Essa rotina apenas renova o pool oficial; a ingestão escolhe capas do pool já armazenado sem fazer buscas aleatórias.

Também é possível executar `npm run news:ingest` em um cron do provedor. O endpoint e o comando são idempotentes: URLs já coletadas são atualizadas, não duplicadas.

### Modelo editorial

- `source_items`: material bruto coletado e metadados de origem.
- `articles`: conteúdo próprio do Radar, com síntese, contexto, próximos passos e visão editorial.
- `article_sources`: múltiplas fontes associadas a uma matéria.
- `article_opinions`: opiniões enviadas por leitores, inicialmente em moderação.

Não armazene imagens como `bytea` no Postgres. Nesta etapa são salvas apenas URL e hash; arquivos próprios poderão migrar para Neon Object Storage posteriormente.

`npm run media:sync` alimenta no Neon um pool temático com uma foto recente por evento do Banco de Imagens da Câmara. `npm run images:refresh` aplica a cascata editorial e escolhe o item menos recentemente usado (LRU), proibindo hashes e eventos presentes nas últimas 15 posições.
