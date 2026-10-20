import { DOCS_HOST } from './constants';

/**
 * Validação de URL compatível (RF-03).
 *
 * São aceitas apenas páginas de edição do Google Docs em HTTPS:
 *  - /document/d/<id>[/edit]
 *  - /document/u/<n>/d/<id>[/edit]
 *  - /document/create e /document/u/<n>/create
 *
 * Páginas de listagem, visualização publicada (`/pub`), pré-visualização,
 * modo básico para celular e páginas de outros produtos ficam de fora.
 */
const EDITOR_PATH_PATTERN =
  /^\/document\/(?:u\/\d+\/)?(?:create|d\/[A-Za-z0-9_-]+(?:\/edit)?)\/?$/;

export function isSupportedDocsEditorUrl(rawUrl: string): boolean {
  const parsed = parseUrl(rawUrl);
  if (parsed === null) {
    return false;
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== DOCS_HOST) {
    return false;
  }
  return EDITOR_PATH_PATTERN.test(parsed.pathname);
}

function parseUrl(rawUrl: string): URL | null {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0) {
    return null;
  }
  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
}
