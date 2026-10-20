import { describe, expect, it } from 'vitest';
import { MESSAGE_SOURCE } from '../../src/shared/constants';
import {
  createErrorResponse,
  createGetStatusMessage,
  createSetEnabledMessage,
  createStatusResponse,
} from '../../src/shared/messages';

describe('construtores de mensagens', () => {
  it('cria a requisição de status', () => {
    expect(createGetStatusMessage()).toEqual({ source: MESSAGE_SOURCE, kind: 'ddm:get-status' });
  });

  it('cria a requisição de alteração de estado', () => {
    expect(createSetEnabledMessage(true)).toEqual({
      source: MESSAGE_SOURCE,
      kind: 'ddm:set-enabled',
      enabled: true,
    });
  });

  it('cria respostas de sucesso e de erro', () => {
    expect(
      createStatusResponse({ enabled: true, applied: true, documentTheme: 'canvas-filter' }),
    ).toEqual({
      source: MESSAGE_SOURCE,
      ok: true,
      status: { enabled: true, applied: true, documentTheme: 'canvas-filter' },
    });

    expect(createErrorResponse('APPLY_FAILED')).toEqual({
      source: MESSAGE_SOURCE,
      ok: false,
      code: 'APPLY_FAILED',
    });
  });
});
