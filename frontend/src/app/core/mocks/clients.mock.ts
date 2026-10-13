import { AuditArea, Client } from '../models';

/** Clientes do protótipo. Os ids já eram usados pelo módulo Qualidade e foram mantidos. */
export const CLIENTS: readonly Client[] = [
  { id: 'cli-alfa', name: 'Empresa Alfa S.A.', shortName: 'Alfa' },
  { id: 'cli-beta', name: 'Beta Ltda.', shortName: 'Beta' },
  { id: 'cli-gama', name: 'Gama S.A.', shortName: 'Gama' },
];

/** Catálogo de áreas de auditoria usadas por PTAs e observações de Qualidade. */
export const AUDIT_AREAS: readonly AuditArea[] = [
  { id: 'area-caixa', name: 'Caixa e Equivalentes', code: 'CXA' },
  { id: 'area-contas-receber', name: 'Contas a Receber', code: 'CR' },
  { id: 'area-receita', name: 'Receita', code: 'REC' },
  { id: 'area-estoques', name: 'Estoques', code: 'EST' },
  { id: 'area-fornecedores', name: 'Fornecedores', code: 'FOR' },
  { id: 'area-folha', name: 'Folha', code: 'FOL' },
  { id: 'area-imobilizado', name: 'Imobilizado', code: 'IMO' },
  { id: 'area-tributos', name: 'Tributos', code: 'TRB' },
];
