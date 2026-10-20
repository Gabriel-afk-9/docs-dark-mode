import { createError } from '../shared/errors';
import type { ContentStatus, Result } from '../shared/types';
import { applyTheme, isThemeApplied, removeTheme, type ThemeTarget } from './theme-applier';

/**
 * Estado do tema na página.
 *
 * O controller é a única fonte do estado **aplicado**. Ele não guarda uma
 * cópia da preferência: o estado é sempre derivado do DOM, o que evita
 * estado duplicado e divergente (RF-08).
 */

/**
 * Estado do tema do documento (RF-05).
 *
 * Fase 2: o tema da página do documento (filtro de canvas) ainda não foi
 * implementado — ele chega na Fase 4. Por isso o valor reportado é `off`,
 * com o comentário de que se trata de um recurso ausente, e não de uma
 * limitação da página.
 */
const DOCUMENT_THEME_STATE = 'off' as const;

export type ThemeController = {
  /** Estado aplicado no momento da leitura. */
  getStatus(): Result<ContentStatus>;
  /** Aplica (true) ou remove (false) o tema. Idempotente. */
  setEnabled(enabled: boolean): Result<ContentStatus>;
};

export function createThemeController(target: ThemeTarget): ThemeController {
  const getStatus = (): Result<ContentStatus> => {
    try {
      const applied = isThemeApplied(target);
      return {
        ok: true,
        value: {
          enabled: applied,
          applied,
          documentTheme: DOCUMENT_THEME_STATE,
        },
      };
    } catch (cause) {
      return { ok: false, error: createError('APPLY_FAILED', cause) };
    }
  };

  const setEnabled = (enabled: boolean): Result<ContentStatus> => {
    try {
      if (enabled) {
        applyTheme(target);
      } else {
        removeTheme(target);
      }
      return getStatus();
    } catch (cause) {
      return { ok: false, error: createError('APPLY_FAILED', cause) };
    }
  };

  return { getStatus, setEnabled };
}
