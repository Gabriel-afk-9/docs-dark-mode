// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { STRINGS } from '../../src/shared/strings';
import { createPopupView } from '../../src/popup/popup-view';

const htmlPath = resolve(process.cwd(), 'src/popup/popup.html');

function loadPopupDocument(): Document {
  const html = readFileSync(htmlPath, 'utf8');
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('createPopupView', () => {
  let doc: Document;

  beforeEach(() => {
    doc = loadPopupDocument();
  });

  it('usa o HTML real do popup (ids esperados presentes)', () => {
    expect(doc.querySelector('#ddm-enabled')).not.toBeNull();
    expect(doc.querySelector('#ddm-status')).not.toBeNull();
    expect(doc.querySelector('#ddm-status')?.getAttribute('role')).toBe('status');
    expect(doc.querySelector('#ddm-enabled')?.getAttribute('role')).toBe('switch');
  });

  it('renderiza o estado de carregando com o interruptor desabilitado', () => {
    const view = createPopupView(doc.body);
    view.render({
      kind: 'loading',
      enabled: false,
      interactive: false,
      message: STRINGS.statusLoading,
      tone: 'info',
    });

    const input = doc.querySelector<HTMLInputElement>('#ddm-enabled');
    const status = doc.querySelector('#ddm-status');
    expect(input?.checked).toBe(false);
    expect(input?.disabled).toBe(true);
    expect(status?.textContent).toBe(STRINGS.statusLoading);
  });

  it('renderiza a preferência ativada com a mensagem honesta da fase', () => {
    const view = createPopupView(doc.body);
    view.render({
      kind: 'ready',
      enabled: true,
      interactive: true,
      message: STRINGS.statusActiveInterface,
      tone: 'info',
    });

    const input = doc.querySelector<HTMLInputElement>('#ddm-enabled');
    const status = doc.querySelector('#ddm-status');
    expect(input?.checked).toBe(true);
    expect(input?.disabled).toBe(false);
    expect(status?.textContent).toBe(STRINGS.statusActiveInterface);
    expect(status?.textContent).toBe(
      'Interface com tema escuro ativo; a página do documento ainda não é alterada.',
    );
    expect(status?.textContent).not.toContain('Modo escuro ativo');
    expect(status?.textContent).not.toContain('documento escuro');
  });

  it('renderiza o estado inativo', () => {
    const view = createPopupView(doc.body);
    view.render({
      kind: 'ready',
      enabled: false,
      interactive: true,
      message: STRINGS.statusInactive,
      tone: 'info',
    });

    const input = doc.querySelector<HTMLInputElement>('#ddm-enabled');
    expect(input?.checked).toBe(false);
    expect(input?.disabled).toBe(false);
    expect(doc.querySelector('#ddm-status')?.textContent).toBe(STRINGS.statusInactive);
  });

  it('renderiza o estado pendente mantendo o valor da preferência', () => {
    const view = createPopupView(doc.body);
    view.render({
      kind: 'pending',
      enabled: true,
      interactive: true,
      message: STRINGS.statusPending,
      tone: 'warning',
    });

    const input = doc.querySelector<HTMLInputElement>('#ddm-enabled');
    const status = doc.querySelector<HTMLElement>('#ddm-status');
    expect(input?.checked).toBe(true);
    expect(status?.textContent).toBe(STRINGS.statusPending);
    expect(status?.dataset['ddmTone']).toBe('warning');
  });

  it('renderiza o estado de página não compatível com o interruptor desabilitado', () => {
    const view = createPopupView(doc.body);
    view.render({
      kind: 'unsupported',
      enabled: false,
      interactive: false,
      message: STRINGS.statusUnsupported,
      tone: 'info',
    });

    const input = doc.querySelector<HTMLInputElement>('#ddm-enabled');
    expect(input?.disabled).toBe(true);
    expect(doc.querySelector('#ddm-status')?.textContent).toBe(STRINGS.statusUnsupported);
  });

  it('renderiza o estado de erro com tom de erro', () => {
    const view = createPopupView(doc.body);
    view.render({
      kind: 'error',
      enabled: false,
      interactive: true,
      message: STRINGS.statusCommError,
      tone: 'error',
    });

    const status = doc.querySelector<HTMLElement>('#ddm-status');
    expect(status?.dataset['ddmTone']).toBe('error');
    expect(status?.textContent).toBe(STRINGS.statusCommError);
  });

  it('avisa a alteração feita pelo usuário no interruptor', () => {
    const view = createPopupView(doc.body);
    const seen: boolean[] = [];
    view.onToggle((enabled) => seen.push(enabled));

    const input = doc.querySelector<HTMLInputElement>('#ddm-enabled');
    if (input === null) {
      throw new Error('elemento ausente');
    }
    input.disabled = false;
    input.checked = true;
    input.dispatchEvent(new Event('change'));

    expect(seen).toEqual([true]);
  });

  it('não quebra quando os elementos esperados não existem', () => {
    const empty = document.implementation.createHTMLDocument('vazio');
    const view = createPopupView(empty.body);
    expect(() => {
      view.render({
        kind: 'ready',
        enabled: true,
        interactive: true,
        message: STRINGS.statusActiveInterface,
        tone: 'info',
      });
      view.onToggle(() => undefined);
    }).not.toThrow();
  });
});
