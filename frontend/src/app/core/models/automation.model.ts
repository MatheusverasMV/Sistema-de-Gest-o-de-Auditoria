import { StatusMeta } from './status.model';

export type AutomationCategory =
  'Amostragem' | 'Conciliação' | 'Folha' | 'Receita' | 'Despesas' | 'Dados' | 'Documentos';

export const AUTOMATION_CATEGORIES: readonly AutomationCategory[] = [
  'Amostragem',
  'Conciliação',
  'Folha',
  'Receita',
  'Despesas',
  'Dados',
  'Documentos',
];

export interface Automation {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: AutomationCategory;
  /** Nome de ícone do registro de ícones da UI. */
  readonly icon: string;
  readonly inputs: string;
  readonly estimatedTime: string;
  /** Somente automações com fluxo implementado no protótipo podem ser executadas. */
  readonly available: boolean;
}

export type ExecutionStatus = 'success' | 'failed' | 'running';

export const EXECUTION_STATUS_META: Record<ExecutionStatus, StatusMeta> = {
  success: { label: 'Concluída', tone: 'success' },
  failed: { label: 'Falhou', tone: 'danger' },
  running: { label: 'Em execução', tone: 'info' },
};

export interface AutomationExecution {
  readonly id: string;
  readonly automationId: string;
  readonly engagementId: string;
  readonly workpaperId?: string;
  readonly executedById: string;
  readonly executedAt: string;
  readonly status: ExecutionStatus;
  readonly summary: string;
}

export type SelectionMethod = 'monetary' | 'random' | 'stratified';

export const SELECTION_METHOD_LABELS: Record<SelectionMethod, string> = {
  monetary: 'Unidade monetária (MUS)',
  random: 'Aleatória simples',
  stratified: 'Estratificada por valor',
};

export interface SampleSelectionConfig {
  readonly fileName: string;
  readonly engagementId: string;
  readonly materiality: number;
  readonly method: SelectionMethod;
  readonly minimumItems: number;
}

export interface SampleItem {
  readonly document: string;
  readonly date: string;
  readonly account: string;
  readonly description: string;
  readonly amount: number;
  readonly reason: 'Acima da materialidade' | 'Seleção estatística';
}

export interface SampleSelectionResult {
  readonly executionId: string;
  readonly config: SampleSelectionConfig;
  readonly populationCount: number;
  readonly populationValue: number;
  readonly items: readonly SampleItem[];
  readonly coveredValue: number;
  readonly coverage: number;
}
