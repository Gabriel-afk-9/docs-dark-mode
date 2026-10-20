import { THEME_ATTRIBUTE, THEME_ATTRIBUTE_VALUE } from '../shared/constants';

/**
 * Aplicação do atributo do tema no elemento raiz da página.
 *
 * Este módulo é o **único** que altera o DOM da página. Ele não conhece
 * mensagens, storage nem preferências: apenas aplica e remove o atributo
 * que marca o tema como ativo (RF-04).
 *
 * Como todas as regras de estilo da extensão são escopadas por esse
 * atributo, ativação e desativação são reversíveis sem injetar ou remover
 * folhas de estilo em tempo de execução.
 */

/** Alvo do atributo (na prática, `document.documentElement`). */
export type ThemeTarget = {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
};

/** Indica se o atributo de tema está aplicado no alvo. */
export function isThemeApplied(target: ThemeTarget): boolean {
  return target.getAttribute(THEME_ATTRIBUTE) === THEME_ATTRIBUTE_VALUE;
}

/**
 * Aplica o atributo de tema. Idempotente: chamar de novo não duplica
 * trabalho nem altera o resultado.
 */
export function applyTheme(target: ThemeTarget): void {
  if (isThemeApplied(target)) {
    return;
  }
  target.setAttribute(THEME_ATTRIBUTE, THEME_ATTRIBUTE_VALUE);
}

/**
 * Remove o atributo de tema. Idempotente: remover quando o atributo não
 * existe não gera erro nem alteração no DOM.
 */
export function removeTheme(target: ThemeTarget): void {
  if (target.getAttribute(THEME_ATTRIBUTE) === null) {
    return;
  }
  target.removeAttribute(THEME_ATTRIBUTE);
}
