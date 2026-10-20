import { describe, expect, it } from 'vitest';
import { MESSAGE_SOURCE } from '../../src/shared/constants';
import { createGetStatusMessage } from '../../src/shared/messages';
import { sendToTab, type MessageSenderApi } from '../../src/platform/messaging';

function createMessagingApi(response: unknown): MessageSenderApi {
  return {
    async sendMessage() {
      return response;
    },
  };
}

describe('sendToTab', () => {
  it('devolve a resposta validada', async () => {
    const response = {
      source: MESSAGE_SOURCE,
      ok: true,
      status: { enabled: true, applied: true, documentTheme: 'off' as const },
    };
    const result = await sendToTab(createMessagingApi(response), 7, createGetStatusMessage());
    expect(result).toEqual({ ok: true, value: response });
  });

  it('trata resposta inválida como mensagem inválida', async () => {
    const result = await sendToTab(createMessagingApi({ ok: 'talvez' }), 7, createGetStatusMessage());
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('resultado inesperado');
    }
    expect(result.error.code).toBe('INVALID_MESSAGE');
  });

  it('trata ausência de content script como conteúdo inacessível', async () => {
    const failing: MessageSenderApi = {
      async sendMessage() {
        throw new Error('Could not establish connection.');
      },
    };
    const result = await sendToTab(failing, 7, createGetStatusMessage());
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('resultado inesperado');
    }
    expect(result.error.code).toBe('CONTENT_UNREACHABLE');
  });
});
