import { describe, expect, it } from 'vitest';
import { THEME_ATTRIBUTE, THEME_ATTRIBUTE_VALUE } from '../../src/shared/constants';
import {
  applyTheme,
  isThemeApplied,
  removeTheme,
  type ThemeTarget,
} from '../../src/content/theme-applier';

function createTarget(initial?: string): ThemeTarget & { calls: string[] } {
  const attributes = new Map<string, string>();
  if (initial !== undefined) {
    attributes.set(THEME_ATTRIBUTE, initial);
  }
  const calls: string[] = [];
  return {
    calls,
    getAttribute(name: string): string | null {
      return attributes.get(name) ?? null;
    },
    setAttribute(name: string, value: string): void {
      calls.push(`set:${name}=${value}`);
      attributes.set(name, value);
    },
    removeAttribute(name: string): void {
      calls.push(`remove:${name}`);
      attributes.delete(name);
    },
  };
}

describe('applyTheme', () => {
  it('aplica o atributo de tema com o valor esperado', () => {
    const target = createTarget();
    applyTheme(target);
    expect(target.getAttribute(THEME_ATTRIBUTE)).toBe(THEME_ATTRIBUTE_VALUE);
    expect(target.calls).toEqual([`set:${THEME_ATTRIBUTE}=${THEME_ATTRIBUTE_VALUE}`]);
  });

  it('é idempotente: reaplicar não duplica a alteração no DOM', () => {
    const target = createTarget();
    applyTheme(target);
    applyTheme(target);
    applyTheme(target);
    expect(target.calls).toHaveLength(1);
    expect(isThemeApplied(target)).toBe(true);
  });
});

describe('removeTheme', () => {
  it('remove o atributo quando ele existe', () => {
    const target = createTarget(THEME_ATTRIBUTE_VALUE);
    removeTheme(target);
    expect(target.getAttribute(THEME_ATTRIBUTE)).toBeNull();
    expect(isThemeApplied(target)).toBe(false);
  });

  it('é idempotente: remover sem atributo não altera o DOM', () => {
    const target = createTarget();
    removeTheme(target);
    expect(target.calls).toEqual([]);
  });
});

describe('isThemeApplied', () => {
  it('só considera aplicado quando o valor é o esperado', () => {
    const target = createTarget('claro');
    expect(isThemeApplied(target)).toBe(false);
  });
});
