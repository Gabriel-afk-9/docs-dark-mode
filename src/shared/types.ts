/**
 * Tipos de domínio compartilhados. Nenhuma dependência de APIs do navegador
 * é permitida neste módulo (ver PRD 7.4).
 */

/** Preferência persistida do usuário. */
export type ThemePreference = {
  readonly enabled: boolean;
};

/** Preferência aplicada quando não há valor salvo (padrão do PRD: desativado). */
export const DEFAULT_PREFERENCE: ThemePreference = { enabled: false };

/** Códigos de erro estáveis, usados internamente e mapeados para mensagens. */
export type DdmErrorCode =
  | 'STORAGE_READ_FAILED'
  | 'STORAGE_WRITE_FAILED'
  | 'TAB_QUERY_FAILED'
  | 'CONTENT_UNREACHABLE'
  | 'INVALID_MESSAGE'
  | 'UNSUPPORTED_PAGE'
  | 'APPLY_FAILED';

/** Erro da aplicação, com causa opcional para diagnóstico técnico. */
export type DdmError = {
  readonly code: DdmErrorCode;
  readonly cause?: unknown;
};

/** Resultado explícito: evita exceções como fluxo de controle. */
export type Result<T, E = DdmError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/**
 * Estado do tema na página, conforme RF-05.
 * `canvas-filter` é experimental e só pode ser considered aprovado após
 * validação manual documentada.
 */
export type DocumentThemeState = 'canvas-filter' | 'off' | 'unsupported';

/** Estado reportado pelo content script ao popup. */
export type ContentStatus = {
  readonly enabled: boolean;
  readonly applied: boolean;
  readonly documentTheme: DocumentThemeState;
};
