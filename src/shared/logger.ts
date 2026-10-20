import type { DdmErrorCode } from './types';

/**
 * Diagnóstico controlado (RF-10).
 *
 * O log só é emitido quando `__DDM_DEBUG__` é verdadeiro — o build de
 * produção define a constante como `false`.
 *
 * Por segurança, esta API aceita apenas rótulos fixos (escopo) e códigos de
 * erro: nunca conteúdo de documentos, identificadores presentes em URLs,
 * dados pessoais ou qualquer informação sensível. Não existe parâmetro
 * livre para texto arbitrário.
 */

/** Escopos de diagnóstico permitidos. */
export type DiagnosticScope =
  | 'popup.init'
  | 'popup.storage'
  | 'popup.tabs'
  | 'popup.messaging'
  | 'popup.toggle'
  | 'popup.view'
  | 'content.init'
  | 'content.apply'
  | 'content.message'
  | 'content.storage'
  | 'platform.messaging';

const DEBUG_ENABLED = typeof __DDM_DEBUG__ === 'boolean' && __DDM_DEBUG__ === true;

/**
 * Registra uma mensagem de diagnóstico sem dados sensíveis.
 *
 * @param scope Rótulo fixo do ponto do código.
 * @param code Código de erro estável (opcional).
 */
export function logDiagnostic(scope: DiagnosticScope, code?: DdmErrorCode): void {
  if (!DEBUG_ENABLED) {
    return;
  }
  const suffix = code === undefined ? '' : ` [${code}]`;
  console.debug(`[ddm] ${scope}${suffix}`);
}
