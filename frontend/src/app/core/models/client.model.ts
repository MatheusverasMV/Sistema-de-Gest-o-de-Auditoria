/** Cliente auditado. Chave canônica para trabalhos e para recortes de Qualidade. */
export interface Client {
  readonly id: string;
  /** Razão social exibida nas telas (ex.: "Empresa Alfa S.A."). */
  readonly name: string;
  /** Forma curta para rótulos compactos (ex.: "Alfa"). */
  readonly shortName: string;
}

/**
 * Área de auditoria. Hoje PTAs e observações estatísticas guardam o nome da área
 * (`area`/`auditArea`); o nome é a chave e precisa existir neste catálogo.
 */
export interface AuditArea {
  readonly id: string;
  readonly name: string;
  /** Sigla usada nos códigos de PTA (ex.: REC em PTA-REC-001). */
  readonly code: string;
}
