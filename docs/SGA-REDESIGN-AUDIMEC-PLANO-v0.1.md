# SGA — Plano de reformulação visual minimalista com AUDIMEC-DESIGN v0.1

Diagnóstico e planejamento. **Nenhum arquivo de código foi alterado.** Cada fase do roteiro (seção 10) foi escrita para virar um prompt independente no Claude Code.

## Convenção de origem

Cada afirmação deste documento indica de onde vem:

| Marcador | Significado |
|---|---|
| **[CÓDIGO]** | Constatado nos arquivos do SGA ou medido no navegador |
| **[AUDIMEC · OFICIAL]** | Regra do manual de marca, conforme a Skill AUDIMEC-DESIGN v1.1.0 |
| **[AUDIMEC · ADAPTAÇÃO]** | Adaptação técnica documentada na Skill. Não é regra da marca, mas é o padrão já usado pela Skill em HTML e dashboards |
| **[PROPOSTA]** | Decisão de UX/UI deste plano, sem norma oficial correspondente |

Fontes consultadas:

- **Skill:** `SKILL.md`, `references/{format-pdf-html, color-palette, typography, logo-guidelines, visual-elements, source-traceability}.md`, `assets/theme/{audimec-tokens.json, audimec.css}` e o inventário de `assets/logos`.
- **Código:** `frontend/src/styles/*`, `layout/*`, `shared/ui/*` e os estilos e templates das features.
- **Navegador:** capturas do estado atual em Chrome headless (1440×900, 1024×768 e 390×844), com a persona Sócio + Gerente, feitas nesta sessão. As capturas ficaram na pasta temporária da sessão e não foram incorporadas ao repositório.

---

## 1. Resumo executivo

O SGA já tem uma base técnica favorável à reformulação:

- tokens em CSS Custom Properties (`_tokens.scss`);
- 17 componentes compartilhados em `shared/ui`;
- tons de status centralizados (`StatusTone`, 6 valores) e mapeados por um único componente (`StatusBadge`);
- poucas cores fixas fora dos tokens (16 ocorrências).

A identidade atual é um **verde provisório**. O próprio `_tokens.scss` diz: "Os verdes são provisórios: substituir aqui quando a identidade oficial for definida". A fonte é a **Inter**, e a "marca" é um quadrado com a letra "S".

Os problemas que mais pesam na aparência são:

1. **Excesso de cor semântica.**
   - Até 6 tons de selo convivem na mesma tela (Dashboard, detalhe do Trabalho).
   - Prioridade "Alta" aparece em vermelho, embora não seja um alarme.
   - Um cartão do Kanban chega a ter 5 selos e chips.
2. **Decoração repetida.** Todo KPI tem um ícone em bloco colorido, e todo card tem sombra.
3. **Ausência da marca AUDIMEC.** Não há logotipo, a fonte não é a Exo 2 e as cores não são as oficiais.
4. **Defeitos responsivos reais em 390 px.**
   - Overflow horizontal: 45 px no PTA, 43 px em Qualidade e 1 px no Dashboard.
   - A sidebar recolhida ocupa 72 px fixos no celular.

**Direção proposta: "institucional sóbrio".**

- Sidebar em verde-escuro AUDIMEC (`#1D2A24`) com o logotipo oficial na versão negativa.
- Página em branco-esverdeado (`#F1F2EC`) e superfícies brancas com fio `#DDE1D1`, sem sombra.
- Exo 2, com H1 ExtraBold, rótulos de seção em Light caixa alta e texto em Medium.
- O verde-lima (`#A7CF00`) fica reservado para o estado ativo e para "atenção".
- O vermelho continua como **única exceção funcional** à paleta, apenas para alarmes que exigem ação. Essa exceção precisa de aprovação.

**Esforço:** a maior parte do impacto vem das Fases 1 a 3 (tokens, navegação e componentes compartilhados). Essas fases mexem em cerca de 25 arquivos de estilo, sem tocar regras de negócio.

**Primeira fase recomendada:** Fase 1, identidade e design tokens (seção 13), condicionada às 4 decisões da seção 6.3.

---

## 2. Diagnóstico visual do SGA atual

### 2.1. Identidade visual [CÓDIGO]

| Item | Estado atual | Arquivo |
|---|---|---|
| Paleta de marca | 7 verdes provisórios: `--green-950 #123d2b` … `--green-50 #eff9f2`. Nenhum coincide com a paleta AUDIMEC | `styles/_tokens.scss` |
| Fundo da página | `#f5f8f5` | `--background` |
| Sidebar | `#123d2b` (`--green-950`), texto branco a 78% | `layout/sidebar/sidebar.scss` |
| Marca | Quadrado 32 px com a letra "S" sobre `--green-200`, mais o texto "SGA / Gestão e Automação de Auditoria" | `layout/sidebar/sidebar.html` |
| Cores semânticas | 6 tons (`neutral`, `info` azul `#1d5c96`, `warning` âmbar, `danger` vermelho, `success`, `brand`), com 84 usos diretos de `--danger/--warning/--info-*` | `_tokens.scss`, `status-badge.ts` |
| Prioridade | `medium` = warning (âmbar), `high` = danger (vermelho) | `core/models/status.model.ts` |
| Avatares | 6 verdes fixos fora dos tokens (`#1F6B45`, `#185238`…) | `shared/ui/avatar/avatar.ts` |
| Uso de primitivos | 25 arquivos de feature usam `var(--green-NNN)` diretamente, em vez de tokens de papel (`--brand`, `--border`…) | ex.: `sample-selection-wizard.scss` (13), `board-page.scss` (12), `workpaper-detail-page.scss` (10) |
| Cores fixas | 16 hex e 13 `rgb()` fora dos tokens, concentrados na sidebar (10 `rgb()` com alfa) e no avatar (7) | — |

**Impacto.** Trocar só os primitivos `--green-*` não basta. Eles são usados com papéis diferentes: `--green-200` é acento sobre fundo escuro na sidebar e trilho claro no drill-down; `--green-700` serve de cor de marca, de série de gráfico e de texto de sucesso. Uma troca 1:1 produziria contrastes errados em parte das telas (ver Fase 1, tabela de aliases).

### 2.2. Tipografia [CÓDIGO]

- **Família.** Inter, carregada do Google Fonts (`index.html`, pesos 400–700), com `font-feature-settings: 'cv11', 'ss01'`, específicos da Inter.
- **Escala em tokens.** `--fs-page-title` 28 px, `--fs-section-title` 20, `--fs-card-title` 16, `--fs-body` 14, `--fs-meta` 12.
- **Tamanhos fora dos tokens.** 32× `13px`, 20× `11px`, 14× `12px` e mais 9 valores avulsos (10, 15, 16, 18, 24, 28 px). Na prática a escala tem 9 tamanhos.
- **Pesos.** 46× `600`, 29× `500`, 3× `400`, 2× `700`. O peso 600 (SemiBold) não existe na tipografia AUDIMEC.
- **Hierarquia.**
  - Títulos de página fortes (28 px 700), mas títulos de card (16 px 600) e de seção (20 px 600) ficam próximos demais.
  - O meta (12 px, `#66736a`) é usado para quase toda informação secundária, o que deixa as telas acinzentadas e homogêneas.
- **Números.** `.mono` aplica `tabular-nums`. Valores de KPI em 28 px peso 600.

### 2.3. Layout [CÓDIGO + navegador]

- **Estrutura.** Sidebar de 248 px (72 recolhida), topbar de 64 px e conteúdo com máximo de 1440 px e padding de 28 px. A sidebar recolhe sozinha abaixo de 1200 px (`app-shell.ts`).
- **Organização.**
  - Grid de KPIs com 4 colunas (2 abaixo de 1100 px).
  - Páginas com `page-header` (título + subtítulo + ações) seguido de cards.
  - Espaçamento entre seções de 24 px (`.page { gap: var(--space-6) }`), consistente.
