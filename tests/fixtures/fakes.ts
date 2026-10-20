import type {
  MessageReceiverApi,
  MessageSenderApi,
  MessageSenderInfo,
} from '../../src/platform/messaging';
import type {
  StorageArea,
  StorageChangeEntry,
  StorageChangeListenerApi,
} from '../../src/platform/storage';
import type { TabsQueryApi } from '../../src/platform/tabs';
import type { ContentResponse, PopupToContentMessage } from '../../src/shared/messages';
import type { ThemePreference } from '../../src/shared/types';
import type { PopupState, PopupView } from '../../src/popup/popup-view';

/**
 * Fakes compartilhados pelos testes.
 *
 * Reproduzem o comportamento observável das APIs do navegador (inclusive a
 * propagação de `storage.onChanged`) sem depender de um navegador real.
 * Eles validam lógica de aplicação; **não** provam o resultado visual no
 * Google Docs.
 */

export type FakeStorage = {
  readonly area: StorageArea;
  readonly changes: StorageChangeListenerApi;
  /** Faz a próxima leitura falhar. */
  failReads: boolean;
  /** Faz a próxima gravação falhar. */
  failWrites: boolean;
  /** Valor salvo atualmente (ou `null`). */
  storedPreference(): ThemePreference | null;
  /** Simula uma alteração vinda de outra aba. */
  emitPreferenceChange(newValue: unknown): void;
};

export function createFakeStorage(
  initial: Record<string, unknown> = {},
): FakeStorage {
  const data: Record<string, unknown> = { ...initial };
  const listeners = new Set<
    (changes: Record<string, StorageChangeEntry>, areaName: string) => void
  >();

  const fake: FakeStorage = {
    area: {
      async get(keys: string): Promise<Record<string, unknown>> {
        if (fake.failReads) {
          throw new Error('falha simulada de leitura');
        }
        const value = data[keys];
        return value === undefined ? {} : { [keys]: value };
      },
      async set(items: Record<string, unknown>): Promise<void> {
        if (fake.failWrites) {
          throw new Error('falha simulada de gravação');
        }
        const changes: Record<string, StorageChangeEntry> = {};
        for (const [key, newValue] of Object.entries(items)) {
          changes[key] = { oldValue: data[key], newValue };
          data[key] = newValue;
        }
        for (const listener of listeners) {
          listener(changes, 'local');
        }
      },
    },
    changes: {
      addListener(listener): void {
        listeners.add(listener);
      },
      removeListener(listener): void {
        listeners.delete(listener);
      },
    },
    failReads: false,
    failWrites: false,
    storedPreference(): ThemePreference | null {
      const value = data['ddm:preference'];
      if (typeof value !== 'object' || value === null) {
        return null;
      }
      const enabled = (value as Record<string, unknown>)['enabled'];
      return typeof enabled === 'boolean' ? { enabled } : null;
    },
    emitPreferenceChange(newValue: unknown): void {
      for (const listener of listeners) {
        listener({ 'ddm:preference': { newValue } }, 'local');
      }
    },
  };

  return fake;
}

export type FakeTabsOptions = {
  readonly url?: string | null;
  readonly tabId?: number | null;
  readonly fail?: boolean;
};

export function createFakeTabs(options: FakeTabsOptions = {}): TabsQueryApi {
  const url = options.url === undefined ? 'https://docs.google.com/document/d/abc/edit' : options.url;
  const tabId = options.tabId === undefined ? 1 : options.tabId;
  return {
    async query(): Promise<ReadonlyArray<{ id?: number; url?: string }>> {
      if (options.fail === true) {
        throw new Error('falha simulada na consulta de abas');
      }
      if (tabId === null) {
        return [{}];
      }
      return url === null ? [{ id: tabId }] : [{ id: tabId, url }];
    },
  };
}

/** Resposta de uma mensagem: valor devolvido ou erro lançado. */
export type FakeMessagingResponder = (
  tabId: number,
  message: PopupToContentMessage,
) => unknown | Promise<unknown>;

export function createFakeMessaging(
  responder: FakeMessagingResponder,
): MessageSenderApi {
  return {
    async sendMessage(tabId: number, message: PopupToContentMessage): Promise<unknown> {
      return responder(tabId, message);
    },
  };
}

/** Messaging que sempre falha, como uma aba sem content script. */
export function createUnreachableMessaging(): MessageSenderApi {
  return {
    async sendMessage(): Promise<unknown> {
      throw new Error('Could not establish connection. Receiving end does not exist.');
    },
  };
}

export type TestReceiver = {
  readonly api: MessageReceiverApi;
  deliver(
    message: unknown,
    sender?: MessageSenderInfo,
    respond?: (response: ContentResponse) => void,
  ): ContentResponse | undefined;
};

export function createTestReceiver(): TestReceiver {
  let listener:
    | ((
        rawMessage: unknown,
        sender: MessageSenderInfo,
        respond: (response: ContentResponse) => void,
      ) => void)
    | undefined;

  const receiver: TestReceiver = {
    api: {
      addListener(next): void {
        listener = next;
      },
      removeListener(next): void {
        if (listener === next) {
          listener = undefined;
        }
      },
    },
    deliver(
      message: unknown,
      sender: MessageSenderInfo = {},
      respond?: (response: ContentResponse) => void,
    ): ContentResponse | undefined {
      let response: ContentResponse | undefined;
      if (listener !== undefined) {
        listener(
          message,
          sender,
          (value: ContentResponse) => {
            response = value;
            respond?.(value);
          },
        );
      }
      return response;
    },
  };
  return receiver;
}

export type FakeView = {
  readonly view: PopupView;
  /** Estados renderizados, em ordem. */
  readonly states: PopupState[];
  /** Último estado renderizado. */
  last(): PopupState | undefined;
  /** Simula o usuário alternando o interruptor. */
  toggle(enabled: boolean): void;
};

export function createFakeView(): FakeView {
  const states: PopupState[] = [];
  const toggles: Array<(enabled: boolean) => void> = [];

  return {
    view: {
      render(state): void {
        states.push(state);
      },
      onToggle(listener): void {
        toggles.push(listener);
      },
    },
    states,
    last(): PopupState | undefined {
      return states[states.length - 1];
    },
    toggle(enabled: boolean): void {
      for (const listener of toggles) {
        listener(enabled);
      }
    },
  };
}
