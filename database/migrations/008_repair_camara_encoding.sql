update source_items
set title = 'Projeto abre crédito especial para despesas não previstas de vários órgãos',
    normalized_title = 'projeto abre credito especial para despesas nao previstas de varios orgaos',
    description = 'Leia a notícia completa na fonte oficial da Câmara dos Deputados.',
    updated_at = now()
where canonical_url = 'https://www.camara.leg.br/noticias/1311364-projeto-abre-credito-especial-para-despesas-nao-previstas-de-varios-orgaos';

update articles a
set headline = 'Projeto abre crédito especial para despesas não previstas de vários órgãos',
    summary = 'Leia a notícia completa na fonte oficial da Câmara dos Deputados.',
    what_happened = case
      when what_happened like '%�%' then 'Leia a notícia completa na fonte oficial da Câmara dos Deputados.'
      else what_happened
    end,
    updated_at = now()
from source_items si
where a.primary_source_item_id = si.id
  and si.canonical_url = 'https://www.camara.leg.br/noticias/1311364-projeto-abre-credito-especial-para-despesas-nao-previstas-de-varios-orgaos';
