import { MESSAGE_SOURCE } from './constants';
import type { ContentStatus, DdmErrorCode } from './types';

/**
 * Contratos de mensagens entre popup e content script (RF-08).
 * O campo `source` evita aceitar mensagens de origens desconhecidas.
 */

export type PopupToContentMessage =
  | { readonly source: typeof MESSAGE_SOURCE; readonly kind: 'ddm:get-status' }
  | {
      readonly source: typeof MESSAGE_SOURCE;
      readonly kind: 'ddm:set-enabled';
      readonly enabled: boolean;
    };

export type ContentResponse =
  | { readonly source: typeof MESSAGE_SOURCE; readonly ok: true; readonly status: ContentStatus }
  | { readonly source: typeof MESSAGE_SOURCE; readonly ok: false; readonly code: DdmErrorCode };

export function createGetStatusMessage(): PopupToContentMessage {
  return { source: MESSAGE_SOURCE, kind: 'ddm:get-status' };
}

export function createSetEnabledMessage(enabled: boolean): PopupToContentMessage {
  return { source: MESSAGE_SOURCE, kind: 'ddm:set-enabled', enabled };
}

export function createStatusResponse(status: ContentStatus): ContentResponse {
  return { source: MESSAGE_SOURCE, ok: true, status };
}

export function createErrorResponse(code: DdmErrorCode): ContentResponse {
  return { source: MESSAGE_SOURCE, ok: false, code };
}
