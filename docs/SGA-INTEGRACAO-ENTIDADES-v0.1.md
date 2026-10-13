# SGA — Integração de Entidades v0.1

Incremento 01: fundação de entidades compartilhadas e preparação para o Trello.

Este documento descreve como os módulos Trabalhos, PTAs, Kanban e Qualidade & Processos compartilham identidade. Ele também registra o que ainda não está integrado.

Escopo: frontend Angular com dados mockados. Não há backend, API real nem conexão com o Trello.

---

## A. Entidades compartilhadas

| Entidade | Identificador | Exemplo | Modelo | Repositório |
|---|---|---|---|---|
| Client | `cli-<apelido>` | `cli-alfa` | `client.model.ts` | `ReferenceDataRepository.clients()` |
| AuditArea | nome da área (chave) · `id` estável | `Receita` · `area-receita` | `client.model.ts` | `ReferenceDataRepository.auditAreas()` |
| Engagement (operacional) | `eng-<cliente>-<ano>` | `eng-alfa-2026` | `engagement.model.ts` | `EngagementRepository.list()` / `get()` |
| Engagement (identidade, inclui históricos) | idem | `eng-beta-2025` | `EngagementIdentity` | `EngagementRepository.identities()` |
| Workpaper (PTA) | `PTA-<área>-<nº>` | `PTA-REC-001` | `workpaper.model.ts` | `WorkpaperRepository` |
| Task | `T-<nº>` | `T-105` | `task.model.ts` | `TaskRepository` |
| Board | `board-<cliente>-<ano>` | `board-alfa-2026` | `board.model.ts` | `BoardRepository` |
| BoardCard | `C-<nº>` / `B-<nº>` (únicos entre quadros) | `C-04` | `board.model.ts` | dentro de `Board` |
| User | `u-<nome>` | `u-matheus` | `user.model.ts` | `UserRepository` |
| ExternalReference | `XR-<nº>` | `XR-002` | `external-reference.model.ts` | `ExternalReferenceRepository` |

Nenhum identificador público mudou. `cli-*` já era usado pelo módulo Qualidade e foi promovido a chave canônica. Também não houve alteração de rota.

## B. Relacionamentos

```text
Client            1:N  Engagement            (Engagement.clientId)
Engagement        1:N  Workpaper             (Workpaper.engagementId)
Engagement        1:N  Task                  (Task.engagementId)
Workpaper         0:N  Task                  (Task.workpaperId, mesmo trabalho)
Engagement        0:1  Board                 (Board.engagementId; hoje Alfa 2026 e Beta 2026)
Board             1:N  BoardCard             (colunas do quadro)
Workpaper         0:N  BoardCard             (BoardCard.workpaperId, mesmo trabalho)
Task              0:N  BoardCard             (BoardCard.taskId, mesmo trabalho)
AuditArea         1:N  Workpaper             (Workpaper.area = AuditArea.name)
InternalEntity    1:N  ExternalReference     (várias referências externas por entidade)
Engagement        0:N  Observação estatística (ObservationContext.engagementId)
```

## C. Política de identidade

- **Fonte de cada entidade.** Cada entidade tem um único repositório dono (tabela A). Os componentes nunca leem mocks diretamente.
- **Catálogo canônico.** `core/data/entity-catalog.ts` monta um índice somente leitura a partir dos repositórios. Ele não é uma segunda base de dados. `EntityResolutionService.catalog()` reconstrói o índice a cada consulta, refletindo mudanças da sessão (status de PTA, quadros salvos).
- **Resolução sempre por id exato.** `resolveEntity()` nunca compara nomes nem usa semelhança de texto. Os resultados possíveis são:
  - `resolved` + `link`: entidade com tela própria;
  - `resolved` + `link: null`: entidade existente sem tela (cliente, área, tarefa);
  - `resolved` + `recordKind: 'historical'`: trabalho conhecido só pelo histórico estatístico;
  - `unresolved` + `not_found`: id inexistente;
  - `unresolved` + `not_linked`: a origem não informou vínculo.
- **Rotas usadas pela navegação contextual.** `/engagements/:id` e `/workpapers/:id` são abertas apenas para entidades operacionais existentes. `/workflow?board=<id>` abre o quadro de um trabalho.
- **Nome do cliente.** `Engagement.client` continua existindo para exibição nas telas atuais. A chave é `clientId`, e um teste garante que os dois coincidam.
- **Trabalhos históricos.** `eng-alfa-itr-2026`, `eng-beta-2025` e `eng-gama-2025` ficam em `HISTORICAL_ENGAGEMENTS`, com `recordKind: 'historical'` e sem `status`. Eles não aparecem na lista de Trabalhos, não têm tela e nunca recebem PTAs, tarefas ou quadros. Nenhum PTA fictício foi criado para viabilizar links.

