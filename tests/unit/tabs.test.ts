import { describe, expect, it } from 'vitest';
import { getActiveTab, type TabsQueryApi } from '../../src/platform/tabs';

function createTabsApi(tabs: ReadonlyArray<{ id?: number; url?: string }>): TabsQueryApi {
  return {
    async query() {
      return tabs;
    },
  };
}

describe('getActiveTab', () => {
  it('devolve id e url da aba ativa', async () => {
    const result = await getActiveTab(
      createTabsApi([{ id: 7, url: 'https://docs.google.com/document/d/abc/edit' }]),
    );
    expect(result).toEqual({
      ok: true,
      value: { tabId: 7, url: 'https://docs.google.com/document/d/abc/edit' },
    });
  });

  it('devolve url nula quando a extensão não tem permissão sobre a aba', async () => {
    const result = await getActiveTab(createTabsApi([{ id: 7 }]));
    expect(result).toEqual({ ok: true, value: { tabId: 7, url: null } });
  });

  it('trata ausência de aba como falha consultada', async () => {
    const result = await getActiveTab(createTabsApi([]));
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('resultado inesperado');
    }
    expect(result.error.code).toBe('TAB_QUERY_FAILED');
  });

  it('converte exceção em erro tipado', async () => {
    const failing: TabsQueryApi = {
      async query() {
        throw new Error('falha simulada');
      },
    };
    const result = await getActiveTab(failing);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('resultado inesperado');
    }
    expect(result.error.code).toBe('TAB_QUERY_FAILED');
  });
});