- **Desequilíbrio no Dashboard (1440).** A coluna esquerda termina perto de 800 px, e a direita (atividade + automações) vai até cerca de 1180 px, deixando um vazio grande.
- **Responsividade em 390 px:**
  - a sidebar recolhida continua visível e ocupa 72 px (18% da largura);
  - **overflow horizontal** de 45 px no PTA, 43 px em Qualidade e 1 px no Dashboard;
  - no PTA, as grades fixas das seções Procedimentos (`22px 28px 1fr auto`) e Exceções (`50px 1fr auto auto`) espremem o texto em colunas de poucas palavras.

### 2.4. Componentes [CÓDIGO + navegador]

| Componente | Observação |
|---|---|
| `Card` | Borda 1 px + `shadow-sm` + raio 12 px. Borda e sombra redundantes sobre fundo claro |
| `KpiCard` | Ícone 18 px em bloco colorido de 30 px (`green-50`, `warning-100`, `danger-100`) em todas as instâncias: Dashboard, Trabalho, Análise, Qualidade. É decoração repetida, e o tom do KPI fica no ícone, não no dado |
| `Button` | Altura 36 (sm 30), raio 8, primário `--green-700`. `danger` sem estado hover. Foco com halo de 3 px a 40% |
| `DataTable` | Cabeçalho em `surface-muted`, 12 px 600; linhas com divisória; hover `green-50`. Bom ponto de partida |
| `StatusBadge` | Pílula preenchida com ponto, em 6 tons. É **o principal gerador de poluição cromática** |
| Chips locais | 9 arquivos de feature reimplementam pílulas com `--radius-pill` (filtros de Automações, contadores de Qualidade, tipo e tags do Kanban, severidade dos sinais…) com tamanhos e pesos diferentes do `StatusBadge` |
| `Tabs` | Sublinhado `green-700` e contador em pílula. Coerente |
| `Drawer` | 520 px, `shadow-lg`, backdrop verde a 28%. Coerente |
| Menus e toasts | Toast verde-escuro, no canto inferior direito; desde o 02A vai para a esquerda quando há drawer aberto |
| Estados vazios | Ícone em círculo `green-50` + título + descrição. Bom |
| Gráficos | Carta de controle: série `green-700`, limites `danger-500` tracejados, sinais em losango vermelho e círculo âmbar. Análise: barras `green-200` e destaque `green-700`; barras de exceção em âmbar |

**Excessos observados nas capturas:**

- **Selos.**
  - Dashboard: 5 tons de selo na mesma tela.
  - Trabalho, "Situação dos PTAs": 6 tons, um por status.
  - Cartão do Kanban: até 5 selos (tipo, tags, prioridade, coluna, status formal do PTA).
  - O selo de coluna em cada cartão repete o título da coluna.
- **Ícones decorativos.** Blocos de ícone em todos os KPIs e em todos os cartões de Automações.
- **Texto repetido.** "Fluxo previsto para a v0.2" aparece em 5 de 6 cartões de Automações.
- **Links verdes demais.** No feed de atividade, o nome do objeto inteiro é link, deixando a coluna toda verde.

### 2.5. Consistência [CÓDIGO]

| Problema | Onde | Por que prejudica | Mudança | Benefício |
|---|---|---|---|---|
| Pílulas reimplementadas | 9 features (`radius-pill`) | Tamanhos (11–13 px), pesos e paddings diferentes do `StatusBadge` | Criar `sga-tag` (neutro, sem cor) e usar `StatusBadge` só para status | Uma linguagem só para rótulos |
| Primitivos em vez de papéis | 25 arquivos com `--green-NNN` | Re-tematizar exige editar cada tela | Substituir por tokens de papel (`--accent`, `--brand`, `--border`…) | A marca passa a ser trocada só nos tokens |
| Tamanhos de fonte avulsos | 49 ocorrências de 11/12/13 px literais | Hierarquia irregular entre telas | Escala fechada de 6 tamanhos (seção 7.A) | Ritmo tipográfico consistente |
| Peso 600 | 46 ocorrências | Peso fora da tipografia AUDIMEC | Mapear para 700 (ênfase) ou 500 (texto) | Aderência à Exo 2 |
| KPI com ícone colorido | `KpiCard` em 4 páginas | Cor decorativa compete com os sinais reais | Ícone monocromático pequeno, ou nenhum | Cor só onde há significado |

---

## 3. Análise da Skill AUDIMEC-DESIGN

A Skill v1.1.0 está instalada e foi lida.

**Base em que se apoia.** O manual de marca (fonte primária) define apenas cores, família tipográfica com três pesos, logotipo e tom. A Skill declara: "O manual não define tamanhos, grids, estilos de tabela ou gráfico." Tudo além disso é adaptação técnica da própria Skill, pensada para **documentos e relatórios**, não para software.

### 3.1. Regras aplicáveis à interface web

| Regra | Origem | Aplicação no SGA |
|---|---|---|
| Paleta principal `#A7CF00`, `#DDE1D1`, `#1D2A24`; apoio `#F1F2EC`, `#87A70C`, `#3E7566` | **OFICIAL** (manual p. 10) | Base de todos os tokens de cor |
| Não usar cores fora da paleta sem pedido explícito | **OFICIAL** (via Skill) | Exige decisão sobre vermelho e âmbar (seção 6.3, D1) |
| Texto corrido em `#1D2A24`; `#F1F2EC` sobre fundo escuro | **OFICIAL** | Texto principal e sidebar |
| `#87A70C` e `#A7CF00` nunca como texto pequeno sobre fundo claro (contraste 2,8 e 1,8) | **OFICIAL** + contraste calculado | O lima nunca é texto em fundo claro; o oliva só decorativo/grande |
| Exo 2: H1 ExtraBold (800), H2 Light (300), texto Medium (500) | **OFICIAL** (p. 09) | Títulos de página, rótulos de seção e corpo |
| H1 e H2 em caixa alta | **OBSERVADO** nos exemplos, não é regra escrita | Decisão D2 |
| Bold 700 para ênfase no corpo; não usar ExtraBold como negrito | **ADAPTAÇÃO** | Substitui o 600 atual |
| Logotipo só a partir dos arquivos de `assets/logos`; nunca recriar | **OFICIAL** | Substituir o "S" pelo arquivo SVG |
| Fundo `#1D2A24` → versão `horizontal-negativa`; fundos claros → `horizontal` | **OFICIAL** (p. 08) | Sidebar escura → negativa |
| Largura mínima horizontal 4 cm / 113 px (manual); a Skill usa ≥151 px "a 96 dpi" no HTML | **OFICIAL** + ADAPTAÇÃO | Usar ≥151 px por segurança |
| Área de proteção horizontal ≥0,79×altura nas laterais e ≥0,61×altura acima/abaixo | ADAPTAÇÃO proporcional dos valores oficiais | Dimensiona o cabeçalho da sidebar |
| Não aplicar o logo sobre lima ou verde-intermediário; sem efeitos | **OFICIAL** (p. 08, 11) | Nada de logo em blocos `#3E7566` |
| Símbolo isolado só como assinatura, depois que a marca completa já apareceu | **OFICIAL** (p. 07) | Decisão D3 (sidebar recolhida) |
| Ícones lineares, finos, em `#1D2A24` ou `#3E7566` | OBSERVADO / ADAPTAÇÃO | Compatível com os Lucide atuais (traço 1,75) |
| "Não usar barras coloridas decorativas, sombras ou efeitos" | ADAPTAÇÃO (recomendação de composição) | Cards sem sombra |
| Raio 0 no tema HTML (`--aud-radius: 0`) | ADAPTAÇÃO | Decisão D4 |
| Gráficos: séries `#1D2A24 → #3E7566 → #87A70C → #A7CF00 → #DDE1D1`; grade `#DDE1D1`; no máximo um destaque lima, sempre com rótulo ou contorno | ADAPTAÇÃO | Análise de Dados e cartas de controle |
| Escala de risco BAIXO `#DDE1D1` / MÉDIO `#A7CF00` / ALTO `#3E7566` / CRÍTICO `#1D2A24`, sempre com texto | ADAPTAÇÃO | Risco de trabalho e de área |
| Status sempre com texto, nunca só cor | ADAPTAÇÃO | Já atendido no SGA; manter |
| "O manual não tem vermelho/amarelo. Se o usuário exigir semáforo tradicional, use-o e informe que é exceção" | ADAPTAÇÃO | Base da decisão D1 |
| Números pt-BR (`1.234,56`, `12,5%`, `dd/mm/aaaa`) | ADAPTAÇÃO | Já atendido |

