import { describe, expect, it } from 'vitest';
import { THEME_ATTRIBUTE, THEME_ATTRIBUTE_VALUE } from '../../src/shared/constants';
import { createThemeController } from '../../src/content/theme-controller';
import type { ThemeTarget } from '../../src/content/theme-applier';

function createTarget(): ThemeTarget {
  const attributes = new Map<string, string>();
  return {
    getAttribute: (name) => attributes.get(name) ?? null,
    setAttribute: (name, value) => {
      attributes.set(name, value);
    },
    removeAttribute: (name) => {
      attributes.delete(name);
    },
  };
}

function createFailingTarget(): ThemeTarget {
  return {
    getAttribute: () => {
      throw new Error('falha simulada');
    },
    setAttribute: () => {
      throw new Error('falha simulada');
    },
    removeAttribute: () => {
      throw new Error('falha simulada');
    },
  };
}

describe('createThemeController', () => {
  it('inicia desativado quando não há atributo aplicado', () => {
    const controller = createThemeController(createTarget());
    const status = controller.getStatus();
    expect(status.ok).toBe(true);
    if (!status.ok) {
      throw new Error('resultado inesperado');
    }
    expect(status.value).toEqual({ enabled: false, applied: false, documentTheme: 'off' });
  });

  it('aplica o tema ao ativar e reporta o estado aplicado', () => {
    const target = createTarget();
    const controller = createThemeController(target);
    const result = controller.setEnabled(true);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('resultado inesperado');
    }
    expect(target.getAttribute(THEME_ATTRIBUTE)).toBe(THEME_ATTRIBUTE_VALUE);
    expect(result.value).toEqual({ enabled: true, applied: true, documentTheme: 'off' });
  });

  it('remove o tema ao desativar', () => {
    const target = createTarget();
    const controller = createThemeController(target);
    controller.setEnabled(true);
    const result = controller.setEnabled(false);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('resultado inesperado');
    }
    expect(target.getAttribute(THEME_ATTRIBUTE)).toBeNull();
    expect(result.value).toEqual({ enabled: false, applied: false, documentTheme: 'off' });
  });

  it('é idempotente: ativa e desativa repetidamente sem divergir', () => {
    const target = createTarget();
    const controller = createThemeController(target);
    controller.setEnabled(true);
    controller.setEnabled(true);
    expect(controller.getStatus().ok).toBe(true);
    const off = controller.setEnabled(false);
    controller.setEnabled(false);
    expect(off.ok).toBe(true);
    if (!off.ok) {
      throw new Error('resultado inesperado');
    }
    expect(off.value.applied).toBe(false);
  });

  it('reporta o tema do documento como off (Fase 4 ainda não implementada)', () => {
    const controller = createThemeController(createTarget());
    const status = controller.getStatus();
    if (!status.ok) {
      throw new Error('resultado inesperado');
    }
    expect(status.value.documentTheme).toBe('off');
  });

  it('converte falha do DOM em erro tipado, sem exceção', () => {
    const controller = createThemeController(createFailingTarget());
    const result = controller.setEnabled(true);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('resultado inesperado');
    }
    expect(result.error.code).toBe('APPLY_FAILED');
  });
});
