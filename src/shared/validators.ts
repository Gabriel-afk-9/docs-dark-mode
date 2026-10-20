import { MESSAGE_SOURCE } from './constants';
import type { ContentResponse, PopupToContentMessage } from './messages';
import type { ContentStatus, DdmErrorCode, DocumentThemeState, ThemePreference } from './types';

/**
 * Validação em runtime dos dados vindos de fora do código tipado (RF-08).
 * TypeScript sozinho não protege a fronteira com `chrome.*`.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseThemePreference(value: unknown): ThemePreference | null {
  if (!isRecord(value)) {
    return null;
  }
  if (typeof value['enabled'] !== 'boolean') {
    return null;
  }
  return { enabled: value['enabled'] };
}

export function parseDocumentThemeState(value: unknown): DocumentThemeState | null {
  if (value === 'canvas-filter' || value === 'off' || value === 'unsupported') {
    return value;
  }
  return null;
}

export function parseContentStatus(value: unknown): ContentStatus | null {
  if (!isRecord(value)) {
    return null;
  }
  if (typeof value['enabled'] !== 'boolean' || typeof value['applied'] !== 'boolean') {
    return null;
  }
  const documentTheme = parseDocumentThemeState(value['documentTheme']);
  if (documentTheme === null) {
    return null;
  }
  return { enabled: value['enabled'], applied: value['applied'], documentTheme };
}

export function parsePopupToContentMessage(
  value: unknown,
): PopupToContentMessage | null {
  if (!isRecord(value) || value['source'] !== MESSAGE_SOURCE) {
    return null;
  }
  if (value['kind'] === 'ddm:get-status') {
    return { source: MESSAGE_SOURCE, kind: 'ddm:get-status' };
  }
  if (value['kind'] === 'ddm:set-enabled' && typeof value['enabled'] === 'boolean') {
    return { source: MESSAGE_SOURCE, kind: 'ddm:set-enabled', enabled: value['enabled'] };
  }
  return null;
}

export function parseContentResponse(value: unknown): ContentResponse | null {
  if (!isRecord(value) || value['source'] !== MESSAGE_SOURCE) {
    return null;
  }
  if (value['ok'] === true) {
    const status = parseContentStatus(value['status']);
    return status === null ? null : { source: MESSAGE_SOURCE, ok: true, status };
  }
  if (value['ok'] === false && isDdmErrorCode(value['code'])) {
    return { source: MESSAGE_SOURCE, ok: false, code: value['code'] };
  }
  return null;
}

function isDdmErrorCode(value: unknown): value is DdmErrorCode {
  return (
    value === 'STORAGE_READ_FAILED' ||
    value === 'STORAGE_WRITE_FAILED' ||
    value === 'TAB_QUERY_FAILED' ||
    value === 'CONTENT_UNREACHABLE' ||
    value === 'INVALID_MESSAGE' ||
    value === 'UNSUPPORTED_PAGE' ||
    value === 'APPLY_FAILED'
  );
}