### 3.2. Regras de documento que **não** se transpõem para o software

| Regra da Skill | Por que não serve a uma interface de trabalho | Tratamento |
|---|---|---|
| Escala HTML de relatório (corpo 16 px, H1 40 px, H2 26 px) | Pensada para leitura contínua. Num sistema com tabelas, filas e cartas, reduziria a densidade em cerca de 15% | Escala própria de aplicação (seção 7.A) [PROPOSTA] |
| Cabeçalho de tabela escuro (`#1D2A24`) com zebra `#F1F2EC` | Bom para relatório impresso; em listas interativas com hover e seleção, polui e compete com o estado da linha | Cabeçalho claro e sem zebra; o cabeçalho escuro fica só para tabelas de demonstração financeira, se surgirem [PROPOSTA] |
| KPI escuro (`.aud-kpi` com valor em lima) | Em 4 páginas com 4 KPIs cada, viraria uma faixa escura pesada | KPI claro como padrão; variante escura opcional para no máximo 1 destaque [PROPOSTA] |
| Capa (fundo `#DDE1D1`, título enorme, coluna de ornamentos), rodapé com fio oliva, papel timbrado | Software não tem capa nem paginação | Não se aplica |
| Ornamentos (faixa e coluna de símbolos vazados) | O manual não traz regra de uso; em telas de trabalho seriam ruído | Não usar nas telas operacionais; no máximo em telas institucionais (não autorizado, 404), como acento [PROPOSTA] |
| Degradê verde | Só existe no modelo PowerPoint | Não usar |
| Modelo PowerPoint (Exo 2 Black, `#1C352E`, `#92B600`) | Divergências registradas (conflitos C1/C2/C4), restritas aos slides | Não usar no SGA |

### 3.3. Pendências da própria Skill que afetam o SGA

- **Cor das letras do logotipo.** O arquivo usa `#1C352E`, e a paleta declara `#1D2A24`. Usar os arquivos sem recolorir.
- **Versões do logotipo.** Não existem versão vertical negativa nem símbolo monocromático.
- **Tamanhos e grids.** Não há tamanhos tipográficos nem grid oficiais.
- **Papéis de cor.** A tabela, os KPIs e a escala de risco aguardam aprovação da AUDIMEC.

---

## 4. Comparação: SGA atual × AUDIMEC × proposta

| Elemento | Estado atual [CÓDIGO] | Padrão AUDIMEC [Skill] | Mudança recomendada [PROPOSTA] |
|---|---|---|---|
| Cor principal | `--brand` = `#1f6b45` | Verde-escuro `#1D2A24` (principal, OFICIAL) | `--brand` = `#1D2A24` (botão primário, títulos, sidebar) |
| Cor de acento | `--green-200 #b7e4c7` na sidebar | Verde-lima `#A7CF00` (OFICIAL; destaque sobre escuro, ADAPTAÇÃO) | `--accent` = `#A7CF00`, só sobre fundo escuro ou como fundo com texto escuro |
| Cor de apoio | — | `#3E7566` (H2, legendas, links, ADAPTAÇÃO) | Texto secundário, links, linhas de referência dos gráficos, foco |
| Fundo da página | `#f5f8f5` | `#F1F2EC` (OFICIAL, apoio) | `--background` = `#F1F2EC` |
| Bordas | `#e2e8e4` | `#DDE1D1` (borda, ADAPTAÇÃO) | `--border` = `#DDE1D1`; borda de campo de formulário reforçada (seção 7.A) |
| Tipografia | Inter 400/500/600/700 | Exo 2: ExtraBold 800 / Light 300 / Medium 500 (+ Bold 700 de ênfase) | Exo 2 com os 4 pesos; eliminar o 600 |
| Títulos de página | 28 px 700, frase normal | H1 ExtraBold, caixa alta nos exemplos (OBSERVADO) | 28 px **800**, frase normal (D2) |
| Rótulos de seção | 11 px 600 caixa alta (sidebar), 20 px 600 (seções) | H2 Light caixa alta | Rótulos de grupo (sidebar, "Velocidade", "Sinais", seções de formulário) em **Light caixa alta** 12–13 px com espaçamento de letras |
| Sidebar | `#123d2b`, quadrado "S", item ativo `green-800` + barra `green-200` | Fundo `#1D2A24` + logo `horizontal-negativa` (OFICIAL) | `#1D2A24`, logo SVG oficial ≥151 px, item ativo com barra lima de 3 px e fundo lima a 10% |
| Topbar | Branca, busca com borda, avatar e nome | — (sem regra) | Branca, fio inferior `#DDE1D1`, nome do produto "SGA" em Light caixa alta junto ao botão de menu |
| Cards | Borda + sombra + raio 12 | "Sem sombras ou efeitos" (ADAPTAÇÃO); raio 0 (ADAPTAÇÃO) | Borda `#DDE1D1`, **sem sombra**, raio 4 px (D4) |
| Botões | Primário verde `#1f6b45`, raio 8 | — | Primário `#1D2A24` com texto `#F1F2EC` (13,2:1) e hover `#3E7566`; raio 4 px |
| Selos de status | 6 tons preenchidos | Status sempre com texto; escala de risco com 4 verdes (ADAPTAÇÃO) | Selo **neutro** com marcador; cor de fundo só para alertas (D1) |
| KPI | Ícone em bloco colorido + valor 28/600 | KPI escuro com valor lima (ADAPTAÇÃO de relatório) | KPI claro: rótulo Medium, valor 28 px ExtraBold `#1D2A24`, sem bloco de ícone |
| Tabelas | Cabeçalho claro 12/600, hover verde | Cabeçalho escuro + zebra (ADAPTAÇÃO de relatório) | Cabeçalho claro, 12 px Bold caixa alta `#3E7566`, sem zebra |
| Gráficos | Série verde, limites vermelhos, destaque verde | Séries `#1D2A24…`; destaque lima com rótulo; grade `#DDE1D1` | Ver seções 8.5 e 8.6 (limites e sinais preservados) |
| Avatares | 6 verdes fixos fora da paleta | — | 3 combinações de cores oficiais (seção 7.B) |
| Ícones | Lucide 1,75 de traço, em várias cores | Lineares, finos, `#1D2A24`/`#3E7566` (OBSERVADO) | Manter o Lucide; cor única `#3E7566` (ou herdada); sem blocos de fundo |

---

## 5. Problemas identificados, por impacto

### Alto impacto

1. **A11** — Marca ausente: placeholder "S" e cores e fonte provisórias (`sidebar.html`, `_tokens.scss`, `index.html`).
2. **A12** — Poluição cromática dos selos: 6 tons em `StatusBadge` e prioridade em vermelho (`status-badge.ts`, `status.model.ts`).
3. **A13** — Decoração repetida: blocos de ícone nos KPIs, sombra em todos os cards (`kpi-card.ts`, `card.ts`, `--shadow-sm`).
4. **A14** — Mobile: sidebar fixa de 72 px e overflow de 43–45 px (`app-shell.ts`, grades do PTA, Qualidade).
5. **A15** — Kanban sobrecarregado: até 5 rótulos por cartão, com o selo de coluna redundante (`board-card.ts`).

### Médio impacto

