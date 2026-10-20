import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Contrato estático da folha de estilo da interface (Fase 3).
 *
 * Estes testes verificam **invariantes** do arquivo: escopo do atributo
 * de tema, invólucro de impressão, ausência de filtros, de `!important` e
 * de seletores do conteúdo do documento.
 *
 * Eles **não** provam compatibilidade visual com o Google Docs: nenhuma
 * asserção aqui garante que os seletores casem com o editor real. Essa
 * validação depende de inspeção manual em sessão autenticada.
 */

const cssPath = resolve(process.cwd(), 'src/content/styles/docs-theme.css');
const rawCss = readFileSync(cssPath, 'utf8');

/** Prefixo obrigatório de todo seletor do tema. */
const SCOPE = "html[data-ddm-theme='dark']";

/** Tokens que precisam existir dentro do escopo do tema. */
const REQUIRED_TOKENS = [
  '--ddm-bg',
  '--ddm-surface',
  '--ddm-surface-raised',
  '--ddm-overlay',
  '--ddm-text',
  '--ddm-text-muted',
  '--ddm-border',
  '--ddm-divider',
  '--ddm-hover',
  '--ddm-active',
  '--ddm-selected',
  '--ddm-focus',
  '--ddm-accent',
  '--ddm-danger',
];

/**
 * Contêineres de interface autorizados a receber regra de `::selection`.
 * A área de edição do documento não faz parte da lista: a seleção do
 * documento permanece nativa.
 */
const SELECTION_SCOPE = [
  'input',
  'textarea',
  'select',
  "[role='dialog']",
  "[role='menu']",
  "[role='toolbar']",
  "[role='complementary']",
  "[role='navigation']",
];

/** Remove comentários, que guardam convenções de manutenção. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

type ParsedRule = {
  readonly selector: string;
  readonly body: string;
};

/**
 * Extrai o conteúdo do único invólucro `@media screen` e devolve as
 * regras internas. Lança se a estrutura não for a esperada.
 */
function parseThemeSheet(css: string): { rules: ParsedRule[]; content: string } {
  const trimmed = css.trim();
  const header = /^@media\s+screen\s*\{/.exec(trimmed);
  if (header === null) {
    throw new Error('a folha de estilo precisa estar dentro de @media screen');
  }

  let depth = 0;
  for (let index = header[0].length - 1; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        const content = trimmed.slice(header[0].length, index);
        const trailing = trimmed.slice(index + 1).trim();
        if (trailing !== '') {
          throw new Error('há conteúdo fora do invólucro @media screen');
        }
        return { rules: parseRules(content), content };
      }
    }
  }

  throw new Error('chaves desbalanceadas: o invólucro @media screen não foi fechado');
}

/** Divide o conteúdo interno em pares (seletor, corpo). */
function parseRules(content: string): ParsedRule[] {
  const rules: ParsedRule[] = [];
  let index = 0;

  while (index < content.length) {
    if (/\s/.test(content[index] ?? '')) {
      index += 1;
      continue;
    }

    const blockStart = content.indexOf('{', index);
    if (blockStart === -1) {
      if (content.slice(index).trim() !== '') {
        throw new Error('conteúdo inesperado ao final da folha de estilo');
      }
      break;
    }

    const selector = content.slice(index, blockStart).trim();
    let depth = 0;
    let cursor = blockStart;
    for (; cursor < content.length; cursor += 1) {
      const char = content[cursor];
      if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          break;
        }
      }
    }
    if (cursor >= content.length) {
      throw new Error(`regra sem fechamento: ${selector}`);
    }
    if (selector.startsWith('@')) {
      throw new Error(`at-rule aninhado não permitido: ${selector}`);
    }

    rules.push({ selector, body: content.slice(blockStart + 1, cursor) });
    index = cursor + 1;
  }

  return rules;
}

