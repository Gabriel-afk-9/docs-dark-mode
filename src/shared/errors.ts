import { STRINGS } from './strings';
import type { DdmError, DdmErrorCode } from './types';

/**
 * Tratamento centralizado de erros (RF-10).
 * A causa técnica fica no erro; a mensagem apresentada ao usuário é curta,
 * em pt-BR e nunca contém stack trace.
 */

const USER_MESSAGES: Record<DdmErrorCode, string> = {
  STORAGE_READ_FAILED: STRINGS.errorStorageRead,
  STORAGE_WRITE_FAILED: STRINGS.errorStorageWrite,
  TAB_QUERY_FAILED: STRINGS.errorTabQuery,
  CONTENT_UNREACHABLE: STRINGS.errorContentUnreachable,
  INVALID_MESSAGE: STRINGS.errorInvalidMessage,
  UNSUPPORTED_PAGE: STRINGS.errorUnsupportedPage,
  APPLY_FAILED: STRINGS.errorApplyFailed,
};

export function createError(code: DdmErrorCode, cause?: unknown): DdmError {
  return cause === undefined ? { code } : { code, cause };
}

export function toUserMessage(error: DdmError): string {
  return USER_MESSAGES[error.code] ?? STRINGS.errorUnknown;
}