6. **M21** — Escala tipográfica irregular: 9 tamanhos e o peso 600 (`*.scss`).
7. **M22** — Pílulas reimplementadas em 9 features.
8. **M23** — Primitivos `--green-*` usados diretamente em 25 arquivos, o que impede re-tematizar com segurança.
9. **M24** — Dashboard com colunas desbalanceadas e excesso de link verde no feed de atividade.
10. **M25** — Automações: blocos de ícone, selo de categoria e o texto "Fluxo previsto para a v0.2" repetido em cada cartão.

### Baixo impacto

11. **B31** — Halo de foco largo (3 px a 40%), pouco institucional.
12. **B32** — Raios grandes (12 px) em cards, destoando da composição geométrica da marca.
13. **B33** — `danger` sem hover; `font-feature-settings` exclusivos da Inter, que não valem para a Exo 2.

---

## 6. Direção estética proposta

### 6.1. Proposta principal: "institucional sóbrio"

- **Sidebar.**
  - Fundo verde-escuro `#1D2A24`.
  - No topo, o logotipo AUDIMEC horizontal negativo (SVG oficial, 152 px de largura, cerca de 28 px de altura), dentro de uma área de 64 px.
  - Itens em Medium 14 px `#F1F2EC` a 78%.
  - Rótulos de grupo em Light 12 px caixa alta, `#DDE1D1` a 60%.
  - Item ativo: barra lima de 3 px à esquerda, fundo lima a 10% e texto `#F1F2EC` a 100%.
  - O cadeado de "restrito" passa a `#A7CF00`.
- **Topbar.**
  - Fundo branco e fio inferior de 1 px `#DDE1D1`, sem sombra.
  - "SGA" em Light caixa alta 13 px, `#3E7566`, ao lado do botão de menu.
  - Busca com 360 px de largura, fundo `#F1F2EC` e sem borda (borda só no foco).
- **Superfícies.**
  - Página em `#F1F2EC`; cards e painéis brancos com fio `#DDE1D1`, sem sombra e com raio de 4 px.
  - Elevação (sombra) só em camadas sobrepostas: drawer, menus e toasts.
- **Tipografia.**
  - Títulos de página em Exo 2 ExtraBold 28 px `#1D2A24`.
  - Títulos de card em Bold 16 px.
  - Rótulos de seção e de grupo em Light caixa alta.
  - Corpo em Medium 14 px; secundário em Medium 13 px `#3E7566`.
- **Botões.**
  - Primário sólido `#1D2A24`.
  - Secundário branco com borda reforçada.
  - Fantasma com texto `#3E7566`.
  - Perigo vermelho (exceção D1). Raio de 4 px.
- **Tabelas.**
  - Cabeçalho claro (`#F1F2EC`, rótulos Bold 11–12 px caixa alta `#3E7566`) e divisórias `#DDE1D1`.
  - Linha com 44 px de altura e hover `#F1F2EC`.
  - Números à direita, com algarismos tabulares.
- **Navegação.**
  - Abas com sublinhado de 2 px `#1D2A24` e texto Bold.
  - Breadcrumb em `#3E7566`.
- **Formulários.** Campos de 36 px, raio de 4 px e borda reforçada; foco com contorno de 2 px `#3E7566` e afastamento de 2 px.
- **Gráficos.**
  - Série principal `#1D2A24`; referência e limites em `#3E7566`; grade `#DDE1D1`.
  - Um único destaque lima, sempre com rótulo ou contorno.
  - Vermelho apenas para pontos fora de controle.
- **Indicadores.** KPI claro e tipográfico: o número é o protagonista, sem ícone em bloco.

**Por que esta direção.**

- Usa só as cores oficiais na estrutura e no conteúdo.
- Reproduz a hierarquia do manual: ExtraBold / Light / Medium.
- Remove a decoração que hoje compete com os sinais.
- Mantém a densidade de uma ferramenta de trabalho.
- O lima, que é a cor mais característica da marca, ganha força por ser raro: estado ativo e "atenção".

### 6.2. Alternativa (não recomendada como principal): "sidebar clara"

- **Como seria:** sidebar `#F1F2EC` com o logotipo positivo e o verde-escuro só em textos e no estado ativo.
- **Vantagem:** visual mais leve.
- **Desvantagens:**
  - Perde o contraste estrutural que hoje separa a navegação do conteúdo.
  - Faz o logotipo competir com o conteúdo.
  - Exige mais mudanças no `sidebar.scss`, onde a cor branca está fixa em 10 pontos.

### 6.3. Decisões necessárias antes da Fase 1

| # | Decisão | Recomendação | Motivo |
|---|---|---|---|
| **D1** | Exceção à paleta para alertas | **Manter vermelho** (`#B42318` texto / `#FDE7E4` fundo) só para: falha, crítico, fora de controle, vencido, devolvido/com pendência e excluir/restaurar. **Âmbar sai**; "atenção" passa a lima com texto escuro (8,2:1). **Azul (`info`) sai**; passa a `#3E7566` | A Skill prevê o semáforo como exceção declarada. Em auditoria e CEP, o vermelho é convenção de leitura imediata. Restringi-lo aos alarmes reais aumenta a saliência |
| **D2** | Caixa alta em títulos | Caixa alta **só** nos rótulos de grupo e seção (Light). Títulos de página e de card em frase normal | Títulos dinâmicos ("Empresa Alfa S.A.", "PTA-REC-001 · Receita") perdem legibilidade em caixa alta; o manual não torna a caixa alta obrigatória |
| **D3** | Sidebar recolhida (72 px) | Usar o **símbolo 2 cores** (arquivo oficial). A marca completa aparece no estado expandido, que é o padrão acima de 1200 px. **Validar com a AUDIMEC** | O logotipo horizontal não cabe com o mínimo de 151 px; recriar ou reduzir é proibido |
| **D4** | Raio | 4 px em cards, campos e botões; 2 px em selos; círculo só em avatares e contadores | Equilíbrio entre o raio 0 do tema HTML da Skill e o conforto visual de componentes interativos |

---

## 7. Design System planejado

### 7.A. Design tokens (`frontend/src/styles/_tokens.scss`)

**Princípio:** não reconstruir. Acrescentar os primitivos AUDIMEC, redefinir os tokens de papel que já existem e manter os `--green-*` como **aliases de transição** até a Fase 3 removê-los das features.

**Novos primitivos** [AUDIMEC · OFICIAL]:

```scss
--aud-verde-escuro: #1D2A24;
--aud-verde-intermediario: #3E7566;
--aud-verde-oliva: #87A70C;
--aud-verde-lima: #A7CF00;
--aud-cinza-esverdeado: #DDE1D1;
--aud-branco-esverdeado: #F1F2EC;
```

**Tokens de papel redefinidos** (os nomes existentes ficam, para não alterar as features):

| Token existente | Atual | Proposto | Origem / contraste |
|---|---|---|---|
| `--background` | `#f5f8f5` | `--aud-branco-esverdeado` | OFICIAL (cor) |
| `--surface` | `#fff` | `#FFFFFF` | — |
| `--surface-muted` | `#f8faf8` | `--aud-branco-esverdeado` | OFICIAL (cor) |
| `--surface-sunken` | `#eef2ef` | `--aud-cinza-esverdeado` | OFICIAL (cor) |
| `--border` | `#e2e8e4` | `--aud-cinza-esverdeado` | ADAPTAÇÃO da Skill |
| `--border-strong` | `#cbd5ce` | `rgb(29 42 36 / 50%)` (verde-escuro a 50%) | PROPOSTA; ≈3,3:1 sobre branco, **medir na Fase 1** (exigência de 3:1 para bordas de campo) |
| `--text-primary` | `#17211b` | `--aud-verde-escuro` | OFICIAL; 14,9:1 |
| `--text-secondary` / `--text-muted` | `#66736a` / `#6f7b73` | `--aud-verde-intermediario` (os dois) | ADAPTAÇÃO; 5,3:1 no branco, 4,7:1 no `#F1F2EC` |
| `--text-on-brand` | `#fff` | `--aud-branco-esverdeado` | OFICIAL |
| `--brand` | `#1f6b45` | `--aud-verde-escuro` | OFICIAL |
| `--brand-hover` | `#185238` | `--aud-verde-intermediario` | OFICIAL; texto `#F1F2EC` sobre ele: 4,7:1 |
| `--brand-strong` | `#123d2b` | `--aud-verde-escuro` | — |
| `--brand-subtle` | `#dcf3e4` | `rgb(62 117 102 / 10%)` | PROPOSTA (transparência de cor oficial) |
| `--focus-ring` | halo de 3 px a 40% | `0 0 0 2px var(--surface), 0 0 0 4px var(--aud-verde-intermediario)` | PROPOSTA; contorno de 5,3:1 |
| **novo** `--accent` | — | `--aud-verde-lima` | OFICIAL; só sobre escuro ou como fundo com texto escuro |
| **novo** `--link` | — (`--brand`) | `--aud-verde-intermediario` | ADAPTAÇÃO (`.aud a`) |

