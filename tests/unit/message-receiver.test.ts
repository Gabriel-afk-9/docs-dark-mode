import { describe, expect, it, vi } from 'vitest';
import { MESSAGE_SOURCE } from '../../src/shared/constants';
import {
  createGetStatusMessage,
  createSetEnabledMessage,
  createStatusResponse,
  type ContentResponse,
  type PopupToContentMessage,
} from '../../src/shared/messages';
import {
  registerMessageHandler,
  type MessageHandler,
  type MessageReceiverApi,
  type MessageSenderInfo,
} from '../../src/platform/messaging';
import { createTestReceiver } from '../fixtures/fakes';

type Listener = (
  rawMessage: unknown,
  sender: MessageSenderInfo,
  respond: (response: ContentResponse) => void,
) => void;

function createReceiver(): { api: MessageReceiverApi; listeners: Listener[] } {
  const listeners: Listener[] = [];
  return {
    api: {
      addListener(listener): void {
        listeners.push(listener);
      },
      removeListener(listener): void {
        const index = listeners.indexOf(listener);
        if (index >= 0) {
          listeners.splice(index, 1);
        }
      },
    },
    listeners,
  };
}

const statusResponse = createStatusResponse({
  enabled: true,
  applied: true,
  documentTheme: 'off',
});

describe('registerMessageHandler', () => {
  it('entrega mensagens válidas ao manipulador e responde', () => {
    const receiver = createReceiver();
    const handler = vi.fn<MessageHandler>(() => statusResponse);
    registerMessageHandler(receiver.api, handler);

    const responses: ContentResponse[] = [];
    receiver.listeners[0]?.(
      createGetStatusMessage(),
      { id: 'ddm-extension' },
      (response) => responses.push(response),
    );

    expect(handler).toHaveBeenCalledTimes(1);
    expect(responses).toEqual([statusResponse]);
  });

  it('ignora mensagens com origem inesperada', () => {
    const receiver = createReceiver();
    const handler = vi.fn<MessageHandler>(() => statusResponse);
    registerMessageHandler(receiver.api, handler);

    const responses: ContentResponse[] = [];
    receiver.listeners[0]?.(
      { source: 'outra-extensao', kind: 'ddm:get-status' },
      { id: 'ddm-extension' },
      (response) => responses.push(response),
    );

    expect(handler).not.toHaveBeenCalled();
    expect(responses).toEqual([]);
  });

  it('ignora payloads inválidos', () => {
    const receiver = createReceiver();
    const handler = vi.fn<MessageHandler>(() => statusResponse);
    registerMessageHandler(receiver.api, handler);

    const invalidPayloads: unknown[] = [
      null,
      'texto',
      { source: MESSAGE_SOURCE, kind: 'ddm:set-enabled', enabled: 'sim' },
      { source: MESSAGE_SOURCE, kind: 'ddm:outro-comando' },
    ];

    for (const payload of invalidPayloads) {
      const responses: ContentResponse[] = [];
      receiver.listeners[0]?.(payload, { id: 'ddm-extension' }, (response) =>
        responses.push(response),
      );
      expect(responses).toEqual([]);
    }
    expect(handler).not.toHaveBeenCalled();
  });

  it('ignora mensagens de um remetente inesperado', () => {
    const receiver = createReceiver();
    const handler = vi.fn<MessageHandler>(() => statusResponse);
    registerMessageHandler(receiver.api, handler, { expectedSenderId: 'ddm-extension' });

    const responses: ContentResponse[] = [];
    receiver.listeners[0]?.(
      createGetStatusMessage(),
      { id: 'outra-extensao' },
      (response) => responses.push(response),
    );

    expect(handler).not.toHaveBeenCalled();
    expect(responses).toEqual([]);
  });

  it('não responde quando o manipulador devolve null', () => {
    const receiver = createReceiver();
    registerMessageHandler(receiver.api, () => null);

    const responses: ContentResponse[] = [];
    receiver.listeners[0]?.(
      createGetStatusMessage(),
      { id: 'ddm-extension' },
      (response) => responses.push(response),
    );

    expect(responses).toEqual([]);
  });

  it('converte exceção do manipulador em resposta de erro', () => {
    const receiver = createReceiver();
    registerMessageHandler(receiver.api, () => {
      throw new Error('falha simulada');
    });

    const responses: ContentResponse[] = [];
    receiver.listeners[0]?.(
      createGetStatusMessage(),
      { id: 'ddm-extension' },
      (response) => responses.push(response),
    );

    expect(responses).toHaveLength(1);
    expect(responses[0]?.ok).toBe(false);
  });

  it('remove o listener ao cancelar a assinatura', () => {
    const receiver = createReceiver();
    const dispose = registerMessageHandler(receiver.api, () => statusResponse);
    expect(receiver.listeners).toHaveLength(1);
    dispose();
    expect(receiver.listeners).toHaveLength(0);
  });
});

describe('createTestReceiver', () => {
  it('entrega a mensagem registrada ao chamador', () => {
    const receiver = createTestReceiver();
    registerMessageHandler(receiver.api, () => statusResponse);
    const response = receiver.deliver(createSetEnabledMessage(true), { id: 'ddm-extension' });
    expect(response).toEqual(statusResponse);
  });
});

describe('contrato das mensagens', () => {
  it('usa a origem da extensão e tipos estáveis', () => {
    const message: PopupToContentMessage = createSetEnabledMessage(true);
    expect(message.source).toBe(MESSAGE_SOURCE);
    expect(message.kind).toBe('ddm:set-enabled');
  });
});
