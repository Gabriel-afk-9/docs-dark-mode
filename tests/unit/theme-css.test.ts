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

/**
 * Allowlist de exceções de especificidade (`!important`).
 *
 * Cada entrada exige uma medição de cascata real no editor do Google Docs e
 * só vale para o par exato (seletor, propriedade) declarado aqui.
 *
 * 1. `#docs-toolbar-wrapper` / `background-color`
 *    Medição (2026-10-21, editor real): fundo computado rgb(240, 244, 249);
 *    atributo `style` inline apenas com `width: 899px`; declaração normal do
 *    tema não vencia a cascata; declaração de autor com `!important` vencia;
 *    remover o atributo `style` inline não alterava o fundo.
 */
const IMPORTANT_ALLOWLIST: ReadonlyArray<{ selector: string; property: string }> = [
  { selector: `${SCOPE} #docs-toolbar-wrapper`, property: 'background-color' },
];

/**
 * Contêineres da área de trabalho que recebem apenas fundo.
 *
 * São as superfícies atrás dos elementos da página: pintam o entorno e a
 * régua, sem alcançar a folha nem o conteúdo editável.
 */
const WORKSPACE_SURFACES = ['#docs-editor-container', '#docs-editor'];

/**
 * Registro de classes internas do editor (`.kix-*`) autorizadas.
 *
 * A lista está vazia nesta rodada: nenhuma classe `.kix-*` é usada. Se uma
 * passar a ser necessária, ela entra aqui com a evidência do diagnóstico.
 */
const KIX_ALLOWLIST: ReadonlyArray<string> = [];

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

/**
 * Localiza a regra que declara o seletor informado como alternativa exata.
 * É o que permite verificar *o que* a regra declara, e não apenas que o
 * seletor existe no arquivo.
 */
function ruleFor(selector: string): ParsedRule | undefined {
  return rules.find((rule) => alternativesOf(rule.selector).includes(selector));
}

