/**
 * Constantes compartilhadas entre popup, content script e adaptadores.
 *
 * Toda chave/identificador visível na página ou no storage usa o prefixo
 * `ddm` para reduzir risco de colisão com o Google Docs.
 */

/** Chave única da preferência persistida em `chrome.storage.local`. */
export const STORAGE_KEY = 'ddm:preference';

/**
 * Atributo aplicado no elemento raiz (`<html>`) para ativar o tema.
 * Toda regra de estilo da extensão é escopada por este atributo, o que
 * torna a ativação/desativação reversível sem injetar ou remover folhas
 * de estilo em tempo de execução.
 */
export const THEME_ATTRIBUTE = 'data-ddm-theme';

/** Valor do atributo raiz quando o tema está ativo. */
export const THEME_ATTRIBUTE_VALUE = 'dark';

/** Identificador do protocolo de mensagens da extensão. */
export const MESSAGE_SOURCE = 'ddm';

/** Padrão de URL coberto pela extensão (usado no manifest e na validação). */
export const DOCS_DOCUMENT_PATTERN = 'https://docs.google.com/document/*';

/** Host único aceito pela extensão. */
export const DOCS_HOST = 'docs.google.com';