**Semânticos** (dependem de D1):

| Tom | Atual | Proposto |
|---|---|---|
| `success-*` | verdes | texto `#3E7566`, fundo `rgb(62 117 102 / 12%)` |
| `info-*` | azul | **mesmo do success** (o azul sai) |
| `warning-*` | âmbar | fundo `#A7CF00`, texto `#1D2A24` (8,2:1); `warning-500` (marcadores) = `#A7CF00` com contorno `#1D2A24` |
| `danger-*` | `#b42318` / `#d92d20` / `#fde7e4` | **mantidos** (exceção D1) |
| `neutral-*` | cinzas | fundo `#DDE1D1`, texto `#1D2A24` |

**Escala de risco** (novos tokens) [AUDIMEC · ADAPTAÇÃO]:

| Token | Valor |
|---|---|
| `--risk-low-bg` | `#DDE1D1` |
| `--risk-medium-bg` | `#A7CF00` |
| `--risk-high-bg` | `#3E7566` (texto `#FFFFFF`) |
| `--risk-critical-bg` | `#1D2A24` (texto `#F1F2EC`) |

Para os aliases de transição dos `--green-*`, ver a tabela da Fase 1 (seção 10).

**Tipografia** (`_tokens.scss` + `_typography.scss` + `index.html`):

```scss
--font-sans: 'Exo 2', 'Segoe UI', Arial, sans-serif;  /* pilha de fallback = ADAPTAÇÃO da Skill */
--fw-display: 800;  /* H1 — OFICIAL */
--fw-light: 300;    /* H2/rótulos — OFICIAL */
--fw-body: 500;     /* texto — OFICIAL */
--fw-strong: 700;   /* ênfase — ADAPTAÇÃO */
```

Escala de aplicação [PROPOSTA; a escala HTML da Skill é de relatório]:

| Token | Tamanho | Uso |
|---|---|---|
| `--fs-page-title` | 28 px (800) | Título da página |
| `--fs-section-title` | 18 px (700) | Título de seção |
| `--fs-card-title` | 16 px (700) | Título de card |
| `--fs-body` | 14 px (500) | Corpo |
| `--fs-small` (novo) | 13 px (500) | Secundário |
| `--fs-meta` | 12 px | Meta e rótulos (rótulo em 300 caixa alta, com espaçamento de letras de 0,06 em) |
| `--fs-kpi` (novo) | 28 px (800) | Valor de KPI |

**Forma e profundidade** [PROPOSTA, D4]:

| Token | Atual | Proposto |
|---|---|---|
| `--radius-sm` | 6 | 2 |
| `--radius-md` | 8 | 4 |
| `--radius-lg` | 12 | 4 |
| `--shadow-sm` | — | `none` |
| `--shadow-md` / `--shadow-lg` | — | mantidas, com a tinta `rgb(29 42 36 / …)` |

**Mantidos sem mudança:** escala de espaçamento (4 px), alturas de controle (36/30), larguras de layout e transições.

**Tokens que deixam de existir ao final da Fase 3:** `--green-*`, `--info-*`, `--warning-500` com valor âmbar.

### 7.B. Componentes compartilhados (`shared/ui`)

| Componente | Padrão alvo |
|---|---|
| `button` | Altura 36/30, raio 4, Medium 14. Primário escuro, secundário com borda reforçada, fantasma com texto `#3E7566`; `danger` com hover `#912018`; desabilitado com opacidade 0,45; foco por token |
| `card` | Sem sombra, raio 4, fio `#DDE1D1`. Cabeçalho com título Bold 16 e subtítulo 13 `#3E7566`; padding 20/24 |
| `kpi-card` | Sem bloco de ícone: ícone opcional de 16 px `#3E7566` à direita do rótulo, sem fundo. Valor em `--fs-kpi`. O tom vira um marcador de 6 px ao lado do valor + texto da dica (nunca só cor). Variante `emphasis` (fundo `#1D2A24`, valor lima) para no máximo 1 KPI por página |
| `status-badge` | Altura 20, raio 2, 12 px Medium. Por padrão **sem fundo**: marcador quadrado de 6 px + texto `#1D2A24`. Fundo preenchido apenas nos tons `danger` (vermelho claro), `warning` (lima) e `risk-*`. O `brand` deixa de ser fundo escuro em selos de fluxo |
| **novo** `tag` | Rótulo neutro para categorias e tags: texto 12 px `#3E7566`, borda `#DDE1D1`, raio 2. Substitui as 9 pílulas locais |
| `data-table` | Cabeçalho `#F1F2EC` com rótulos Bold 11 px caixa alta (espaçamento 0,04 em) `#3E7566`; linhas de 44 px; hover `#F1F2EC`; foco por token; números à direita tabulares |
| `form-controls` | Raio 4, borda `--border-strong`, foco por token; selects com ícone `#3E7566` |
| `tabs` | Sublinhado de 2 px `#1D2A24`, ativa em Bold `#1D2A24`, inativa `#3E7566`; contador como `tag` |
| `drawer` | Backdrop `rgb(29 42 36 / 32%)`, `shadow-lg`, título Bold 18; rodapé com fio |
| `page-header` | Título 28/800; subtítulo 14 `#3E7566`; ações alinhadas à base do título |
| `breadcrumb` | 13 px `#3E7566`; atual em `#1D2A24` |
| `states` | Ícone sem círculo colorido (ícone de 24 px `#3E7566`); título Bold 15 |
| `avatar` | Paleta reduzida a combinações oficiais: `#1D2A24`/`#F1F2EC`, `#3E7566`/`#FFFFFF`, `#DDE1D1`/`#1D2A24` |
| `progress-bar` | Trilho `#DDE1D1`, preenchimento `#1D2A24` (ou `#3E7566`), altura 6, raio 0 |
| `toast` | Fundo `#1D2A24`, texto `#F1F2EC`, ícone lima; raio 4 |
| `icon` | Sem mudança técnica; cor por contexto (herdada) |

### 7.C. Densidade visual [PROPOSTA]

- **Densidade por tipo de tela.**
  - Telas operacionais (listas, Kanban, PTA) mantêm a densidade atual: linhas de 44 px, cards com padding de 20 px, corpo de 14 px.
  - Telas de leitura gerencial (Dashboard, Qualidade) ganham respiro entre grupos (32 px), não dentro dos grupos.
- **Limite de selos.** No máximo **1 selo colorido por linha ou cartão**; os demais atributos viram texto ou `tag` neutra.
- **Cor só onde há informação.**
  - Status de alarme: vermelho.
  - Atenção: lima.
  - Estado ativo: lima sobre escuro.
  - O resto em tons de verde-escuro e cinza.
- **Ícones** só onde ajudam a reconhecer: navegação, ações e tipo de arquivo. Nunca como enfeite de KPI ou de cartão de catálogo.
- **Nada some.** Nenhuma informação é retirada; o que sai é a repetição (selo de coluna no Kanban, texto "v0.2" repetido) e a decoração.

