import { describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY, THEME_ATTRIBUTE, THEME_ATTRIBUTE_VALUE } from '../../src/shared/constants';
import { startContentScript, type ContentScriptHandle } from '../../src/content/content-entry';
import type { ThemeTarget } from '../../src/content/theme-applier';
import { createPopupController } from '../../src/popup/popup-controller';
import type { ContentResponse, PopupToContentMessage } from '../../src/shared/messages';
import type { MessageSenderApi } from '../../src/platform/messaging';
import { STRINGS } from '../../src/shared/strings';
import { createFakeStorage, createFakeTabs, createFakeView, createTestReceiver } from '../fixtures/fakes';

/**
 * Teste de integração (sem navegador real).
 *
 * Simula duas abas do Google Docs compartilhando o mesmo storage e um popup
 * que fala com a aba ativa. Valida a **lógica** de propagação; não valida o
 * resultado visual no Google Docs.
 */

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

type Tab = {
  readonly id: number;
  readonly target: ThemeTarget & { applied: boolean };
  readonly receiver: ReturnType<typeof createTestReceiver>;
  readonly handle: ContentScriptHandle;
};

function createMessagingBus(tabs: Tab[]): MessageSenderApi {
  return {
    async sendMessage(tabId: number, message: PopupToContentMessage): Promise<unknown> {
      const tab = tabs.find((candidate) => candidate.id === tabId);
      if (tab === undefined) {
        throw new Error('Could not establish connection. Receiving end does not exist.');
      }
      let response: ContentResponse | undefined;
      tab.receiver.deliver(message, { id: 'ddm-extension' }, (value) => {
        response = value;
      });
      return response;    },
  };
}

async function createScenario(options: { stored?: Record<string, unknown> } = {}): Promise<{
  storage: ReturnType<typeof createFakeStorage>;
  tabs: Tab[];
  view: ReturnType<typeof createFakeView>;
  controller: ReturnType<typeof createPopupController>;
}> {
  const storage = createFakeStorage(options.stored ?? {});
  const tabs: Tab[] = [];

  for (const id of [1, 2]) {
    const target = createTarget();
    const receiver = createTestReceiver();
    const handle = startContentScript({
      target,
      href: DOCS_URL,
      storage: storage.area,
      changes: storage.changes,
      receiver: receiver.api,
      senderId: 'ddm-extension',
    });
    tabs.push({ id, target, receiver, handle });
    await handle.ready;
  }

  const view = createFakeView();
  const controller = createPopupController(
    {
      storage: storage.area,
      tabs: createFakeTabs({ url: DOCS_URL, tabId: 1 }),
      messaging: createMessagingBus(tabs),
    },
    view.view,
  );

  return { storage, tabs, view, controller };
}

describe('integração popup ↔ abas', () => {
  it('começa desativado em todas as abas quando não há preferência salva', async () => {
    const { tabs, controller, view } = await createScenario();
    await controller.init();

    expect(tabs[0]?.target.applied).toBe(false);
    expect(tabs[1]?.target.applied).toBe(false);
    expect(view.last()?.message).toBe(STRINGS.statusInactive);
  });

  it('aplica a preferência salva ao abrir uma nova aba', async () => {
    const { tabs, controller, view } = await createScenario({
      stored: { [STORAGE_KEY]: { enabled: true } },
    });
    await controller.init();

    expect(tabs[0]?.target.applied).toBe(true);
    expect(tabs[1]?.target.applied).toBe(true);
    expect(view.last()?.enabled).toBe(true);
    expect(view.last()?.message).toBe(STRINGS.statusActiveInterface);
  });

  it('propaga a ativação do popup para as outras abas', async () => {
    const { tabs, controller, view, storage } = await createScenario();
    await controller.init();

    view.toggle(true);
    await vi.waitFor(() => {
      expect(view.last()?.kind).toBe('ready');
    });

    expect(storage.storedPreference()).toEqual({ enabled: true });
    expect(tabs[0]?.target.applied).toBe(true);
    expect(tabs[1]?.target.applied).toBe(true);
  });

  it('propaga a desativação do popup para as outras abas', async () => {
    const { tabs, controller, view, storage } = await createScenario({
      stored: { [STORAGE_KEY]: { enabled: true } },
    });
    await controller.init();

    view.toggle(false);
    await vi.waitFor(() => {
      expect(view.last()?.kind).toBe('ready');
    });

    expect(storage.storedPreference()).toEqual({ enabled: false });
    expect(tabs[0]?.target.applied).toBe(false);
    expect(tabs[1]?.target.applied).toBe(false);
    expect(view.last()?.message).toBe(STRINGS.statusInactive);
  });

  it('mantém a preferência salva e informa pendência quando a aba ativa não responde', async () => {
    const storage = createFakeStorage();
    const view = createFakeView();
    const controller = createPopupController(
      {
        storage: storage.area,
        tabs: createFakeTabs({ url: DOCS_URL, tabId: 99 }),
        messaging: {
          async sendMessage(): Promise<unknown> {
            throw new Error('Could not establish connection.');
          },
        },
      },
      view.view,
    );

    await controller.init();
    expect(view.last()?.kind).toBe('error');

    view.toggle(true);
    await vi.waitFor(() => {
      expect(view.last()?.kind).toBe('pending');
    });

    // A preferência foi persistida mesmo sem confirmação da página.
    expect(storage.storedPreference()).toEqual({ enabled: true });
    expect(view.last()?.message).toBe(STRINGS.statusPending);
  });
});
