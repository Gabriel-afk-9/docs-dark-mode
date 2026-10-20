import { describe, expect, it } from 'vitest';
import { STORAGE_KEY, THEME_ATTRIBUTE, THEME_ATTRIBUTE_VALUE } from '../../src/shared/constants';
import { startContentScript } from '../../src/content/content-entry';
import type { ThemeTarget } from '../../src/content/theme-applier';
import {
  createFakeStorage,
  createTestReceiver,
} from '../fixtures/fakes';

const DOCS_URL = 'https://docs.google.com/document/d/abc/edit';

function createTarget(): ThemeTarget & { applied: boolean } {
  const attributes = new Map<string, string>();
  return {
    get applied(): boolean {
      return attributes.get(THEME_ATTRIBUTE) === THEME_ATTRIBUTE_VALUE;
    },
    getAttribute: (name) => attributes.get(name) ?? null,
    setAttribute: (name, value) => {
      attributes.set(name, value);
    },
    removeAttribute: (name) => {
      attributes.delete(name);
    },
  };
}

describe('startContentScript', () => {
  it('não registra listeners em página não compatível', () => {
    const target = createTarget();
    const receiver = createTestReceiver();
    const storage = createFakeStorage({ [STORAGE_KEY]: { enabled: true } });

    const handle = startContentScript({
      target,
      href: 'https://docs.google.com/document/u/0/',
      storage: storage.area,
      changes: storage.changes,
      receiver: receiver.api,
    });

    expect(target.applied).toBe(false);
    expect(receiver.deliver({ source: 'ddm', kind: 'ddm:get-status' })).toBeUndefined();
    handle.dispose();
  });

  it('aplica a preferência salva ao iniciar', async () => {
    const target = createTarget();
    const storage = createFakeStorage({ [STORAGE_KEY]: { enabled: true } });

    const handle = startContentScript({
      target,
      href: DOCS_URL,
      storage: storage.area,
      changes: storage.changes,
      receiver: null,
    });
    await handle.ready;

    expect(target.applied).toBe(true);
    handle.dispose();
  });

  it('inicia desativado quando não há preferência salva', async () => {
    const target = createTarget();
    const storage = createFakeStorage();

    const handle = startContentScript({
      target,
      href: DOCS_URL,
      storage: storage.area,
      changes: storage.changes,
      receiver: null,
    });
    await handle.ready;

    expect(target.applied).toBe(false);
    handle.dispose();
  });

  it('segue o padrão desligado quando a leitura do storage falha', async () => {
    const target = createTarget();
    const storage = createFakeStorage();
    storage.failReads = true;

    const handle = startContentScript({
      target,
      href: DOCS_URL,
      storage: storage.area,
      changes: storage.changes,
      receiver: null,
    });
    await handle.ready;

    expect(target.applied).toBe(false);
    handle.dispose();
  });

  it('responde ao pedido de status com o estado aplicado', async () => {
    const target = createTarget();
    const receiver = createTestReceiver();
    const storage = createFakeStorage();

    const handle = startContentScript({
      target,
      href: DOCS_URL,
      storage: storage.area,
      changes: storage.changes,
      receiver: receiver.api,
    });
    await handle.ready;

    const response = receiver.deliver({ source: 'ddm', kind: 'ddm:get-status' });
    expect(response).toEqual({
      source: 'ddm',
      ok: true,
      status: { enabled: false, applied: false, documentTheme: 'off' },
    });
    handle.dispose();
  });

  it('aplica e remove o tema conforme a mensagem recebida', async () => {
    const target = createTarget();
    const receiver = createTestReceiver();
    const storage = createFakeStorage();

    const handle = startContentScript({
      target,
      href: DOCS_URL,
      storage: storage.area,
      changes: storage.changes,
      receiver: receiver.api,
    });
    await handle.ready;

    receiver.deliver({ source: 'ddm', kind: 'ddm:set-enabled', enabled: true });
    expect(target.applied).toBe(true);

    receiver.deliver({ source: 'ddm', kind: 'ddm:set-enabled', enabled: false });
    expect(target.applied).toBe(false);
    handle.dispose();
  });

  it('ignora mensagens de origem inesperada', async () => {
    const target = createTarget();
    const receiver = createTestReceiver();
    const storage = createFakeStorage();

    const handle = startContentScript({
      target,
      href: DOCS_URL,
      storage: storage.area,
      changes: storage.changes,
      receiver: receiver.api,
    });
    await handle.ready;

    const response = receiver.deliver({
      source: 'outra-extensao',
      kind: 'ddm:set-enabled',
      enabled: true,
    });
    expect(response).toBeUndefined();
    expect(target.applied).toBe(false);
    handle.dispose();
  });

  it('aplica mudanças da preferência vindas de outra aba', async () => {
    const target = createTarget();
    const storage = createFakeStorage();

    const handle = startContentScript({
      target,
      href: DOCS_URL,
      storage: storage.area,
      changes: storage.changes,
      receiver: null,
    });
    await handle.ready;

    storage.emitPreferenceChange({ enabled: true });
    expect(target.applied).toBe(true);

    storage.emitPreferenceChange({ enabled: false });
    expect(target.applied).toBe(false);
    handle.dispose();
  });

  it('ignora mudanças inválidas da preferência', async () => {
    const target = createTarget();
    const storage = createFakeStorage();

    const handle = startContentScript({
      target,
      href: DOCS_URL,
      storage: storage.area,
      changes: storage.changes,
      receiver: null,
    });
    await handle.ready;

    storage.emitPreferenceChange({ enabled: 'sim' });
    expect(target.applied).toBe(false);
    handle.dispose();
  });

  it('para de aplicar mudanças após o descarte', async () => {
    const target = createTarget();
    const storage = createFakeStorage();

    const handle = startContentScript({
      target,
      href: DOCS_URL,
      storage: storage.area,
      changes: storage.changes,
      receiver: null,
    });
    await handle.ready;

    handle.dispose();
    storage.emitPreferenceChange({ enabled: true });
    expect(target.applied).toBe(false);
  });
});
