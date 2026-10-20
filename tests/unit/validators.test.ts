import { describe, expect, it } from 'vitest';
import { MESSAGE_SOURCE } from '../../src/shared/constants';
import {
  parseContentResponse,
  parseContentStatus,
  parsePopupToContentMessage,
  parseThemePreference,
} from '../../src/shared/validators';

describe('parseThemePreference', () => {
  it('aceita a preferência válida', () => {
    expect(parseThemePreference({ enabled: true })).toEqual({ enabled: true });
    expect(parseThemePreference({ enabled: false })).toEqual({ enabled: false });
  });

  it('recusa valores ausentes ou com tipo errado', () => {
    expect(parseThemePreference(undefined)).toBeNull();
    expect(parseThemePreference(null)).toBeNull();
    expect(parseThemePreference({})).toBeNull();
    expect(parseThemePreference({ enabled: 'true' })).toBeNull();
    expect(parseThemePreference({ enabled: 1 })).toBeNull();
    expect(parseThemePreference([{ enabled: true }])).toBeNull();
  });
});

describe('parseContentStatus', () => {
  it('aceita status válido', () => {
    expect(
      parseContentStatus({ enabled: true, applied: true, documentTheme: 'canvas-filter' }),
    ).toEqual({ enabled: true, applied: true, documentTheme: 'canvas-filter' });
  });

  it('recusa documentTheme desconhecido', () => {
    expect(
      parseContentStatus({ enabled: true, applied: true, documentTheme: 'qualquer' }),
    ).toBeNull();
  });

  it('recusa campos ausentes', () => {
    expect(parseContentStatus({ enabled: true, applied: true })).toBeNull();
    expect(parseContentStatus({ enabled: true, documentTheme: 'off' })).toBeNull();
  });
});

describe('parsePopupToContentMessage', () => {
  it('aceita get-status', () => {
    expect(parsePopupToContentMessage({ source: MESSAGE_SOURCE, kind: 'ddm:get-status' })).toEqual({
      source: MESSAGE_SOURCE,
      kind: 'ddm:get-status',
    });
  });

  it('aceita set-enabled com booleano', () => {
    expect(
      parsePopupToContentMessage({ source: MESSAGE_SOURCE, kind: 'ddm:set-enabled', enabled: true }),
    ).toEqual({ source: MESSAGE_SOURCE, kind: 'ddm:set-enabled', enabled: true });
  });

  it('recusa origem desconhecida, tipo inválido e payload quebrado', () => {
    expect(parsePopupToContentMessage({ kind: 'ddm:get-status' })).toBeNull();
    expect(parsePopupToContentMessage({ source: 'outro', kind: 'ddm:get-status' })).toBeNull();
    expect(parsePopupToContentMessage({ source: MESSAGE_SOURCE, kind: 'desconhecido' })).toBeNull();
    expect(
      parsePopupToContentMessage({ source: MESSAGE_SOURCE, kind: 'ddm:set-enabled', enabled: 'sim' }),
    ).toBeNull();
    expect(parsePopupToContentMessage('ddm:get-status')).toBeNull();
  });
});

describe('parseContentResponse', () => {
  it('aceita resposta de sucesso', () => {
    expect(
      parseContentResponse({
        source: MESSAGE_SOURCE,
        ok: true,
        status: { enabled: true, applied: true, documentTheme: 'off' },
      }),
    ).toEqual({
      source: MESSAGE_SOURCE,
      ok: true,
      status: { enabled: true, applied: true, documentTheme: 'off' },
    });
  });

  it('aceita resposta de erro com código conhecido', () => {
    expect(
      parseContentResponse({ source: MESSAGE_SOURCE, ok: false, code: 'CONTENT_UNREACHABLE' }),
    ).toEqual({ source: MESSAGE_SOURCE, ok: false, code: 'CONTENT_UNREACHABLE' });
  });

  it('recusa respostas malformadas', () => {
    expect(parseContentResponse({ source: MESSAGE_SOURCE, ok: false, code: 'DESCONHECIDO' })).toBeNull();
    expect(parseContentResponse({ source: MESSAGE_SOURCE, ok: true, status: {} })).toBeNull();
    expect(parseContentResponse({ ok: true })).toBeNull();
    expect(parseContentResponse(null)).toBeNull();
  });
});
