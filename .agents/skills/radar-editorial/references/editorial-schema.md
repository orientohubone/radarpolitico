# Schema editorial

Enviar um objeto JSON com estes campos:

```json
{
  "headline": "Título factual e específico",
  "summary": "Síntese em até três frases",
  "whatHappened": "Relato verificado do acontecimento",
  "whyItMatters": "Consequências institucionais ou sociais",
  "whoIsAffected": "Grupos e instituições afetados",
  "argumentsFor": "Argumentos favoráveis com atribuição",
  "argumentsAgainst": "Argumentos contrários com atribuição",
  "openQuestions": "Lacunas e incertezas relevantes",
  "whatNext": "Próximas etapas verificáveis",
  "radarView": "Análise editorial claramente identificada",
  "keyPoints": ["Ponto essencial 1", "Ponto essencial 2"],
  "category": "Categoria",
  "contentType": "noticia",
  "authorName": "Redação Radar Político",
  "sourceTitle": "Nome ou título da fonte principal",
  "sourceDescription": "Descrição breve da fonte",
  "sourceUrl": "https://fonte-oficial.exemplo/documento"
}
```

`contentType` aceita `noticia`, `explicador`, `analise` ou `opiniao`. `sourceUrl` deve ser HTTP(S). Campos sem evidência devem declarar a lacuna, não receber conteúdo inventado.