---

## 8. Recomendações por módulo

### 8.1. Dashboard (`features/dashboard/*`)

- **KPIs:** padrão `kpi-card` novo. "Pendências críticas" leva o marcador vermelho + texto; "Aguardando revisão" leva o marcador lima.
- **Progresso dos trabalhos:**
  - O status passa a selo neutro.
  - A barra fica em `#1D2A24` sobre `#DDE1D1`.
  - O prazo do relatório recebe tratamento tabular e alinhado.
- **Minhas tarefas:** prioridade "Alta" vira texto Bold, sem vermelho. O vermelho só aparece se a tarefa estiver **vencida** (estado de alarme).
- **Atividade recente:**
  - Nome do autor em Bold `#1D2A24`, verbo em 14 Medium.
  - Só o código do objeto (ex.: `PTA-REC-001`) vira link `#3E7566`, o que reduz o verde na coluna.
- **Automações recentes:** remover o bloco de ícone; o status vira selo neutro ("Concluída") ou vermelho ("Falhou").
- **Layout:**
  - Equilibrar as colunas: mover "Automações recentes" para a coluna esquerda, abaixo de "Minhas tarefas".
  - Limitar "Atividade" a 5 itens com link "Ver tudo".

### 8.2. Trabalhos (`features/engagements/*`)

- **Lista:** `data-table` no novo padrão; risco com a **escala de risco AUDIMEC** (selo preenchido + texto); status em selo neutro.
- **Detalhe — cabeçalho:** cliente em H1, status em selo neutro e linha de metadados com rótulos Light caixa alta.
- **Detalhe — KPIs:** sem blocos de ícone.
- **"Situação dos PTAs":** substituir os 6 selos coloridos por uma lista de rótulos neutros com contagem, mais uma **barra empilhada monocromática** (tons `#1D2A24 → #3E7566 → #DDE1D1`) com legenda textual. Só "Com pendência" em vermelho.
- **Abas:** padrão `tabs` novo; contadores como `tag`.

### 8.3. PTAs (`features/workpapers/*`)

- **Estrutura documental:** numeração das seções com o número em Light 18 `#3E7566`, sem quadrado `green-50`; títulos de seção em Bold 16.
- **Meta strip:** rótulos Light caixa alta 11–12 px; valores Medium 14.
- **Fluxo formal (`status-flow`):** etapas concluídas com marcador `#1D2A24` e check `#F1F2EC`; etapa atual com anel lima de 2 px. A ramificação "Com pendência" continua visível, em vermelho só quando ativa.
- **Ações formais:** primária escura; "Devolver" como secundário com texto vermelho (não sólido); motivos de bloqueio em 13 px `#3E7566` com cadeado.
- **Review notes:** selo de severidade (Baixa neutro, Média lima, Alta/Crítica vermelho); "Aberto" em lima e "Resolvido" neutro com check.
- **Histórico:** linha do tempo com marcadores de 24 px `#DDE1D1` e ícone `#1D2A24`; ciclos com selo de resultado (Devolvido em vermelho, Aprovado neutro com check).
- **Responsivo (A14):**
  - em < 640 px, Procedimentos passa a `grid-template-columns: 22px 1fr`, com o botão de automação em linha própria;
  - Exceções passa a pilha (ID e valor numa linha, descrição abaixo);
  - eliminar os 45 px de overflow.

### 8.4. Kanban (`features/workflow/*`)

- **Colunas:** fundo `#F1F2EC` sem borda; cabeçalho com marcador quadrado na cor do status (neutro, lima para revisão, vermelho para pendência) + título Bold + contador `tag`.
- **Cartão:** branco, fio `#DDE1D1`, raio 4. Ordem:
  1. linha superior com o tipo em texto 12 px `#3E7566` e o ícone + código;
  2. título Bold 14;
  3. tags como texto 12 px separado por "·";
  4. rodapé com prazo, avatar e prioridade (texto, sem cor).
- **O selo de coluna sai** do cartão, porque repete o cabeçalho.
- **Status formal do PTA:** "PTA: <status>" continua, e só ganha destaque (lima e ícone) quando diverge da coluna, o que preserva a regra do 02A.
- **Arrastar:** pré-visualização com `shadow-lg`; espaço reservado com tracejado `#3E7566`.
- **Painel de detalhes:** padrão `drawer`, com metadados em lista de 2 colunas.

### 8.5. Qualidade & Processos (`features/quality/*`)

Nada do que sustenta a leitura estatística é removido: série, LC, LSC/LIC, faixa de referência, marcadores de sinal, rótulos, tooltip e tabela acessível.

- **Cartas** (`control-chart.scss`):

  | Elemento | Atual | Proposto |
  |---|---|---|
  | Série | `green-700` | `#1D2A24`, 2 px |
  | Pontos | — | 3,5 px `#1D2A24` |
  | LC | `text-secondary` | `#3E7566` contínua, 1,5 px |
  | LSC/LIC | vermelhas tracejadas | `#3E7566` tracejadas (6/4), 1,5 px; distinguem-se da LC pelo tracejado e pelos rótulos |
  | Faixa de referência | — | `#F1F2EC` (já é) |
  | Grade | — | `#DDE1D1` |

- **Sinais:**
  - **fora de controle:** losango vermelho (o único vermelho da carta), com rótulo do valor;
  - **atenção (tendência ou variabilidade):** círculo lima com contorno `#1D2A24` (a Skill exige contorno para o lima em gráficos);
  - **informativo:** círculo `#3E7566`.
- **Lista de sinais:** severidade Crítico em vermelho preenchido, Atenção em lima com texto escuro, Informativo neutro, cada uma com ícone e texto.
- **Filtros:** barra no padrão `form-controls`; o recorte atual em `tag`.
- **Hierarquia:**
  - nomes das dimensões ("Velocidade", "Qualidade"…) como rótulo Light caixa alta 13 px com a pergunta gerencial ao lado;
  - título do indicador em Bold 16;
  - método ("Carta I-MR") como `tag`.
- **Drill-down:**
  - cadeia "Onde olhar" com marcadores `#1D2A24` e trilho `#DDE1D1`;
  - links "Abrir trabalho/PTA/quadro" em `#3E7566`;
  - avisos de vínculo ausente em `#F1F2EC`.
- **Mobile:** corrigir os 43 px de overflow. O drawer de 560 px, a lista de sinais com grade de 112 px fixos e a largura mínima da carta são candidatos; **diagnosticar na Fase 6**.

### 8.6. Automações e Análise de Dados

- **Catálogo** (`automation-catalog-page.scss`):
  - ícone `#3E7566` sem bloco de fundo;
  - categoria como `tag`;
  - filtros como abas ou `tag` selecionável (selecionado em `#1D2A24` com texto `#F1F2EC`);
  - "Fluxo previsto para a v0.2" vira **um único** aviso no topo da grade, e os cartões indisponíveis ficam com "Executar" secundário e o selo "Em breve".
- **Assistente** (`sample-selection-wizard.scss`, 13 usos de `--green-*`):
  - indicador de etapas no mesmo padrão do `status-flow` do PTA;
  - formulários no padrão novo;
  - resultado com tabela padrão e destaque de cobertura em KPI claro.
- **Análise de Dados:**
  - barras mensais em `#3E7566`; o mês de pico em `#A7CF00` com contorno `#1D2A24` e rótulo de valor (regra de destaque único da Skill);
  - barras de exceção em `#1D2A24` sobre trilho `#DDE1D1`, no lugar do âmbar;
  - tabela padrão; alerta de lançamento em selo vermelho só para alertas reais.

---

## 9. Matriz de componentes e arquivos afetados