## D. Referências externas (Trello, futuro)

Contrato: `ExternalReference` (`core/models/external-reference.model.ts`).

```text
Trello card id ──► ExternalReference ──► workpaper | task | document_request | board_card
Trello board id ─► ExternalReference ──► board | engagement
Trello member id ► ExternalReference ──► user
```

- **Unicidade.** A chave `provider | externalEntityType | externalEntityId` é única. Uma entidade interna pode ter várias referências externas.
- **Vínculo explícito.** Nada é presumido: um cartão do Trello não é automaticamente um PTA, e um quadro não é automaticamente um trabalho.
- **Combinações aceitas.** Ficam em `ALLOWED_EXTERNAL_MAPPINGS`. Listas do Trello ainda não mapeiam para nenhuma entidade.
- **Funções puras** (`core/data/external-references.ts`):

  | Função | O que faz |
  |---|---|
  | `resolveExternalReference` | Mapeia externo → interno. Retorna `resolved`, `unknown` ou `invalid` (`missing_internal` / `incompatible_type`). |
  | `indexExternalReferences` | Lança `ExternalReferenceConflictError` se a mesma chave externa apontar para alvos diferentes. Não há aceitação silenciosa. |
  | `validateExternalReferences` | Diagnóstico completo: duplicata conflitante, duplicata redundante, id repetido, alvo inexistente e tipo incompatível. |
  | `referencesOf` | Lista as referências externas de uma entidade interna. |
- **Dados demonstrativos.** `external-references.mock.ts` traz 5 vínculos com ids externos **fictícios**, sem `syncedAt` (nunca sincronizados).

Fluxo previsto para o adaptador futuro, que ainda não existe:

```text
Trello API ─► Adaptador Trello ─► ExternalReference (resolução) ─► AuditEvent operacional ─► métricas do SGA
```

O motor estatístico não conhece o Trello. O SGA funciona integralmente sem nenhuma referência externa.

## E. Eventos (contrato preliminar)

Contrato: `AuditEvent` (`core/models/audit-event.model.ts`). É uma união discriminada:

- `WorkpaperEvent` (`entityType: 'workpaper'`): `WORKPAPER_CREATED`, `PREPARATION_STARTED`, `SUBMITTED_FOR_REVIEW`, `REVIEW_STARTED`, `REVIEW_NOTE_CREATED`, `REVIEW_NOTE_RESOLVED`, `RETURNED_FOR_CORRECTION`, `RESUBMITTED`, `REVIEW_APPROVED`, `WORKPAPER_FINALIZED`, `WORKPAPER_REOPENED`.
- `BoardCardEvent` (`entityType: 'board_card'`): `BOARD_CARD_CREATED`, `BOARD_CARD_MOVED`, `BOARD_CARD_ASSIGNED`.

Campos: `occurredAt` (quando o fato aconteceu na origem), `recordedAt` (quando o SGA registrou; deve ser ≥ `occurredAt`), `source` (`sga` | `trello` | `import`) e `externalEventId` (idempotência para fontes externas).

**Formal × operacional (`EVENT_NATURE`).**

- **Evento formal:** ato técnico do fluxo de revisão, registrado por quem tem a responsabilidade. Alimentará as métricas de Qualidade.
- **Evento operacional:** organização do trabalho, como mover um cartão.

`BOARD_CARD_MOVED` para "Em revisão" **não** equivale a `REVIEW_STARTED`, e mover para "Concluído" **não** equivale a `REVIEW_APPROVED`. `validateAuditEvent` rejeita evento formal com `source: 'trello'`.

`validateAuditEvent` (`core/data/audit-events.ts`) também verifica:

- se a entidade existe;
- se o trabalho informado coincide com o da entidade;
- a coerência das datas;
- o id externo obrigatório para o Trello;
- os campos de payload obrigatórios.

Limites deste incremento: não há ingestão, persistência, motor de eventos, event sourcing nem fluxo formal de revisão. O estado atual continua nos repositórios.

## F. Qualidade & Processos

- **Recortes.** As observações estatísticas guardam `ObservationContext`. Os filtros Cliente, Trabalho e Área e os KPIs usam os ids canônicos (`clientId`, `engagementId`, `auditArea`), não nomes.
- **Origem do contexto.** O mock de Qualidade obtém clientes, trabalhos e áreas do catálogo compartilhado. Se um id não existir no catálogo, o carregamento do módulo falha com erro explícito.
- **Campos canônicos × códigos de origem.**
  - `workpaperId` e `eventId` só são preenchidos quando o vínculo é confiável. Hoje nenhuma observação tem esse vínculo.
  - Os códigos da fonte estatística demonstrativa (`PTA-FOR-314`, `RN-143`) ficam em `workpaperCode` e `eventCode`. Um teste garante que não colidem com PTAs operacionais.
