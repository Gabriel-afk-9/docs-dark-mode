import { toUserMessage } from '../shared/errors';
import { logDiagnostic } from '../shared/logger';
import { createGetStatusMessage, createSetEnabledMessage } from '../shared/messages';
import { sendToTab, type MessageSenderApi } from '../platform/messaging';
import { readPreference, writePreference, type StorageArea } from '../platform/storage';
import { getActiveTab, type TabsQueryApi } from '../platform/tabs';
import { STRINGS } from '../shared/strings';
import type { DdmError } from '../shared/types';
import { isSupportedDocsEditorUrl } from '../shared/urls';
import {
  createLoadingState,
  type PopupState,
  type PopupView,
} from './popup-view';

/**
 * Orquestração do popup.
 *
 * Regras da fase:
 *  - a **preferência** vive no storage (fonte da verdade do interruptor);
 *  - o **estado aplicado** vive na página (fonte da verdade do texto);
 *  - nada é declarado como aplicado sem confirmação válida da página;
 *  - falha de comunicação depois de salvar resulta em estado "pendente",
 *    nunca em sucesso.
 */

export type PopupControllerDeps = {
  readonly storage: StorageArea | null;
  readonly tabs: TabsQueryApi | null;
  readonly messaging: MessageSenderApi | null;
};

export type PopupController = {
  /** Executa a leitura inicial e renderiza o estado correspondente. */
  init(): Promise<void>;
};

export function createPopupController(
  deps: PopupControllerDeps,
  view: PopupView,
): PopupController {
  let current: PopupState = createLoadingState();
  let activeTabId: number | null = null;
  let ready = false;

  const show = (state: PopupState): void => {
    current = state;
    view.render(state);
  };

  const init = async (): Promise<void> => {
    show(createLoadingState());

    if (deps.storage === null) {
      logDiagnostic('popup.storage', 'STORAGE_READ_FAILED');
      show(errorState(false, false, STRINGS.statusStorageError));
      return;
    }

    const stored = await readPreference(deps.storage);
    if (!stored.ok) {
      logDiagnostic('popup.storage', stored.error.code);
      show(errorState(false, false, describeError(stored.error)));
      return;
    }
    const preference = stored.value;
    // A partir daqui o interruptor pode ser acionado: o estado exibido é
    // que decide se a interação é permitida.
    ready = true;

    if (deps.tabs === null) {
      logDiagnostic('popup.tabs', 'TAB_QUERY_FAILED');
      show(errorState(preference.enabled, false, STRINGS.errorTabQuery));
      return;
    }

    const tab = await getActiveTab(deps.tabs);
    if (!tab.ok) {
      logDiagnostic('popup.tabs', tab.error.code);
      show(errorState(preference.enabled, false, describeError(tab.error)));
      return;
    }
    activeTabId = tab.value.tabId;

    if (tab.value.tabId === null || tab.value.url === null) {
      show(unsupportedState(preference.enabled));
      return;
    }
    if (!isSupportedDocsEditorUrl(tab.value.url)) {
      show(unsupportedState(preference.enabled));
      return;
    }

    if (deps.messaging === null) {
      logDiagnostic('popup.messaging', 'CONTENT_UNREACHABLE');
      show(errorState(preference.enabled, true, STRINGS.statusCommError));
      return;
    }

    const statusResult = await sendToTab(
      deps.messaging,
      tab.value.tabId,
      createGetStatusMessage(),
    );
    if (!statusResult.ok) {
      logDiagnostic('popup.messaging', statusResult.error.code);
      show(errorState(preference.enabled, true, describeError(statusResult.error)));
      return;
    }
    const response = statusResult.value;
    if (!response.ok) {
      logDiagnostic('popup.messaging', response.code);
      show(errorState(preference.enabled, true, describeError({ code: response.code })));
      return;
    }

    let applied = response.status.applied;
    if (applied !== preference.enabled) {
      // Divergência entre preferência e página: converge com uma única
      // mensagem idempotente.
      const converged = await sendToTab(
        deps.messaging,
        tab.value.tabId,
        createSetEnabledMessage(preference.enabled),
      );
      if (!converged.ok) {
        logDiagnostic('popup.messaging', converged.error.code);
        show(pendingState(preference.enabled));
        return;
      }
      if (!converged.value.ok) {
        logDiagnostic('popup.messaging', converged.value.code);
        show(pendingState(preference.enabled));
        return;
      }
      applied = converged.value.status.applied;
    }

    show(readyState(preference.enabled, applied));
  };

  const toggle = async (enabled: boolean): Promise<void> => {
    if (!ready || !current.interactive) {
      return;
    }
    const previous = current.enabled;
    show({ ...createLoadingState(), enabled });

    if (deps.storage === null) {
      logDiagnostic('popup.storage', 'STORAGE_WRITE_FAILED');
      show(errorState(previous, false, STRINGS.statusStorageError));
      return;
    }

    const written = await writePreference(deps.storage, { enabled });
    if (!written.ok) {
      logDiagnostic('popup.storage', written.error.code);
      // Nada foi salvo: o interruptor volta ao valor anterior.
      show(errorState(previous, true, describeError(written.error)));
      return;
    }

    if (deps.messaging === null || activeTabId === null) {
      logDiagnostic('popup.messaging', 'CONTENT_UNREACHABLE');
      show(pendingState(enabled));
      return;
    }

    const sent = await sendToTab(
      deps.messaging,
      activeTabId,
      createSetEnabledMessage(enabled),
    );
    if (!sent.ok) {
      logDiagnostic('popup.messaging', sent.error.code);
      show(pendingState(enabled));
      return;
    }
    if (!sent.value.ok) {
      logDiagnostic('popup.messaging', sent.value.code);
      show(pendingState(enabled));
      return;
    }
    if (sent.value.status.applied !== enabled) {
      // A página não confirmou a aplicação: o estado é pendente, não ativo.
      show(pendingState(enabled));
      return;
    }

    show(readyState(enabled, sent.value.status.applied));
  };

  view.onToggle((enabled) => {
    void toggle(enabled);
  });

  return { init };
}

