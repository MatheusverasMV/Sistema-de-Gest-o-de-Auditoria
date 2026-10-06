# SGA — Frontend (MVP Visual v0.1)

Protótipo navegável do **SGA — Sistema de Gestão e Automação de Auditoria**. Todos os dados são fictícios e não há backend: a aplicação roda inteira no navegador.

## Como rodar

Requer Node.js 20.19+ (testado com 24.21 LTS).

```bash
npm install
npm start          # http://localhost:4200
npm run build      # build de produção em dist/
npm test -- --watch=false
npx prettier --check "src/**/*.{ts,html,scss}"
```

## Demonstração

- **Persona**: menu do usuário (canto superior direito) → "Persona de demonstração". A persona padrão é Matheus Veras (Auditor Pleno).
- **Qualidade & Processos** só aparece para Sócios (Helena Duarte, Carlos Martins). O acesso direto a `/quality` por outros cargos leva à tela de acesso não autorizado.
- **Estado**: alterações em PTAs e automações ficam em memória e são descartadas ao recarregar a página. O quadro Kanban é salvo em `localStorage`; use "Restaurar quadro" para voltar ao estado inicial.
- **Data de referência**: o protótipo usa um relógio fixo em 06/10/2026 (`core/config/prototype.config.ts`), para que prazos e atrasos fiquem coerentes com os mocks.

## Arquitetura

```
src/app/
  core/
    models/        entidades e metadados de status (regra Sócio/Gerente em user.model.ts)
    mocks/         base fictícia única e centralizada
    data/          contratos de repositório (repositories.ts) + implementações mock
    auth/          sessão simulada, AccessPolicy e guard
    services/      diretório de pessoas, notificações, toasts
  layout/          app shell, sidebar, topbar
  shared/ui/       design system mínimo (Button, Card, KpiCard, DataTable, Tabs, Drawer…)
  features/        dashboard, engagements, workpapers, tasks, workflow, automations,
                   analytics, quality, reports, documents, settings, system
src/styles/        tokens, reset e tipografia
```

O fluxo de dados é **Componente → Serviço da feature → Repositório abstrato → implementação mock**. Os repositórios são classes abstratas usadas como token de DI e retornam `Observable`. Para integrar com a API Django, basta criar implementações HTTP e trocar `provideMockRepositories()` em `app.config.ts`; os componentes não mudam.

## Decisões técnicas

- **Angular 22** standalone, zoneless e com OnPush (padrão da versão). O estado usa signals, e as leituras assíncronas usam `rxResource`, que já entrega loading e erro.
- **Angular CDK** para drag and drop do Kanban, menus acessíveis e focus trap no drawer.
- **Ícones**: pacote `lucide` (vanilla) com um componente `<sga-icon>` próprio, porque o `lucide-angular` ainda não suporta Angular 22. Os ícones ficam registrados em `shared/ui/icon/icons.ts`.
- **Gráficos**: SVG próprio, sem biblioteca, pois são apenas duas cartas de controle. A estatística (carta I-MR e carta p) fica em `features/quality/control-limits.ts`, separada da renderização e coberta por testes.
- **Identidade visual**: todas as cores são tokens em `styles/_tokens.scss`. Os verdes são provisórios.
- **"Baixar Excel"** gera um CSV compatível com Excel pt-BR (separador `;`, BOM UTF-8). A geração real de `.xlsx` fica para o backend.