/** Divide um seletor em alternativas, ignorando espaços extras. */
function alternativesOf(selector: string): string[] {
  return selector
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/** Conta os blocos abertos no nível mais externo do arquivo. */
function topLevelBlockCount(css: string): number {
  let depth = 0;
  let count = 0;
  for (const char of css) {
    if (char === '{') {
      if (depth === 0) {
        count += 1;
      }
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
    }
  }
  return count;
}

const strippedCss = stripComments(rawCss);
const { rules } = parseThemeSheet(strippedCss);

describe('folha de estilo da interface', () => {
  it('está inteiramente dentro de um único invólucro @media screen', () => {
    expect(strippedCss.match(/@media/g) ?? []).toHaveLength(1);
    expect(() => parseThemeSheet(strippedCss)).not.toThrow();
  });

  it('mantém a impressão fora do alcance: existe um único bloco de nível superior', () => {
    const opens = (strippedCss.match(/\{/g) ?? []).length;
    const closes = (strippedCss.match(/\}/g) ?? []).length;
    expect(opens).toBe(closes);
    expect(topLevelBlockCount(strippedCss)).toBe(1);
  });

  it('tem regras suficientes para cobrir a interface', () => {
    expect(rules.length).toBeGreaterThan(15);
  });

  it('escopa todos os seletores pelo atributo de tema', () => {
    const unscoped: string[] = [];
    for (const rule of rules) {
      for (const alternative of alternativesOf(rule.selector)) {
        if (!alternative.startsWith(SCOPE)) {
          unscoped.push(alternative);
        }
      }
    }
    expect(unscoped).toEqual([]);
  });

  it('define os tokens obrigatórios dentro do escopo do tema', () => {
    const tokenRule = rules.find((rule) => rule.selector === SCOPE);
    expect(tokenRule).toBeDefined();
    for (const token of REQUIRED_TOKENS) {
      expect(tokenRule?.body).toContain(`${token}:`);
    }
  });

  it('não usa `color-scheme` nesta fase', () => {
    // `color-scheme: dark` troca a cor de texto padrão do elemento raiz e
    // essa cor é herdada por qualquer conteúdo sem cor explícita, o que
    // pode alcançar a área de edição do documento. Nesta fase as barras de
    // rolagem são estilizadas só pelas regras `::-webkit-scrollbar`.
    expect(strippedCss).not.toContain('color-scheme');
    expect(rules.some((rule) => rule.body.includes('color-scheme'))).toBe(false);
  });

  it('não usa `!important`', () => {
    expect(strippedCss).not.toContain('!important');
  });

  it('não aplica filtros de cor', () => {
    expect(strippedCss).not.toContain('filter');
    expect(strippedCss).not.toContain('invert(');
    expect(strippedCss).not.toContain('backdrop-filter');
  });

  it('não carrega recursos externos', () => {
    expect(strippedCss).not.toContain('@import');
    expect(strippedCss).not.toContain('url(');
  });

  it('não estiliza o conteúdo do documento', () => {
    expect(strippedCss).not.toContain('.kix-');
    expect(strippedCss).not.toContain('canvas');
    expect(strippedCss).not.toContain('contenteditable');
    // O contêiner do documento hospeda a área de edição: ele pertence ao
    // tema da página do documento (Fase 4), não ao da interface.
    expect(strippedCss).not.toContain('#docs-editor-container');
  });

  it('não usa o seletor universal nem `:root`', () => {
    expect(strippedCss).not.toContain(':root');
    for (const rule of rules) {
      for (const alternative of alternativesOf(rule.selector)) {
        expect(alternative).not.toContain('*');
      }
    }
  });

  it('restringe `::selection` a campos e componentes de interface', () => {
    const selectionRules = rules.filter((rule) => rule.selector.includes('::selection'));
    expect(selectionRules.length).toBeGreaterThan(0);

    for (const rule of selectionRules) {
      for (const alternative of alternativesOf(rule.selector)) {
        expect(alternative).toContain('::selection');
        const scoped = SELECTION_SCOPE.some((token) => alternative.includes(token));
        expect(scoped).toBe(true);
      }
    }
  });

  it('não aplica uma regra global de seleção', () => {
    for (const rule of rules) {
      for (const alternative of alternativesOf(rule.selector)) {
        expect(alternative).not.toBe(`${SCOPE}::selection`);
      }
    }
  });

  it('trata campos, foco e estados desabilitados da interface', () => {
    const css = strippedCss;
    expect(css).toContain('::placeholder');
    expect(css).toContain(':focus');
    expect(css).toContain(':disabled');
    expect(css).toContain(':hover');
  });

  it('cobre barras de rolagem nativas do navegador', () => {
    expect(strippedCss).toContain('::-webkit-scrollbar');
    expect(strippedCss).toContain('::-webkit-scrollbar-thumb');
    expect(strippedCss).toContain('::-webkit-scrollbar-track');
  });
});
