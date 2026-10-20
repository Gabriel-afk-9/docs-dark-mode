import { createError } from '../shared/errors';
import { logDiagnostic } from '../shared/logger';
import { createErrorResponse } from '../shared/messages';
import type { ContentResponse, PopupToContentMessage } from '../shared/messages';
import type { Result } from '../shared/types';
import { parseContentResponse, parsePopupToContentMessage } from '../shared/validators';


export type MessageSenderApi = {
  sendMessage(tabId: number, message: PopupToContentMessage): Promise<unknown>;
};

/** Dados do remetente de uma mensagem, isolados da API do navegador. */
export type MessageSenderInfo = {
  readonly id?: string;
};

/** Recebimento de mensagens, isolado da API do navegador. */
export type MessageReceiverApi = {
  addListener(
    listener: (
      rawMessage: unknown,
      sender: MessageSenderInfo,
      respond: (response: ContentResponse) => void,
    ) => void,
  ): void;
  removeListener(
    listener: (
      rawMessage: unknown,
      sender: MessageSenderInfo,
      respond: (response: ContentResponse) => void,
    ) => void,
  ): void;
};

/** Manipulador de uma mensagem válida vinda do popup. */
export type MessageHandler = (message: PopupToContentMessage) => ContentResponse | null;

export type MessageHandlerOptions = {
  /** Id da extensão esperado no remetente. Quando definido, mensagens de
   * outra origem são ignoradas. */
  readonly expectedSenderId?: string;
};

export async function sendToTab(
  messaging: MessageSenderApi,
  tabId: number,
  message: PopupToContentMessage,
): Promise<Result<ContentResponse>> {
  try {
    const raw = await messaging.sendMessage(tabId, message);
    const response = parseContentResponse(raw);
    if (response === null) {
      return { ok: false, error: createError('INVALID_MESSAGE') };
    }
    return { ok: true, value: response };
  } catch (cause) {
    return { ok: false, error: createError('CONTENT_UNREACHABLE', cause) };
  }
}

export function getBrowserMessageSender(): MessageSenderApi | null {
  const api = globalThis.chrome?.tabs;
  if (api === undefined) {
    return null;
  }
  return {
    sendMessage: (tabId, message) => api.sendMessage(tabId, message),
  };
}

/**
 * Registra o manipulador de mensagens do popup (RF-08).
 *
 * Mensagens são validadas em runtime antes de chegar ao manipulador:
 *  - origem (`source`) desconhecida → ignorada;
 *  - payload inválido → ignorado;
 *  - remetente inesperado → ignorado.
 *
 * Nenhuma resposta é enviada para mensagens descartadas, para que o popup
 * não receba uma confirmação inválida.
 *
 * @returns Função que remove o listener.
 */
export function registerMessageHandler(
  receiver: MessageReceiverApi,
  handler: MessageHandler,
  options: MessageHandlerOptions = {},
): () => void {
  const listener = (
    rawMessage: unknown,
    sender: MessageSenderInfo,
    respond: (response: ContentResponse) => void,
  ): void => {
    const expectedSenderId = options.expectedSenderId;
    if (expectedSenderId !== undefined && sender.id !== expectedSenderId) {
      logDiagnostic('platform.messaging');
      return;
    }
    const message = parsePopupToContentMessage(rawMessage);
    if (message === null) {
      logDiagnostic('platform.messaging');
      return;
    }
    let response: ContentResponse | null;
    try {
      response = handler(message);
    } catch {
      // Falha inesperada do manipulador: responde com erro tipado em vez de
      // deixar a mensagem sem resposta (o popup trataria como falha).
      logDiagnostic('platform.messaging', 'APPLY_FAILED');
      response = createErrorResponse('APPLY_FAILED');
    }
    if (response === null) {
      return;
    }
    respond(response);
  };
  receiver.addListener(listener);
  return () => {
    receiver.removeListener(listener);
  };
}

export function getBrowserMessageReceiver(): MessageReceiverApi | null {
  const api = globalThis.chrome?.runtime?.onMessage;
  if (api === undefined) {
    return null;
  }
  return {
    addListener: (listener) => api.addListener(listener),
    removeListener: (listener) => api.removeListener(listener),
  };
}
