import { describe, expect, it } from 'vitest';
import { createError, toUserMessage } from '../../src/shared/errors';
import { STRINGS } from '../../src/shared/strings';

describe('createError', () => {
  it('mantém o código e a causa', () => {
    const cause = new Error('falha simulada');
    const error = createError('STORAGE_READ_FAILED', cause);
    expect(error.code).toBe('STORAGE_READ_FAILED');
    expect(error.cause).toBe(cause);
  });

  it('omite a causa quando não informada', () => {
    const error = createError('TAB_QUERY_FAILED');
    expect(error.cause).toBeUndefined();
  });
});

describe('toUserMessage', () => {
  it('mapeia todos os códigos para mensagens em pt-BR', () => {
    expect(toUserMessage(createError('STORAGE_READ_FAILED'))).toBe(STRINGS.errorStorageRead);
    expect(toUserMessage(createError('STORAGE_WRITE_FAILED'))).toBe(STRINGS.errorStorageWrite);
    expect(toUserMessage(createError('TAB_QUERY_FAILED'))).toBe(STRINGS.errorTabQuery);
    expect(toUserMessage(createError('CONTENT_UNREACHABLE'))).toBe(STRINGS.errorContentUnreachable);
    expect(toUserMessage(createError('INVALID_MESSAGE'))).toBe(STRINGS.errorInvalidMessage);
    expect(toUserMessage(createError('UNSUPPORTED_PAGE'))).toBe(STRINGS.errorUnsupportedPage);
    expect(toUserMessage(createError('APPLY_FAILED'))).toBe(STRINGS.errorApplyFailed);
  });

  it('nunca expõe stack trace ou causa técnica', () => {
    const message = toUserMessage(createError('STORAGE_READ_FAILED', new Error('boom')));
    expect(message).not.toContain('boom');
    expect(message).not.toContain('Error');
  });
});
