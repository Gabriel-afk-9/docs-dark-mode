/**
 * Textos dependentes de estado da interface, centralizados em pt-BR
 * (PRD 1.1 e seção 6).
 *
 * Textos estáticos do popup (nome, descrição, rótulo do interruptor) ficam
 * no `popup.html`, para que o popup continue legível sem JavaScript.
 * Nenhuma lógica deve ficar aqui: apenas texto exibido ao usuário.
 */

export const STRINGS = {
  statusLoading: 'Carregando…',
  /**
   * Fase 3: o tema da interface existe (`data-ddm-theme="dark"` + folha
   * `docs-theme.css`). A página do documento continua sem tema: o texto
   * diz exatamente o que está aplicado e não afirma que o documento está
   * escuro.
   */
  statusActiveInterface:
    'Interface com tema escuro ativo; a página do documento ainda não é alterada.',
  statusInactive: 'Modo escuro desativado.',
  statusUnsupported: 'Abra um documento do Google Docs para usar esta extensão.',
  statusCommError:
    'Não foi possível comunicar com esta página. Tente recarregar o documento.',
  statusPending:
    'A preferência foi salva, mas o tema ainda não pôde ser aplicado.',
  statusDivergent:
    'A página e a preferência salva estão em estados diferentes. Tente recarregar o documento.',
  statusStorageError:
    'Não foi possível ler ou salvar a preferência. Recarregue o popup.',

  errorStorageRead: 'Não foi possível ler a preferência salva.',
  errorStorageWrite: 'Não foi possível salvar a preferência.',
  errorTabQuery: 'Não foi possível identificar a aba ativa.',
  errorContentUnreachable: 'Não foi possível comunicar com esta página.',
  errorInvalidMessage: 'A resposta recebida não é válida.',
  errorUnsupportedPage: 'Esta página não é compatível com a extensão.',
  errorApplyFailed: 'Não foi possível aplicar o tema nesta página.',
  errorUnknown: 'Ocorreu um erro inesperado.',
} as const;
