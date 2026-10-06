export interface LedgerEntry {
  readonly document: string;
  readonly date: string;
  readonly account: string;
  readonly description: string;
  readonly amount: number;
  readonly flag?: string;
}

export interface MonthlyVolume {
  readonly month: string;
  readonly amount: number;
  readonly entries: number;
}

export interface LedgerAnalysis {
  readonly engagementId: string;
  readonly datasetName: string;
  readonly entryCount: number;
  readonly totalAmount: number;
  readonly exceptionCount: number;
  readonly exceptionBreakdown: readonly { readonly rule: string; readonly count: number }[];
  readonly topEntries: readonly LedgerEntry[];
  readonly monthly: readonly MonthlyVolume[];
}