/** Constrói o estado "pronto" a partir da preferência e do estado aplicado. */
function readyState(enabled: boolean, applied: boolean): PopupState {
  if (enabled && applied) {
    return {
      kind: 'ready',
      enabled,
      interactive: true,
      message: STRINGS.statusActiveInterface,
      tone: 'info',
    };
  }
  if (!enabled && !applied) {
    return {
      kind: 'ready',
      enabled,
      interactive: true,
      message: STRINGS.statusInactive,
      tone: 'info',
    };
  }
  return {
    kind: 'pending',
    enabled,
    interactive: true,
    message: STRINGS.statusDivergent,
    tone: 'warning',
  };
}

/** Estado em que a preferência foi salva, mas a aplicação não foi confirmada. */
function pendingState(enabled: boolean): PopupState {
  return {
    kind: 'pending',
    enabled,
    interactive: true,
    message: STRINGS.statusPending,
    tone: 'warning',
  };
}

function unsupportedState(enabled: boolean): PopupState {
  return {
    kind: 'unsupported',
    enabled,
    interactive: false,
    message: STRINGS.statusUnsupported,
    tone: 'info',
  };
}

function errorState(enabled: boolean, interactive: boolean, message: string): PopupState {
  return {
    kind: 'error',
    enabled,
    interactive,
    message,
    tone: 'error',
  };
}

/**
 * Traduz um erro técnico na mensagem exibida.
 *
 * As mensagens de estado do PRD (RF-07) têm prioridade; o restante usa o
 * mapeamento centralizado de `shared/errors.ts`.
 */
function describeError(error: DdmError): string {
  switch (error.code) {
    case 'STORAGE_READ_FAILED':
    case 'STORAGE_WRITE_FAILED':
      return STRINGS.statusStorageError;
    case 'CONTENT_UNREACHABLE':
      return STRINGS.statusCommError;
    case 'UNSUPPORTED_PAGE':
      return STRINGS.statusUnsupported;
    default:
      return toUserMessage(error);
  }
}