| Área | Arquivos | Fase |
|---|---|---|
| Tokens e tipografia | `styles/_tokens.scss`, `styles/_typography.scss`, `styles/_reset.scss`, `styles/styles.scss`, `src/index.html` (fonte) | 1 |
| Marca (assets) | `frontend/public/brand/` (novo, cópia dos SVGs oficiais: `audimec-logo-horizontal-negativa.svg`, `audimec-logo-horizontal.svg`, `audimec-simbolo-2cores.svg`) | 1 |
| Avatar | `shared/ui/avatar/avatar.ts` | 1 |
| Navegação | `layout/sidebar/{sidebar.html,scss}`, `layout/topbar/{topbar.html,scss}`, `layout/app-shell/app-shell.ts`, `shared/ui/page-header`, `shared/ui/breadcrumb` | 2 |
| Componentes | `shared/ui/{button,card,kpi-card,status-badge,data-table,form,tabs,drawer,states,progress-bar,toast}`; novo `shared/ui/tag` | 3 |
| Modelos de tom | `core/models/status.model.ts` (só o **mapeamento de tom de prioridade**; nenhuma regra muda) | 3 |
| Dashboard | `features/dashboard/dashboard-page.{html,scss}` | 4 |
| Trabalhos | `features/engagements/engagement-list-page.ts`, `engagement-detail/*` | 4 |
| PTAs | `features/workpapers/workpaper-detail/*` (scss, `status-flow`, `workflow-history`, `review-notes-panel`) | 4 |
| Kanban | `features/workflow/board-{page,card}.{html,scss,ts}` | 4 |
| Qualidade | `features/quality/control-chart/control-chart.scss`, `metric-card`, `signal-list`, `drill-down`, `quality-page.scss` | 5 |
| Automações e Análise | `features/automations/*`, `features/analytics/*` | 5 |
| Demais páginas | `tasks`, `system`, `reports`, `documents`, `settings` (placeholders) | 6 |

**Fora do alcance:** serviços, repositórios, modelos de domínio (exceto mapeamentos de tom), cálculos estatísticos (`control-limits.ts`, `control-signals.ts`, `quality-analysis.ts`), workflow formal (`workpaper-workflow.ts`) e mocks.

---

## 10. Roadmap de implementação por fases

### Fase 1 — Identidade e design tokens · **P0**

- **Objetivo:** aplicar as cores, a fonte e o logotipo AUDIMEC pela camada de tokens, sem tocar nas features.
- **Pré-requisito:** decisões D1–D4 (seção 6.3).
- **Mudanças:**
  1. Carregar a Exo 2 (300, 500, 700, 800) no lugar da Inter em `index.html`, ou hospedá-la a partir dos TTF da Skill (licença OFL). Remover `font-feature-settings` da Inter.
  2. **Verificar** o suporte a `tabular-nums` (`tnum`) na Exo 2. Se faltar, é risco R1.
  3. Acrescentar os primitivos `--aud-*` e redefinir os tokens de papel (seção 7.A).
  4. Aliases de transição dos `--green-*`, escolhidos pelo **papel predominante** de cada um:

     | Alias | Valor | Papel predominante |
     |---|---|---|
     | `--green-950` | `#1D2A24` | Sidebar, fundos escuros |
     | `--green-800` | `#1D2A24` | Ativo/hover sobre escuro |
     | `--green-700` | `#1D2A24` | Marca e séries |
     | `--green-500` | `#3E7566` | Hover de borda e foco |
     | `--green-200` | `#A7CF00` | Acento sobre escuro (sidebar). **Revisar** os usos sobre fundo claro na Fase 3 (trilhos e anéis) |
     | `--green-100` | `rgb(62 117 102 / 14%)` | Fundos sutis |
     | `--green-50` | `#F1F2EC` | Hover e realce leve |

  5. Novos tokens: `--accent`, `--link`, `--fw-*`, `--fs-small`, `--fs-kpi` e `--risk-*`.
  6. Raios e sombras conforme D4.
  7. Avatar com as 3 combinações oficiais.
  8. Copiar os SVGs oficiais para `public/brand/`, sem uso ainda (Fase 2).
- **Dependências:** nenhuma de código. Depende de D1–D4.
- **Critérios de conclusão:**
  - build e 146 testes passando;
  - fonte efetiva "Exo 2" (computed style);
  - nenhuma cor fora da paleta em `_tokens.scss`, exceto `danger-*` (D1) e transparências de cores oficiais;
  - contraste ≥4,5:1 para texto e ≥3:1 para bordas de campo, medido;
  - capturas de comparação nas 3 resoluções.

### Fase 2 — Estrutura de navegação · **P0**

- **Objetivo:** dar a assinatura da marca à moldura e corrigir a navegação no celular.
- **Mudanças:**
  1. **Sidebar.** Logo `horizontal-negativa` (152 px, `<img>` com `alt="AUDIMEC Auditores Independentes"`) com área de proteção ≥22 px nas laterais e ≥17 px acima e abaixo. O item ativo e os rótulos seguem a seção 6.1. No estado recolhido, `simbolo-2cores` (D3). Remover o quadrado "S".
  2. **Topbar.** Fio inferior, "SGA" em Light caixa alta, busca sem borda em repouso.
  3. **App shell em < 768 px.** A sidebar sai do fluxo e vira gaveta sobreposta, aberta pelo botão de menu, com `cdkTrapFocus` e Esc. O conteúdo passa a ocupar 100% da largura.
  4. **`page-header` e `breadcrumb`** no padrão novo.
- **Arquivos:** `layout/*`, `shared/ui/page-header`, `shared/ui/breadcrumb`.
- **Dependências:** Fase 1.
- **Critérios de conclusão:**
  - o logotipo nunca fica abaixo de 151 px nem distorcido (proporção 5,4568);
  - teclado: pular para o conteúdo, navegar e fechar a gaveta com Esc;
  - o teste `sidebar.spec.ts` continua passando;
  - sem overflow em 390 px na moldura.

### Fase 3 — Componentes compartilhados · **P0/P1**

- **Objetivo:** padronizar e reduzir a cor semântica.
- **Mudanças:**
  1. Todos os componentes da seção 7.B.
  2. Criar `shared/ui/tag`.
  3. Mapear `PRIORITY_META` (média e alta) para tons neutros. **Só apresentação**: o tipo `StatusTone` e os rótulos ficam.
  4. Substituir os `var(--green-NNN)` das features por tokens de papel e remover os aliases.
  5. Trocar as 9 pílulas locais por `tag` ou `status-badge`.
- **Dependências:** Fases 1 e 2.
- **Critérios de conclusão:**
  - nenhum `--green-` fora de `_tokens.scss`;
  - nenhum `radius-pill` fora de avatar, contador e `tag`;
  - nenhum `font-weight: 600`;
  - estados de hover, foco, ativo e desabilitado conferidos em cada componente.

### Fase 4 — Páginas principais · **P1**

- **Objetivo:** aplicar o padrão ao Dashboard, Trabalhos, PTAs e Kanban (seções 8.1–8.4).
- **Pontos críticos:**
  - PTA responsivo (Procedimentos e Exceções);
  - Kanban sem selo de coluna;
  - "Situação dos PTAs" monocromático;
  - reorganização do Dashboard.
- **Dependências:** Fase 3.
- **Critérios de conclusão:**
  - no máximo 1 selo colorido por linha ou cartão;
  - overflow zero em 390 px no PTA;
  - jornadas do 02A (envio → aprovação) e arrastar no Kanban funcionando como antes.

### Fase 5 — Páginas analíticas · **P1**

- **Objetivo:** Qualidade, Automações e Análise (seções 8.5–8.6).
- **Dependências:** Fase 3.
- **Critérios de conclusão:**
  - todas as linhas e limites das cartas presentes, com sinais distinguíveis por **forma** (losango e círculo) além da cor;
  - a tabela acessível das cartas continua;
  - as legendas mostram os novos estilos;
  - os testes de Qualidade (`control-limits`, `control-signals`, `quality-analysis`, `quality-links`) continuam passando;
  - overflow zero em 390 px em Qualidade.

### Fase 6 — Refinamento · **P2**

