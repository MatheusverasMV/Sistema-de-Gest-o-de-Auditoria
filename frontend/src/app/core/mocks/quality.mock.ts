import { QualityDataset } from '../models';

const CYCLE_TIMES = [
  4.2, 3.8, 5.1, 4.6, 3.9, 4.4, 5.0, 4.1, 4.7, 11.2, 3.6, 4.3, 4.9, 5.2, 4.0, 3.7, 4.5, 10.4, 4.8,
  4.2,
];

const CYCLE_NOTES: Record<number, string> = {
  29: 'PTA-FOR-301 (Gama S.A.) aguardou documentação de partes relacionadas.',
  37: 'Acúmulo de revisões no fechamento do 3º tri — Empresa Alfa S.A.',
};

export const QUALITY_DATASET: QualityDataset = {
  // Média semanal do tempo entre "Aguardando revisão" e "Finalizado", semanas 20 a 39 de 2026.
  reviewCycleTime: CYCLE_TIMES.map((value, index) => {
    const week = 20 + index;
    return { period: `S${week}`, value, note: CYCLE_NOTES[week] };
  }),
  // PTAs devolvidos ao preparador ÷ PTAs revisados no mês.
  reworkRate: [
    { period: 'out/25', defective: 5, inspected: 42 },
    { period: 'nov/25', defective: 6, inspected: 48 },
    { period: 'dez/25', defective: 7, inspected: 55 },
    { period: 'jan/26', defective: 4, inspected: 38 },
    { period: 'fev/26', defective: 5, inspected: 41 },
    { period: 'mar/26', defective: 6, inspected: 50 },
    {
      period: 'abr/26',
      defective: 17,
      inspected: 52,
      note: 'Entrada de 4 novos assistentes; 9 devoluções concentradas em Gama S.A.',
    },
    { period: 'mai/26', defective: 6, inspected: 57 },
    { period: 'jun/26', defective: 7, inspected: 60 },
    { period: 'jul/26', defective: 5, inspected: 49 },
    { period: 'ago/26', defective: 6, inspected: 58 },
    { period: 'set/26', defective: 8, inspected: 64 },
  ],
  engagementsAtRisk: ['eng-gama-2026', 'eng-alfa-2026'],
};
