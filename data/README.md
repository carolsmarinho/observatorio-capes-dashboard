# Dados públicos do piloto

Esta pasta contém as saídas públicas usadas pelo dashboard do **Observatório da Avaliação da CAPES**.

## Arquivos

- `pilot-data.json`: camada principal exportada do pipeline analítico validado.
- `dashboard_sync_audit.csv`: checagens do exportador R; a versão atual passou 30/30.
- `evidence-data.json`: camada de evidência do dashboard, com registro de fontes oficiais e pares de pesos exibidos.
- `criteria.csv`: critérios top-level usados na comparação semântica 2021–2024 → 2025–2028.
- `semantic-crosswalk.csv`: relações validadas entre critérios históricos e atuais.
- `comparable-weights.csv`: pesos anteriores/atuais das sete relações 1:1, preservando a diferença entre peso exato e limiar mínimo.
- `claims-evidence-limits.csv`: afirmações do piloto, evidência que as sustenta e limite de interpretação.
- `source-documents.csv`: registro público das Fichas da CAPES usadas como fontes primárias.

## Regra de interpretação

Um peso exato (por exemplo, 20%) e um limiar mínimo (por exemplo, ≥20%) não são tratados como equivalentes. Por isso, transições `exact → minimum` são mostradas, mas não recebem uma diferença direcional em pontos percentuais.

## Escopo

O piloto cobre **Psicologia, Química e Saúde Coletiva** e não deve ser generalizado para todas as 50 áreas da CAPES.