- **Drill-down.** `features/quality/quality-links.ts` resolve o contexto no catálogo e monta a cadeia Cliente → Trabalho → Quadro Kanban → Área → PTA → Evento:
  - entidade operacional: link ("Abrir trabalho", "Abrir quadro", "Abrir PTA");
  - trabalho histórico: "Trabalho histórico, sem registro operacional no protótipo";
  - sem vínculo navegável: "Vínculo operacional não identificado", e observação, período, métrica e contexto continuam visíveis.
- **Cartas p/u.** O contexto é o segmento com maior concentração no mês, e o rótulo diz isso.
- **Motor estatístico.** Baselines, cartas e sinais não foram alterados.

## G. Invariantes (verificadas em testes)

1. Todo PTA aponta para um trabalho **operacional** existente.
2. Todo trabalho (operacional ou histórico) aponta para um cliente existente, e `Engagement.client` é igual ao nome do cliente.
3. Cartões do Kanban têm o `engagementId` do seu quadro. `workpaperId` e `taskId` resolvem para o mesmo trabalho, e a tarefa e o cartão apontam para o mesmo PTA.
4. Ids de cartão são únicos entre todos os quadros.
5. Áreas de PTAs e de observações pertencem ao catálogo de áreas.
6. Trabalhos históricos não recebem PTAs, tarefas nem quadros, e nunca aparecem como ativos.
7. Toda observação de Qualidade tem cliente e trabalho existentes no catálogo. Nenhum `workpaperId`/`eventId` é inventado.
8. Uma chave externa aponta para no máximo uma entidade interna.
9. Todo link oferecido pela navegação contextual corresponde a uma rota declarada.
10. Os mocks são determinísticos (sem aleatoriedade em tempo de execução).

`checkReferentialIntegrity(catalog)` devolve as violações das invariantes 1, 3, 5 e 6. Uma lista vazia significa catálogo íntegro.

## H. Limitações

- **Qualidade → PTA.** Nenhuma observação estatística está ligada a um PTA operacional. A navegação "Abrir PTA" existe e é testada com fixture, mas não aparece com os dados atuais.
- **Status do Kanban × status do PTA.** Não são sincronizados.
- **Quadros persistidos.** Quadros salvos no navegador podem conter vínculos antigos. O Kanban oculta o atalho e mostra "Vínculo operacional não identificado", mas não corrige o dado salvo.
- **Solicitações documentais.** `document_request` ainda não é entidade: só existe como contagem agregada em Qualidade.
- **Clientes.** Não há tela de clientes, então o cliente é resolvido sem link.
- **Tarefas.** Não há tela de detalhe de tarefa, então tarefas são resolvidas sem link.
- **Áreas.** A área continua referenciada pelo nome. A migração para `auditAreaId` fica para quando houver backend.
- **Trello.** Não há conexão, credenciais, webhooks nem adaptador. Existem apenas contratos, validação e dados fictícios.

## Fontes de dados do protótipo

| Conjunto | Origem | Natureza |
|---|---|---|
| Clientes e áreas | `core/mocks/clients.mock.ts` | Mock compartilhado |
| Trabalhos operacionais | `core/mocks/engagements.mock.ts` (`ENGAGEMENTS`) | Mock compartilhado |
| Trabalhos históricos | `core/mocks/engagements.mock.ts` (`HISTORICAL_ENGAGEMENTS`) | Identidade para o histórico estatístico; sem registro operacional |
| PTAs, tarefas, quadros, usuários | `workpapers`, `tasks`, `boards`, `users` `.mock.ts` | Mock compartilhado; quadros podem ser alterados e salvos no navegador |
| Observações e baselines de Qualidade | `core/mocks/quality.mock.ts` | Dados estatísticos **demonstrativos**, não capturados do fluxo operacional |
| Referências externas | `core/mocks/external-references.mock.ts` | Vínculos fictícios; nenhum sincronizado |
| Eventos | `core/models/audit-event.model.ts` | Só contrato e validação; nenhum evento é registrado |
| Trello | — | Não conectado |

## Próximo incremento (02: eventos e fluxo formal de revisão)

Já preparado:

- contrato `AuditEvent`, com separação formal/operacional;
- validação básica de eventos;
- resolução de entidades;
- campos `workpaperId`/`eventId` reservados para vínculos confiáveis.

Pendente:

- registrar eventos formais nas transições de status do PTA;
- derivar as métricas de Qualidade (ciclo de revisão, retrabalho, review notes, reaberturas) a partir dos eventos, em vez do mock estatístico;
- definir a persistência do histórico no backend.
