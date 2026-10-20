import { logDiagnostic } from '../shared/logger';
import {
  createErrorResponse,
  createStatusResponse,
  type PopupToContentMessage,
} from '../shared/messages';
import {
  registerMessageHandler,
  type MessageHandler,
  type MessageReceiverApi,
} from '../platform/messaging';
import {
  readPreference,
  subscribeToPreferenceChanges,
  type StorageArea,
  type StorageChangeListenerApi,
} from '../platform/storage';
import { DEFAULT_PREFERENCE } from '../shared/types';
import { isSupportedDocsEditorUrl } from '../shared/urls';
import { createThemeController, type ThemeController } from './theme-controller';
import type { ThemeTarget } from './theme-applier';

/**
 * Content script do Google Docs.
 *
 * Responsabilidades (PRD 7.3):
 *  - aplicar o estado do tema na página;
 *  - responder às mensagens do popup;
 *  - acompanhar mudanças da preferência (sincronização entre abas).
 *
 * O módulo não conhece a API do navegador: as dependências são injetadas,
 * o que permite testá-lo sem navegador.
 */

export type ContentScriptDeps = {
  /** Elemento raiz da página (`document.documentElement`). */
  readonly target: ThemeTarget;
  /** URL da página, usada para validar a compatibilidade (RF-03). */
  readonly href: string;
  readonly storage: StorageArea | null;
  readonly changes: StorageChangeListenerApi | null;
  readonly receiver: MessageReceiverApi | null;
  /** Id da extensão esperado no remetente das mensagens. */
  readonly senderId?: string;
};

export type ContentScriptHandle = {
  /** Conclui quando o estado inicial foi aplicado. */
  readonly ready: Promise<void>;
  /** Remove listeners e assinaturas. */
  dispose(): void;
};

/**
 * Manipulador das mensagens do popup.
 *
 * `ddm:get-status` devolve o estado aplicado; `ddm:set-enabled` aplica o
 * estado pedido e devolve o estado resultante. A resposta só declara
 * sucesso quando a aplicação foi de fato realizada.
 */
export function createContentMessageHandler(controller: ThemeController): MessageHandler {
  return (message: PopupToContentMessage) => {
    if (message.kind === 'ddm:get-status') {
      const status = controller.getStatus();
      return status.ok ? createStatusResponse(status.value) : createErrorResponse(status.error.code);
    }
    const result = controller.setEnabled(message.enabled);
    if (!result.ok) {
      logDiagnostic('content.apply', result.error.code);
      return createErrorResponse(result.error.code);
    }
    return createStatusResponse(result.value);
  };
}

/**
 * Inicia o content script.
 *
 * Em páginas não compatíveis o script não registra nenhum listener: o
 * popup também não envia mensagens para essas páginas.
 */
export function startContentScript(deps: ContentScriptDeps): ContentScriptHandle {
  if (!isSupportedDocsEditorUrl(deps.href)) {
    logDiagnostic('content.init');
    return {
      ready: Promise.resolve(),
      dispose: () => {
        /* nada a descartar */
      },
    };
  }

  const controller = createThemeController(deps.target);
  const disposers: Array<() => void> = [];

  if (deps.receiver !== null) {
    disposers.push(
      registerMessageHandler(deps.receiver, createContentMessageHandler(controller), {
        expectedSenderId: deps.senderId,
      }),
    );
  }

  if (deps.changes !== null) {
    disposers.push(
      subscribeToPreferenceChanges(deps.changes, (preference) => {
        const result = controller.setEnabled(preference.enabled);
        if (!result.ok) {
          logDiagnostic('content.apply', result.error.code);
        }
      }),
    );
  }

  return {
    ready: applyInitialPreference(deps.storage, controller),
    dispose: () => {
      for (const dispose of disposers) {
        dispose();
      }
    },
  };
}

/**
 * Aplica a preferência persistida no carregamento da página.
 *
 * Falhas de leitura não são fatais: a página segue no estado padrão
 * (desativado) e o content script continua respondendo às mensagens.
 */
async function applyInitialPreference(
  storage: StorageArea | null,
  controller: ThemeController,
): Promise<void> {
  if (storage === null) {
    logDiagnostic('content.init');
    controller.setEnabled(DEFAULT_PREFERENCE.enabled);
    return;
  }
  const stored = await readPreference(storage);
  if (!stored.ok) {
    logDiagnostic('content.storage', stored.error.code);
    controller.setEnabled(DEFAULT_PREFERENCE.enabled);
    return;
  }
  const result = controller.setEnabled(stored.value.enabled);
  if (!result.ok) {
    logDiagnostic('content.apply', result.error.code);
  }
}
