import { describe, expect, it } from 'vitest';
import { STORAGE_KEY } from '../../src/shared/constants';
import { readPreference, writePreference, type StorageArea } from '../../src/platform/storage';

function createStorage(initial: Record<string, unknown> = {}): StorageArea {
  const data: Record<string, unknown> = { ...initial };
  return {
    async get(): Promise<Record<string, unknown>> {
      return { ...data };
    },
    async set(items: Record<string, unknown>): Promise<void> {
      Object.assign(data, items);
    },
  };
}

function createFailingStorage(): StorageArea {
  return {
    async get(): Promise<Record<string, unknown>> {
      throw new Error('falha simulada');
    },
    async set(): Promise<void> {
      throw new Error('falha simulada');
    },
  };
}

describe('readPreference', () => {
  it('devolve o padrão desligado quando não há valor salvo', async () => {
    const result = await readPreference(createStorage());
    expect(result).toEqual({ ok: true, value: { enabled: false } });
  });

  it('devolve o valor salvo', async () => {
    const storage = createStorage({ [STORAGE_KEY]: { enabled: true } });
    const result = await readPreference(storage);
    expect(result).toEqual({ ok: true, value: { enabled: true } });
  });

  it('ignora valor salvo inválido e usa o padrão', async () => {
    const storage = createStorage({ [STORAGE_KEY]: { enabled: 'sim' } });
    const result = await readPreference(storage);
    expect(result).toEqual({ ok: true, value: { enabled: false } });
  });

  it('converte falha de leitura em erro tipado', async () => {
    const result = await readPreference(createFailingStorage());
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('resultado inesperado');
    }
    expect(result.error.code).toBe('STORAGE_READ_FAILED');
  });
});

describe('writePreference', () => {
  it('persiste e devolve a preferência gravada', async () => {
    const storage = createStorage();
    const result = await writePreference(storage, { enabled: true });
    expect(result).toEqual({ ok: true, value: { enabled: true } });

    const readBack = await readPreference(storage);
    expect(readBack).toEqual({ ok: true, value: { enabled: true } });
  });

  it('converte falha de gravação em erro tipado', async () => {
    const result = await writePreference(createFailingStorage(), { enabled: true });
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('resultado inesperado');
    }
    expect(result.error.code).toBe('STORAGE_WRITE_FAILED');
  });
});