- **Objetivo:** revisão final.
- **Escopo:**
  - páginas auxiliares;
  - responsividade em 1024 e 390;
  - alinhamentos e ritmo vertical;
  - consistência de foco;
  - mensagens vazias;
  - ornamento opcional em "Acesso não autorizado" e 404 (a decidir).
- **Critérios de conclusão:** a checklist da seção 11 completa nas 3 resoluções.

---

## 11. Critérios de aceitação visual

| Critério | Verificação objetiva |
|---|---|
| Fidelidade AUDIMEC | Todas as cores computadas pertencem à paleta oficial, às transparências delas, a branco ou a `danger-*` (D1). Script de varredura de `getComputedStyle` nas páginas principais |
| Logotipo | Arquivo oficial, ≥151 px, proporção 5,4568 ± 2%, sem filtro ou recoloração; versão correta por fundo |
| Tipografia | `font-family` efetiva Exo 2; pesos só 300, 500, 700 e 800; tamanhos só os 7 tokens |
| Cromia | ≤1 selo colorido por linha ou cartão; vermelho só nos estados de D1; lima nunca como texto sobre fundo claro |
| Hierarquia | Em cada página, um H1 (800), títulos de card (700) e rótulos de seção (300 caixa alta) distinguíveis à primeira vista |
| Poluição visual | Sem sombra em superfícies estáticas; sem blocos de ícone decorativo; sem texto repetido em cartões |
| Contraste | Texto ≥4,5:1; bordas de campo e componentes ≥3:1; foco ≥3:1 (medição automatizada com valores computados) |
| Tabelas | Cabeçalho legível, números alinhados à direita e tabulares, linha de 44 px, hover e foco visíveis |
| Gráficos | LC, LSC, LIC, faixa de referência, sinais e rótulos presentes; sinais distinguíveis em escala de cinza (forma) |
| Responsividade | Overflow horizontal = 0 em 1440, 1024 e 390 em todas as páginas; navegação utilizável por toque em 390 |
| Estados | Hover, foco (teclado), selecionado, desabilitado e carregando em botões, campos, abas, linhas e cartões |
| Interações preservadas | Suíte completa verde; jornadas do 02A, drill-down de Qualidade, troca de persona, guard de Qualidade e arrastar no Kanban validados no navegador |

**Comparação antes e depois:**

- **Capturas.** Repetir as capturas desta auditoria (Chrome headless, persona Sócio + Gerente, `localStorage` limpo) nas mesmas páginas (Dashboard, Trabalhos, detalhe do Trabalho, PTA, Kanban, Automações, assistente, Análise e Qualidade) e resoluções: 1440×900 (dobra + página inteira), 1024×768 e **390×844** (iPhone 12–14, móvel com toque).
- **Pares.** Comparar cada par lado a lado no relatório da fase.
- **Métricas registradas em cada fase:**
  - overflow horizontal;
  - quantidade de cores distintas computadas;
  - quantidade de selos coloridos por tela;
  - fonte efetiva.

---

## 12. Riscos e cuidados

| # | Risco | Mitigação |
|---|---|---|
| R1 | A Exo 2 é mais larga que a Inter: textos truncados (sidebar "Qualidade & Processos", cabeçalhos de tabela, KPIs, botões) e possível ausência de `tnum` | Medir na Fase 1. Ajustar larguras e quebras. Se não houver `tnum`, manter as colunas numéricas com `font-variant-numeric` e alinhamento à direita e avaliar as larguras |
| R2 | Aliases `--green-*` com papéis mistos (ex.: `green-200` sobre fundo claro) | A tabela de aliases da Fase 1 lista o caso. A Fase 3 elimina os aliases |
| R3 | Remover o âmbar e o azul pode diminuir a distinção entre status de fluxo | Selos neutros com **texto** e marcador; atenção em lima; testes de leitura em escala de cinza |
| R4 | Vermelho fora da paleta (D1) | Exceção declarada e restrita aos estados listados, para validação da AUDIMEC |
| R5 | Símbolo na sidebar recolhida (D3) | Validar com a AUDIMEC; alternativa: sidebar recolhida sem marca |
| R6 | Testes que dependem de texto ou estrutura (`sidebar.spec.ts`, cartões do Kanban) | Mudanças visuais só em CSS e templates de apresentação; rodar a suíte em toda fase |
| R7 | Gaveta móvel na Fase 2 introduz comportamento novo | Reutilizar o padrão do `sga-drawer` (`cdkTrapFocus`, Esc); restrita a < 768 px |
| R8 | Lima sobre fundo claro em gráficos e selos | Sempre com contorno ou texto escuro; nunca como texto |
| R9 | Mudanças de layout no Dashboard e no Kanban mexerem em interações | Reorganizar só a ordem e o estilo dos blocos; sem alterar componentes de interação nem dados |

**Não fazer em nenhuma fase:**

- alterar regras de negócio, cálculos estatísticos, workflow formal, repositórios ou mocks;
- adicionar bibliotecas de componentes;
- recriar ou recolorir o logotipo;
- usar cores fora da paleta além da exceção D1.

---

## 13. Próxima fase recomendada

**Fase 1 — Identidade e design tokens** (P0), a executar **após a confirmação das decisões D1–D4**.

Motivos:

- É a mudança de maior impacto visual pelo menor esforço: cerca de 6 arquivos (`_tokens.scss`, `_typography.scss`, `_reset.scss`, `styles.scss`, `index.html`, `avatar.ts`) mais a cópia dos SVGs oficiais.
- Resolve de uma vez a fonte, as cores oficiais e o fim das cores provisórias.
- É reversível e não toca em lógica.
- As Fases 2 a 5 dependem dela.

---

## Matriz final de prioridades

| Prioridade | Elemento | Mudança | Impacto visual | Complexidade |
|---|---|---|---|---|
| P0 | Tokens de cor | Paleta AUDIMEC nos tokens de papel + aliases `--green-*` | Muito alto | Baixa |
| P0 | Tipografia | Exo 2 (300/500/700/800), fim do 600 | Muito alto | Baixa (risco R1 médio) |
| P0 | Marca | Logotipo oficial negativo na sidebar; símbolo no estado recolhido | Muito alto | Baixa |
| P0 | Cores semânticas | Âmbar → lima; azul → verde-intermediário; vermelho só para alarmes (D1) | Alto | Baixa (tokens) a média (prioridade) |
| P0 | Cards e sombras | Sem sombra; raio 4 | Alto | Baixa |
| P0 | Navegação móvel | Gaveta < 768 px; fim da sidebar fixa de 72 px | Alto (mobile) | Média |
| P1 | `StatusBadge` + `tag` | Selo neutro com marcador; `tag` para categorias; fim das 9 pílulas locais | Alto | Média |
| P1 | `KpiCard` | Sem bloco de ícone; valor em ExtraBold | Alto | Baixa |
| P1 | Kanban | Cartão sem selo de coluna; prioridade em texto | Alto | Baixa |
| P1 | PTA responsivo | Procedimentos e Exceções empilhados em < 640 px; overflow zero | Médio (mobile alto) | Baixa |
| P1 | Cartas de controle | Série `#1D2A24`, limites `#3E7566` tracejados, vermelho só fora de controle, lima com contorno | Médio | Baixa |
| P1 | Dashboard | Colunas equilibradas; feed com menos links | Médio | Baixa |
| P1 | `DataTable` | Cabeçalho Bold caixa alta `#3E7566`; linha de 44 px | Médio | Baixa |
| P2 | Automações | Ícone sem bloco; aviso v0.2 único; filtros como `tag` | Médio | Baixa |
| P2 | Análise de Dados | Barras `#3E7566` + destaque lima rotulado; exceções sem âmbar | Médio | Baixa |
| P2 | Remoção dos aliases | `var(--green-NNN)` → tokens de papel em 25 arquivos | Baixo (visual) / alto (manutenção) | Média |
| P2 | Páginas auxiliares e ornamento institucional | Acabamento | Baixo | Baixa |
