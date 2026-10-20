import { createError } from '../shared/errors';
import type { Result } from '../shared/types';


export type TabsQueryApi = {
  query(queryInfo: {
    active: boolean;
    currentWindow: boolean;
  }): Promise<ReadonlyArray<{ id?: number; url?: string }>>;
};

export type ActiveTabInfo = {
  readonly tabId: number | null;
  readonly url: string | null;
};

export async function getActiveTab(
  tabs: TabsQueryApi,
): Promise<Result<ActiveTabInfo>> {
  try {
    const [tab] = await tabs.query({ active: true, currentWindow: true });
    if (tab === undefined) {
      return { ok: false, error: createError('TAB_QUERY_FAILED') };
    }
    return {
      ok: true,
      value: {
        tabId: typeof tab.id === 'number' ? tab.id : null,
        url: typeof tab.url === 'string' ? tab.url : null,
      },
    };
  } catch (cause) {
    return { ok: false, error: createError('TAB_QUERY_FAILED', cause) };
  }
}

export function getBrowserTabsApi(): TabsQueryApi | null {
  const api = globalThis.chrome?.tabs;
  if (api === undefined) {
    return null;
  }
  return {
    query: (queryInfo) => api.query(queryInfo),
  };
}