/** Lê o valor de uma declaração dentro do corpo de uma regra. */
function declarationValue(body: string, property: string): string | undefined {
  const match = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`).exec(body);
  return match?.[1]?.trim();
}

/** Declaração individual de uma regra, já sem a marcação de prioridade. */
type Declaration = {
  readonly property: string;
  readonly value: string;
  readonly important: boolean;
};

/**
 * Divide o corpo de uma regra em declarações, marcando as que carregam
 * `!important`. É o que permite conferir a allowlist de exceções de
 * especificidade por par (seletor, propriedade).
 */
function declarationsOf(body: string): Declaration[] {
  const declarations: Declaration[] = [];
  for (const part of body.split(';')) {
    const text = part.trim();
    if (text === '') {
      continue;
    }
    const separator = text.indexOf(':');
    if (separator === -1) {
      continue;
    }
    const property = text.slice(0, separator).trim();
    if (property === '') {
      continue;
    }
    const raw = text.slice(separator + 1).trim();
    const important = /!important/i.test(raw);
    const value = important ? raw.replace(/!important/i, '').trim() : raw;
    declarations.push({ property, value, important });
  }
  return declarations;
}

/** Todas as regras que declaram o seletor informado como alternativa exata. */
function rulesFor(selector: string): ParsedRule[] {
  return rules.filter((rule) => alternativesOf(rule.selector).includes(selector));
}

/** Valor de um token declarado no bloco de tokens do tema. */
function tokenValue(name: string): string {
  const tokenRule = rules.find((rule) => rule.selector === SCOPE);
  const value = declarationValue(tokenRule?.body ?? '', name);
  if (value === undefined) {
    throw new Error(`token ausente no bloco de tokens: ${name}`);
  }
  return value;
}

/** Converte `#rrggbb` (ou `#rgb`) em canais de 0 a 255. */
function hexToRgb(hex: string): [number, number, number] {
  const digits = hex.trim().replace('#', '');
  const full =
    digits.length === 3
      ? digits
          .split('')
          .map((digit) => digit + digit)
          .join('')
      : digits;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

/** Luminância relativa WCAG de uma cor RGB. */
function relativeLuminance([red, green, blue]: [number, number, number]): number {
  const toLinear = (channel: number): number => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(red) + 0.7152 * toLinear(green) + 0.0722 * toLinear(blue);
}

/** Razão de contraste WCAG entre duas cores hexadecimais. */
function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(hexToRgb(foreground));
  const second = relativeLuminance(hexToRgb(background));
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
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

  it('limita as exceções de especificidade a uma allowlist exata', () => {
    // Nenhuma ocorrência de `!important` pode existir fora da allowlist.
    for (const rule of rules) {
      for (const alternative of alternativesOf(rule.selector)) {
        for (const declaration of declarationsOf(rule.body)) {
          if (!declaration.important) {
            continue;
          }
          const permitted = IMPORTANT_ALLOWLIST.some(
            (entry) =>
              entry.selector === alternative && entry.property === declaration.property,
          );
          expect(
            permitted,
            `!important fora da allowlist: ${alternative} { ${declaration.property} }`,
          ).toBe(true);
        }
      }
    }

    // Nenhuma entrada da allowlist pode ficar órfã.
    for (const entry of IMPORTANT_ALLOWLIST) {
      const used = rules.some(
        (rule) =>
          alternativesOf(rule.selector).includes(entry.selector) &&
          declarationsOf(rule.body).some(
            (declaration) =>
              declaration.property === entry.property && declaration.important,
          ),
      );
      expect(
        used,
        `entrada órfã na allowlist: ${entry.selector} / ${entry.property}`,
      ).toBe(true);
    }

    // A lista é curta por decisão de projeto, não por acaso.
    expect(IMPORTANT_ALLOWLIST.length).toBeLessThanOrEqual(3);
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
    expect(strippedCss).not.toContain('canvas');
    expect(strippedCss).not.toContain('contenteditable');
    // Classes internas do editor (`.kix-*`) não são usadas: qualquer uma
    // precisa estar registrada explicitamente, com a evidência do
    // diagnóstico que a justificou.
    for (const rule of rules) {
      for (const alternative of alternativesOf(rule.selector)) {
        if (!alternative.includes('.kix-')) {
          continue;
        }
        const registered = KIX_ALLOWLIST.some((entry) => alternative.includes(entry));
        expect(registered, `classe .kix-* não registrada: ${alternative}`).toBe(true);
      }
    }
  });

  it('limita os contêineres da área de trabalho a superfícies de fundo', () => {
    const found = rules.filter((rule) =>
      alternativesOf(rule.selector).some((alternative) =>
        WORKSPACE_SURFACES.some((surface) => alternative.endsWith(surface)),
      ),
    );
    expect(found.length, 'nenhuma regra para a área de trabalho').toBeGreaterThan(0);

    for (const rule of found) {
      for (const declaration of declarationsOf(rule.body)) {
        expect(
          declaration.property,
          `a área de trabalho só pode declarar fundo, mas declara ${declaration.property}`,
        ).toBe('background-color');
      }
      // Sem descendentes: a regra precisa parar no próprio contêiner, para
      // não alcançar a folha nem o conteúdo editável.
      for (const alternative of alternativesOf(rule.selector)) {
        const approved = WORKSPACE_SURFACES.some((surface) => alternative.endsWith(surface));
        expect(approved, `seletor além do contêiner: ${alternative}`).toBe(true);
      }
    }

    for (const surface of WORKSPACE_SURFACES) {
      expect(rulesFor(`${SCOPE} ${surface}`).length, `regra ausente para ${surface}`).toBeGreaterThan(0);
    }
  });

  it('desativar o tema remove o efeito de todas as regras', () => {
    // Todas as regras — inclusive a exceção de especificidade — dependem do
    // atributo no elemento raiz: sem ele, nenhuma regra casa.
    for (const rule of rules) {
      for (const alternative of alternativesOf(rule.selector)) {
        const parts = alternative.split(/\s+/);
        expect(parts[0], `seletor fora do escopo: ${alternative}`).toBe(SCOPE);
        expect(alternative, `seletor universal: ${alternative}`).not.toMatch(/(^|\s)\*/);
      }
    }

    for (const entry of IMPORTANT_ALLOWLIST) {
      expect(entry.selector.split(/\s+/)[0]).toBe(SCOPE);
    }
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

  /* -------------------------------------------------------------------
   * Efeito das regras nos contêineres reais da interface
   *
   * A simples presença de um seletor não prova efeito. Estes testes leem as
   * declarações de cada regra e conferem propriedade e valor, para que uma
   * regra vazia, com a cor errada ou com o seletor trocado seja detectada.
   * ----------------------------------------------------------------- */

  it('aplica fundo e cor nos contêineres reais da interface', () => {
    const containers = ['#docs-titlebar', '#docs-chrome', '#docs-menubar', '#docs-toolbar-wrapper'];

    for (const id of containers) {
      const rule = ruleFor(`${SCOPE} ${id}`);
      expect(rule, `regra ausente para ${id}`).toBeDefined();
      const declarations = declarationsOf(rule?.body ?? '');
      const background = declarations.find((item) => item.property === 'background-color');
      const color = declarations.find((item) => item.property === 'color');
      expect(background?.value, `fundo ausente em ${id}`).toBe('var(--ddm-surface)');
      expect(color?.value, `cor ausente em ${id}`).toBe('var(--ddm-text)');
    }
  });

  it('torna o texto do título legível sobre a superfície escura', () => {
    const rule = ruleFor(`${SCOPE} #docs-title-input-label-inner`);
    expect(rule, 'regra ausente para o rótulo do título').toBeDefined();
    expect(declarationValue(rule?.body ?? '', 'color')).toBe('var(--ddm-text)');
  });

  it('usa a exceção de especificidade na barra de ferramentas', () => {
    // A medição de cascata de 2026-10-21 mostrou que o fundo da barra vem
    // de uma regra do editor com prioridade maior: só a exceção declarada
    // na allowlist vence, e ela vale só para `background-color`.
    const rule = ruleFor(`${SCOPE} #docs-toolbar-wrapper`);
    expect(rule).toBeDefined();

    const declaration = declarationsOf(rule?.body ?? '').find(
      (item) => item.property === 'background-color',
    );
    expect(declaration?.value).toBe('var(--ddm-surface)');
    expect(declaration?.important).toBe(true);

    // A sombra provisória que pintava a barra por cima foi removida.
    expect(declarationValue(rule?.body ?? '', 'box-shadow')).toBeUndefined();
    expect(strippedCss).not.toContain('100vmax');
  });

  it('desenha a divisória do título sem alterar a altura do contêiner', () => {
    const rule = ruleFor(`${SCOPE} #docs-titlebar`);
    expect(rule).toBeDefined();
    expect(declarationValue(rule?.body ?? '', 'border-bottom')).toBeUndefined();
    expect(declarationValue(rule?.body ?? '', 'box-shadow')).toBe('inset 0 -1px 0 var(--ddm-divider)');
  });

  it('destaca os itens de menu confirmados com texto claro', () => {
    for (const id of ['#docs-file-menu', '#docs-edit-menu', '#docs-view-menu']) {
      const rule = ruleFor(`${SCOPE} ${id}`);
      expect(rule, `regra ausente para ${id}`).toBeDefined();
      expect(declarationValue(rule?.body ?? '', 'color')).toBe('var(--ddm-text)');
    }
  });

  it('destaca os botões confirmados da barra de ferramentas', () => {
    for (const id of ['#undoButton', '#redoButton', '#printButton']) {
      const rule = ruleFor(`${SCOPE} ${id}`);
      expect(rule, `regra ausente para ${id}`).toBeDefined();
      expect(declarationValue(rule?.body ?? '', 'background-color')).toBe('transparent');
      expect(declarationValue(rule?.body ?? '', 'color')).toBe('var(--ddm-text)');
    }
  });

  it('trata os campos da barra de ferramentas como controles escuros', () => {
    for (const id of ['#zoomSelect', '#headingStyleSelect', '#fontSizeSelect', '#docs-font-family']) {
      const rule = ruleFor(`${SCOPE} ${id}`);
      expect(rule, `regra ausente para ${id}`).toBeDefined();
      expect(declarationValue(rule?.body ?? '', 'background-color')).toBe('var(--ddm-surface-raised)');
      expect(declarationValue(rule?.body ?? '', 'color')).toBe('var(--ddm-text)');
      expect(declarationValue(rule?.body ?? '', 'border-color')).toBe('var(--ddm-border)');
    }
  });

  it('trata hover, foco visível e estados desabilitados dos controles confirmados', () => {
    for (const id of ['#undoButton', '#redoButton', '#printButton']) {
      const hover = ruleFor(`${SCOPE} ${id}:hover`);
      expect(hover, `regra de hover ausente para ${id}`).toBeDefined();
      expect(declarationValue(hover?.body ?? '', 'background-color')).toBe('var(--ddm-hover)');
    }

    const focus = ruleFor(`${SCOPE} #undoButton:focus-visible`);
    expect(focus, 'regra de foco visível ausente').toBeDefined();
    expect(declarationValue(focus?.body ?? '', 'outline')).toBe('2px solid var(--ddm-focus)');

    const disabled = ruleFor(`${SCOPE} #undoButton[aria-disabled='true']`);
    expect(disabled, 'regra de estado desabilitado ausente').toBeDefined();
    expect(declarationValue(disabled?.body ?? '', 'color')).toBe('var(--ddm-text-muted)');
  });

  it('declara as cores esperadas nos componentes corrigidos desta rodada', () => {
    const expected: ReadonlyArray<readonly [string, string, string]> = [
      // Cabeçalho, título e controles à direita.
      ['#docs-chrome', 'background-color', 'var(--ddm-surface)'],
      ['#docs-chrome', 'color', 'var(--ddm-text)'],
      ['#docs-titlebar', 'background-color', 'var(--ddm-surface)'],
      ['#docs-titlebar', 'color', 'var(--ddm-text)'],
      ['.docs-titlebar-buttons', 'background-color', 'var(--ddm-surface)'],
      ['.docs-titlebar-buttons', 'color', 'var(--ddm-text)'],
      ['#docs-title-widget', 'color', 'var(--ddm-text)'],
      ['#docs-title-input-wrapper', 'background-color', 'transparent'],
      ['#docs-title-input-wrapper', 'border-color', 'transparent'],
      ['.docs-title-input', 'background-color', 'transparent'],
      ['.docs-title-input', 'border-color', 'transparent'],
      ['.docs-title-input', 'color', 'transparent'],
      ['.docs-title-input', '-webkit-text-fill-color', 'transparent'],
      ['#docs-title-input-label-inner', 'color', 'var(--ddm-text)'],
      ['.docs-title-input-label', 'color', 'var(--ddm-text)'],
      // Menu principal.
      ['#docs-menubar', 'background-color', 'var(--ddm-surface)'],
      ['#docs-file-menu', 'color', 'var(--ddm-text)'],
      ['#docs-edit-menu', 'color', 'var(--ddm-text)'],
      ['#docs-view-menu', 'color', 'var(--ddm-text)'],
      ['#docs-insert-menu', 'color', 'var(--ddm-text)'],
      ['#docs-format-menu', 'color', 'var(--ddm-text)'],
      ['#docs-tools-menu', 'color', 'var(--ddm-text)'],
      ['#docs-zotero-menubutton', 'color', 'var(--ddm-text)'],
      ['#docs-help-menu', 'color', 'var(--ddm-text)'],
      ['#docs-menubar .menu-button', 'color', 'var(--ddm-text)'],
      // Barra de ferramentas.
      ['#docs-toolbar-wrapper', 'background-color', 'var(--ddm-surface)'],
      ['#docs-toolbar-wrapper', 'color', 'var(--ddm-text)'],
      ['#spellGrammarCheckButton', 'background-color', 'transparent'],
      ['#formatPainterButton', 'background-color', 'transparent'],
      ['#fontSizeDecrement', 'background-color', 'transparent'],
      ['#fontSizeIncrement', 'background-color', 'transparent'],
      ['#moreButton', 'background-color', 'transparent'],
      ['#viewModeButton', 'background-color', 'transparent'],
      ['#docs-toolbar-mode-switcher', 'background-color', 'transparent'],
      ['#docs-side-toolbar #docs-toolbar-mode-switcher', 'background-color', 'var(--ddm-surface-raised)'],
      ['.goog-toolbar-button', 'background-color', 'transparent'],
      ['.goog-toolbar-toggle-button', 'background-color', 'transparent'],
      ['.docs-font-size-inc-dec-action-button', 'background-color', 'transparent'],
      ['#zoomSelect', 'background-color', 'var(--ddm-surface-raised)'],
      ['#headingStyleSelect', 'background-color', 'var(--ddm-surface-raised)'],
      ['#fontSizeSelect', 'background-color', 'var(--ddm-surface-raised)'],
      ['#docs-font-family', 'background-color', 'var(--ddm-surface-raised)'],
      ['.goog-toolbar-combo-button-input', 'background-color', 'var(--ddm-surface-raised)'],
      ['.goog-toolbar-combo-button-input', 'color', 'var(--ddm-text)'],
      ['.docs-omnibox-input', 'background-color', 'var(--ddm-surface-raised)'],
      ['.docs-omnibox-input', 'color', 'var(--ddm-text)'],
      ['#docs-omnibox-toolbar .docs-omnibox-input', 'background-color', 'var(--ddm-surface-raised)'],
      ['#docs-omnibox-toolbar .docs-omnibox-input', 'color', 'var(--ddm-text)'],
      // Régua e área de trabalho.
      ['#kix-horizontal-ruler', 'background-color', 'var(--ddm-surface-raised)'],
      ['#kix-vertical-ruler', 'background-color', 'var(--ddm-surface-raised)'],
      ['.docs-ruler-background-inner', 'background-color', 'var(--ddm-surface-raised)'],
      ['#docs-editor-container', 'background-color', 'var(--ddm-bg)'],
      ['#docs-editor', 'background-color', 'var(--ddm-bg)'],
    ];

    for (const [selector, property, value] of expected) {
      const values = rulesFor(`${SCOPE} ${selector}`)
        .flatMap((rule) => declarationsOf(rule.body))
        .filter((declaration) => declaration.property === property)
        .map((declaration) => declaration.value);
      expect(values, `declaração ausente: ${selector} { ${property} }`).toContain(value);
    }
  });

  it('mantém o input do título transparente no estado normal', () => {
    // Diagnóstico real: o input e o rótulo estavam sobrepostos e ambos com
    // texto claro. No estado normal quem desenha o título é o rótulo — o
    // input não pode pintar texto.
    const declarations = rulesFor(`${SCOPE} .docs-title-input`).flatMap((rule) =>
      declarationsOf(rule.body),
    );

    expect(
      declarations.find((item) => item.property === 'color')?.value,
      'o input do título precisa de cor transparente no estado normal',
    ).toBe('transparent');
    expect(
      declarations.find((item) => item.property === '-webkit-text-fill-color')?.value,
      'o input do título precisa de -webkit-text-fill-color transparente',
    ).toBe('transparent');
    expect(
      declarations.find((item) => item.property === 'background-color')?.value,
      'o input do título não pode ter fundo de campo',
    ).toBe('transparent');
    expect(
      declarations.find((item) => item.property === 'border-color')?.value,
      'o input do título não pode ter borda de campo',
    ).toBe('transparent');

    // O wrapper do campo também não ganha moldura no estado normal.
    const wrapper = rulesFor(`${SCOPE} #docs-title-input-wrapper`).flatMap((rule) =>
      declarationsOf(rule.body),
    );
    expect(wrapper.find((item) => item.property === 'background-color')?.value).toBe('transparent');
    expect(wrapper.find((item) => item.property === 'border-color')?.value).toBe('transparent');
    expect(
      wrapper.find((item) => item.property === 'color'),
      'o wrapper do título não deve declarar cor no estado normal',
    ).toBeUndefined();
  });

  it('devolve o campo de edição do título durante a renomeação', () => {
    // `#docs-title-widget:focus-within` é o gatilho confirmado pelo
    // diagnóstico; o `:focus` do próprio campo é a rede de segurança.
    for (const selector of [
      '#docs-title-widget:focus-within .docs-title-input',
      '#docs-title-widget:focus-within input.docs-title-input',
      '#docs-title-widget:focus-within .docs-title-input input',
      '.docs-title-input:focus',
    ]) {
      const rule = ruleFor(`${SCOPE} ${selector}`);
      expect(rule, `regra de edição ausente: ${selector}`).toBeDefined();
      const declarations = declarationsOf(rule?.body ?? '');
      expect(
        declarations.find((item) => item.property === 'color')?.value,
        `cor do campo ausente: ${selector}`,
      ).toBe('var(--ddm-text)');
      expect(
        declarations.find((item) => item.property === '-webkit-text-fill-color')?.value,
        `preenchimento do campo ausente: ${selector}`,
      ).toBe('currentColor');
      expect(
        declarations.find((item) => item.property === 'background-color')?.value,
        `fundo do campo ausente: ${selector}`,
      ).toBe('var(--ddm-surface-raised)');
      expect(
        declarations.find((item) => item.property === 'border-color')?.value,
        `borda do campo ausente: ${selector}`,
      ).toBe('var(--ddm-border)');
    }

    // O wrapper do campo recebe a superfície de edição junto com ele.
    const wrapper = ruleFor(`${SCOPE} #docs-title-widget:focus-within #docs-title-input-wrapper`);
    expect(wrapper, 'regra de edição do wrapper ausente').toBeDefined();
    const wrapperDeclarations = declarationsOf(wrapper?.body ?? '');
    expect(wrapperDeclarations.find((item) => item.property === 'background-color')?.value).toBe(
      'var(--ddm-surface-raised)',
    );
    expect(wrapperDeclarations.find((item) => item.property === 'border-color')?.value).toBe(
      'var(--ddm-border)',
    );

    const focus = ruleFor(`${SCOPE} .docs-title-input:focus-visible`);
    expect(focus, 'foco visível do campo de título ausente').toBeDefined();
    expect(declarationValue(focus?.body ?? '', 'outline')).toBe('2px solid var(--ddm-focus)');

    // O elemento em foco precisa mostrar o texto: é ele que o editor mantém
    // transparente no estado normal.
    const legivel = ruleFor(`${SCOPE} .docs-title-input :focus`);
    expect(legivel, 'cor do campo em foco ausente').toBeDefined();
    expect(declarationValue(legivel?.body ?? '', 'color')).toBe('var(--ddm-text)');
    expect(declarationValue(legivel?.body ?? '', '-webkit-text-fill-color')).toBe('currentColor');
  });

  it('esconde o rótulo sobreposto do título enquanto o campo está em foco', () => {
    // Durante a renomeação o rótulo continua no mesmo lugar (sobreposto ao
    // input): ele precisa deixar de ser pintado, sem sair do layout.
    for (const selector of [
      '#docs-title-widget:focus-within .docs-title-input-label',
      '#docs-title-widget:focus-within #docs-title-input-label-inner',
    ]) {
      const rule = ruleFor(`${SCOPE} ${selector}`);
      expect(rule, `regra ausente: ${selector}`).toBeDefined();
      const declarations = declarationsOf(rule?.body ?? '');
      expect(
        declarations.find((item) => item.property === 'color')?.value,
        `cor do rótulo durante a edição: ${selector}`,
      ).toBe('transparent');
      expect(
        declarations.find((item) => item.property === '-webkit-text-fill-color')?.value,
        `preenchimento do rótulo durante a edição: ${selector}`,
      ).toBe('transparent');
      expect(
        declarations.find((item) => item.property === 'visibility')?.value,
        `rótulo ainda pintado durante a edição: ${selector}`,
      ).toBe('hidden');
    }

    // Fora da edição, o rótulo continua visível e com texto claro.
    const label = ruleFor(`${SCOPE} .docs-title-input-label`);
    expect(label, 'regra ausente para o rótulo do título').toBeDefined();
    expect(declarationValue(label?.body ?? '', 'color')).toBe('var(--ddm-text)');
    expect(declarationValue(label?.body ?? '', 'visibility')).toBeUndefined();
  });

  it('escurece a camada interna dos controles da barra de ferramentas', () => {
    // O branco atrás dos ícones era pintado por uma camada interna do
    // botão, não pelo elemento externo que tem o id.
    for (const selector of [
      '.goog-toolbar-button > div',
      '.goog-toolbar-button > span',
      '.goog-toolbar-toggle-button > div',
      '.goog-toolbar-toggle-button > span',
      '.docs-font-size-inc-dec-action-button > div',
      '.docs-font-size-inc-dec-action-button > span',
    ]) {
      const rule = ruleFor(`${SCOPE} ${selector}`);
      expect(rule, `regra ausente para ${selector}`).toBeDefined();
      const declarations = declarationsOf(rule?.body ?? '');
      expect(
        declarations.find((item) => item.property === 'background-color')?.value,
        `fundo interno ausente: ${selector}`,
      ).toBe('transparent');
      expect(
        declarations.find((item) => item.property === 'color')?.value,
        `cor interna ausente: ${selector}`,
      ).toBe('var(--ddm-text)');
    }
  });

  it('escurece o contêiner dos controles à direita sem tocar nos botões', () => {
    // Diagnóstico real: a âncora `#docs-titlebar` não venceu a cascata; a
    // âncora real é `#docs-chrome`.
    const rule = ruleFor(`${SCOPE} #docs-chrome .docs-titlebar-buttons`);
    expect(rule, 'regra ausente para a área direita do cabeçalho').toBeDefined();
    expect(declarationValue(rule?.body ?? '', 'background-color')).toBe('var(--ddm-surface)');
    expect(declarationValue(rule?.body ?? '', 'color')).toBe('var(--ddm-text)');

    // Nenhuma regra alcança os botões dentro desse contêiner: o botão de
    // compartilhamento e o avatar mantêm as próprias cores.
    for (const item of rules) {
      for (const alternative of alternativesOf(item.selector)) {
        if (!alternative.includes('.docs-titlebar-buttons')) {
          continue;
        }
        expect(
          alternative.endsWith('.docs-titlebar-buttons'),
          `regra genérica sobre os botões do cabeçalho: ${alternative}`,
        ).toBe(true);
      }
    }
  });

  it('escurece o campo de busca real, ancorado no ancestral confirmado', () => {
    // Diagnóstico real: `input.docs-omnibox-input` dentro de
    // `#docs-omnibox-toolbar` com fundo rgb(240, 244, 249) e texto
    // rgb(31, 31, 31). A âncora no ancestral resolve sem `!important`.
    const rule = ruleFor(`${SCOPE} #docs-omnibox-toolbar .docs-omnibox-input`);
    expect(rule, 'regra ausente para o campo de busca').toBeDefined();
    expect(declarationValue(rule?.body ?? '', 'background-color')).toBe('var(--ddm-surface-raised)');
    expect(declarationValue(rule?.body ?? '', 'color')).toBe('var(--ddm-text)');
    expect(declarationValue(rule?.body ?? '', 'border-color')).toBe('var(--ddm-border)');

    // O foco visível do campo de busca continua declarado.
    const focus = ruleFor(`${SCOPE} .docs-omnibox-input:focus-visible`);
    expect(focus, 'foco visível do campo de busca ausente').toBeDefined();
    expect(declarationValue(focus?.body ?? '', 'outline')).toBe('2px solid var(--ddm-focus)');
  });

  it('escurece o seletor de modo de edição sem perder o hover', () => {
    // Diagnóstico real: `#docs-toolbar-mode-switcher` dentro de
    // `#docs-side-toolbar` com fundo rgb(240, 244, 249). A âncora no
    // ancestral resolve; o hover precisa da mesma âncora para continuar
    //winning contra a regra base.
    const rule = ruleFor(`${SCOPE} #docs-side-toolbar #docs-toolbar-mode-switcher`);
    expect(rule, 'regra ausente para o seletor de modo de edição').toBeDefined();
    expect(declarationValue(rule?.body ?? '', 'background-color')).toBe('var(--ddm-surface-raised)');
    expect(declarationValue(rule?.body ?? '', 'color')).toBe('var(--ddm-text)');

    const hover = ruleFor(`${SCOPE} #docs-side-toolbar #docs-toolbar-mode-switcher:hover`);
    expect(hover, 'hover do seletor de modo de edição ausente').toBeDefined();
    expect(declarationValue(hover?.body ?? '', 'background-color')).toBe('var(--ddm-hover)');

    // O foco visível continua pela regra geral de `:focus-visible`.
    const focus = ruleFor(`${SCOPE} #docs-toolbar-mode-switcher:focus-visible`);
    expect(focus, 'foco visível do seletor de modo de edição ausente').toBeDefined();
    expect(declarationValue(focus?.body ?? '', 'outline')).toBe('2px solid var(--ddm-focus)');
  });

  it('não usa o seletor inexistente de botões do cabeçalho', () => {
    // O diagnóstico mostrou que `#docs-titlebar-buttons` não existe no DOM
    // atual; o contêiner real é `.docs-titlebar-buttons`.
    expect(strippedCss).not.toContain('#docs-titlebar-buttons');
  });

  it('garante contraste suficiente entre o texto do tema e a superfície', () => {
    const surface = tokenValue('--ddm-surface');
    const text = tokenValue('--ddm-text');
    const muted = tokenValue('--ddm-text-muted');

    expect(contrastRatio(text, surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(muted, surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('não deixa o fundo do tema escapar para html ou body', () => {
    for (const rule of rules) {
      for (const alternative of alternativesOf(rule.selector)) {
        expect(alternative).not.toBe(`${SCOPE} body`);
      }
    }

    const tokenRule = rules.find((rule) => rule.selector === SCOPE);
    expect(declarationValue(tokenRule?.body ?? '', 'background-color')).toBeUndefined();
  });

  it('não estende as barras de rolagem do tema à página do documento', () => {
    const scrollbarRules = rules.filter((rule) => rule.selector.includes('::-webkit-scrollbar'));
    expect(scrollbarRules.length).toBeGreaterThan(0);

    for (const rule of scrollbarRules) {
      for (const alternative of alternativesOf(rule.selector)) {
        expect(alternative).not.toBe(`${SCOPE} ::-webkit-scrollbar`);
      }
    }
  });
});
