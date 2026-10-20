import { describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY } from '../../src/shared/constants';
import {
  subscribeToPreferenceChanges,
  type StorageChangeEntry,
  type StorageChangeListenerApi,
} from '../../src/platform/storage';

type Listener = (
  changes: Record<string, StorageChangeEntry>,
  areaName: string,
) => void;

function createApi(): { api: StorageChangeListenerApi; listeners: Listener[] } {
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

describe('subscribeToPreferenceChanges', () => {
  it('entrega a preferência válida da chave da extensão', () => {
    const api = createApi();
    const onPreference = vi.fn();
    subscribeToPreferenceChanges(api.api, onPreference);

    api.listeners[0]?.(
      { [STORAGE_KEY]: { oldValue: { enabled: false }, newValue: { enabled: true } } },
      'local',
    );

    expect(onPreference).toHaveBeenCalledWith({ enabled: true });
  });

  it('ignora mudanças de outras chaves', () => {
    const api = createApi();
    const onPreference = vi.fn();
    subscribeToPreferenceChanges(api.api, onPreference);

    api.listeners[0]?.({ 'outra-chave': { newValue: { enabled: true } } }, 'local');

    expect(onPreference).not.toHaveBeenCalled();
  });

  it('ignora mudanças de outras áreas do storage', () => {
    const api = createApi();
    const onPreference = vi.fn();
    subscribeToPreferenceChanges(api.api, onPreference);

    api.listeners[0]?.({ [STORAGE_KEY]: { newValue: { enabled: true } } }, 'sync');

    expect(onPreference).not.toHaveBeenCalled();
  });

  it('ignora valores inválidos sem lançar exceção', () => {
    const api = createApi();
    const onPreference = vi.fn();
    subscribeToPreferenceChanges(api.api, onPreference);

    expect(() => {
      api.listeners[0]?.({ [STORAGE_KEY]: { newValue: { enabled: 'sim' } } }, 'local');
      api.listeners[0]?.({ [STORAGE_KEY]: { newValue: null } }, 'local');
      api.listeners[0]?.({ [STORAGE_KEY]: {} }, 'local');
    }).not.toThrow();

    expect(onPreference).not.toHaveBeenCalled();
  });

  it('cancela a assinatura ao retornar a função de cancelamento', () => {
    const api = createApi();
    const onPreference = vi.fn();
    const dispose = subscribeToPreferenceChanges(api.api, onPreference);

    expect(api.listeners).toHaveLength(1);
    dispose();
    expect(api.listeners).toHaveLength(0);
    expect(onPreference).not.toHaveBeenCalled();
  });
});
