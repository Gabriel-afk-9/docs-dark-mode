import { STORAGE_KEY } from '../shared/constants';
import { createError } from '../shared/errors';
import { logDiagnostic } from '../shared/logger';
import {
  DEFAULT_PREFERENCE,
  type Result,
  type ThemePreference,
} from '../shared/types';
import { parseThemePreference } from '../shared/validators';


export type StorageArea = {
  get(keys: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
};

/** Alteração de uma chave do storage, no formato de `chrome.storage.onChanged`. */
export type StorageChangeEntry = {
  readonly oldValue?: unknown;
  readonly newValue?: unknown;
};

/** Assinatura de mudanças do storage, isolada da API do navegador. */
export type StorageChangeListenerApi = {
  addListener(
    listener: (changes: Record<string, StorageChangeEntry>, areaName: string) => void,
  ): void;
  removeListener(
    listener: (changes: Record<string, StorageChangeEntry>, areaName: string) => void,
  ): void;
};


export async function readPreference(
  storage: StorageArea,
): Promise<Result<ThemePreference>> {
  try {
    const stored = await storage.get(STORAGE_KEY);
    const parsed = parseThemePreference(stored[STORAGE_KEY]);
    return { ok: true, value: parsed ?? DEFAULT_PREFERENCE };
  } catch (cause) {
    return { ok: false, error: createError('STORAGE_READ_FAILED', cause) };
  }
}

export async function writePreference(
  storage: StorageArea,
  preference: ThemePreference,
): Promise<Result<ThemePreference>> {
  try {
    await storage.set({ [STORAGE_KEY]: preference });
    return { ok: true, value: preference };
  } catch (cause) {
    return { ok: false, error: createError('STORAGE_WRITE_FAILED', cause) };
  }
}

export function getBrowserStorageArea(): StorageArea | null {
  const area = globalThis.chrome?.storage?.local;
  if (area === undefined) {
    return null;
  }
  return {
    get: (keys) => area.get(keys),
    set: (items) => area.set(items),
  };
}

/**
 * Assina mudanças da preferência persistida (sincronização entre abas).
 *
 * Regras aplicadas:
 *  - apenas a área `local` é observada;
 *  - apenas a chave da preferência é considerada;
 *  - o valor recebido é validado antes de ser entregue;
 *  - valores inválidos são ignorados (sem exceção).
 *
 * @returns Função que cancela a assinatura.
 */
export function subscribeToPreferenceChanges(
  api: StorageChangeListenerApi,
  onPreference: (preference: ThemePreference) => void,
): () => void {
  const listener = (
    changes: Record<string, StorageChangeEntry>,
    areaName: string,
  ): void => {
    if (areaName !== 'local') {
      return;
    }
    const entry = changes[STORAGE_KEY];
    if (entry === undefined) {
      return;
    }
    const preference = parseThemePreference(entry.newValue);
    if (preference === null) {
      logDiagnostic('content.storage');
      return;
    }
    onPreference(preference);
  };
  api.addListener(listener);
  return () => {
    api.removeListener(listener);
  };
}

export function getBrowserStorageChangeApi(): StorageChangeListenerApi | null {
  const api = globalThis.chrome?.storage?.onChanged;
  if (api === undefined) {
    return null;
  }
  return {
    addListener: (listener) => api.addListener(listener),
    removeListener: (listener) => api.removeListener(listener),
  };
}
