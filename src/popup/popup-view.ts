import { logDiagnostic } from '../shared/logger';
import { STRINGS } from '../shared/strings';

/**
 * Camada de visualização do popup.
 *
 * Este módulo é o **único** que toca no DOM do popup. Ele não sabe nada
 * sobre storage, abas ou mensagens: apenas reflete um estado e avisa
 * quando o usuário alterna o interruptor.
 */

/** Tom visual do texto de status. */
export type PopupTone = 'info' | 'warning' | 'error';

/** Natureza do estado exibido. */
export type PopupStateKind = 'loading' | 'ready' | 'pending' | 'unsupported' | 'error';

/**
 * Estado completo do popup.
 *
 * `enabled` é a **preferência** (fonte da verdade: storage).
 * `applied` é o estado realmente aplicado na página (fonte da verdade: DOM).
 * Os dois conceitos são independentes e nunca são misturados.
 */
export type PopupState = {
  readonly kind: PopupStateKind;
  /** Valor do interruptor (preferência persistida). */
  readonly enabled: boolean;
  /** Se o interruptor aceita interação do usuário. */
  readonly interactive: boolean;
  /** Texto de status já pronto para exibição. */
  readonly message: string;
  readonly tone: PopupTone;
};

export type PopupView = {
  render(state: PopupState): void;
  /** Registra o ouvinte das alterações feitas pelo usuário no interruptor. */
  onToggle(listener: (enabled: boolean) => void): void;
};

const SWITCH_ID = 'ddm-enabled';
const STATUS_ID = 'ddm-status';

export function createPopupView(root: ParentNode): PopupView {
  const switchInput = root.querySelector<HTMLInputElement>(`#${SWITCH_ID}`);
  const status = root.querySelector<HTMLElement>(`#${STATUS_ID}`);
  const listeners = new Set<(enabled: boolean) => void>();

  if (switchInput === null || status === null) {
    // HTML estático incompleto: o popup continua utilizável, apenas sem
    // controle de estado.
    logDiagnostic('popup.view');
  }

  const handleChange = (): void => {
    if (switchInput === null) {
      return;
    }
    const enabled = switchInput.checked;
    for (const listener of listeners) {
      listener(enabled);
    }
  };

  switchInput?.addEventListener('change', handleChange);

  return {
    render(state: PopupState): void {
      if (switchInput !== null) {
        switchInput.checked = state.enabled;
        switchInput.disabled = !state.interactive;
      }
      if (status !== null) {
        status.textContent = state.message;
        status.dataset['ddmTone'] = state.tone;
      }
    },
    onToggle(listener: (enabled: boolean) => void): void {
      listeners.add(listener);
    },
  };
}

/** Estado inicial, exibido antes de qualquer leitura. */
export function createLoadingState(): PopupState {
  return {
    kind: 'loading',
    enabled: false,
    interactive: false,
    message: STRINGS.statusLoading,
    tone: 'info',
  };
}
