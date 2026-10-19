---
name: radar-editorial
description: Cria artigos e rascunhos do Radar Político com copywriting, storytelling e narrativa jornalística baseados em fontes verificadas. Use para transformar notícias, documentos oficiais ou pautas em conteúdo estruturado para o painel editorial, sempre com revisão humana antes da publicação.
---

# Radar Editorial

Produzir jornalismo claro, preciso e sóbrio. Usar recursos narrativos para facilitar a compreensão, nunca para dramatizar, persuadir politicamente ou preencher lacunas factuais.

## Fluxo

1. Reunir ao menos uma fonte identificável. Preferir documentos oficiais e fontes primárias.
2. Separar fatos confirmados, contexto, declarações atribuídas e pontos ainda incertos.
3. Definir o foco em uma frase: o que mudou, para quem e por que importa.
4. Escrever conforme o schema em [references/editorial-schema.md](references/editorial-schema.md).
5. Conferir nomes, cargos, datas, números e links. Não inventar citações ou causalidade.
6. Marcar lacunas em `openQuestions`; não ocultá-las com linguagem vaga.
7. Salvar como `review`. Nunca definir publicação automática.

## Estilo

- Abrir com a informação mais relevante, não com ambientação genérica.
- Usar frases diretas, voz ativa e parágrafos curtos.
- Explicar siglas e procedimentos políticos na primeira ocorrência.
- Aplicar storytelling pela sequência fato → contexto → impacto → tensão legítima → próximos passos.
- Manter título informativo, específico e sem clickbait.
- Distinguir análise de opinião. Reservar juízo editorial para `radarView`.
- Apresentar argumentos favoráveis e contrários com simetria e atribuição.
- Evitar adjetivos valorativos, previsões não sustentadas e falsa equivalência.

## Entrega e envio

Entregar primeiro o JSON completo para inspeção. Injetar no painel somente quando o usuário pedir explicitamente. Para enviar, salvar o JSON em arquivo temporário e executar:

```text
npm run editorial:submit -- <arquivo.json>
```

Exigir `INGEST_TOKEN` e o servidor do Radar em execução. O envio cria item com status editorial `review` e status de publicação `draft`.
