import { describe, expect, it, vi } from 'vitest';
import { MESSAGE_SOURCE, STORAGE_KEY } from '../../src/shared/constants';
import { createPopupController } from '../../src/popup/popup-controller';
import { STRINGS } from '../../src/shared/strings';
import type { ContentResponse } from '../../src/shared/messages';
import {
  createFakeMessaging,
  createFakeStorage,
  createFakeTabs,
  createFakeView,
  createUnreachableMessaging,
} from '../fixtures/fakes';

const DOCS_URL = 'https://docs.google.com/document/d/abc/edit';

function okStatus(applied: boolean): ContentResponse {
  return {
    source: MESSAGE_SOURCE,
    ok: true,
    status: { enabled: applied, applied, documentTheme: 'off' },
  };
}

describe('popup controller — inicialização', () => {
  it('mostra o estado inativo quando a preferência salva está desligada', async () => {
    const storage = createFakeStorage();
    const view = createFakeView();
    const controller = createPopupController(
      {
        storage: storage.area,
        tabs: createFakeTabs({ url: DOCS_URL }),
        messaging: createFakeMessaging(() => okStatus(false)),
      },
      view.view,
    );

    await controller.init();

    const state = view.last();
    expect(state?.kind).toBe('ready');
    expect(state?.enabled).toBe(false);
    expect(state?.message).toBe(STRINGS.statusInactive);
  });

  it('mostra a preferência ativada e a mensagem honesta quando a página confirma', async () => {
    const storage = createFakeStorage({ [STORAGE_KEY]: { enabled: true } });
    const view = createFakeView();
    const controller = createPopupController(
      {
        storage: storage.area,
        tabs: createFakeTabs({ url: DOCS_URL }),
        messaging: createFakeMessaging(() => okStatus(true)),
      },
      view.view,
    );

    await controller.init();

    const state = view.last();
    expect(state?.kind).toBe('ready');
    expect(state?.enabled).toBe(true);
    expect(state?.message).toBe(STRINGS.statusActiveInterface);
    expect(state?.message).not.toContain('Modo escuro ativo');
  });

  it('trata falha de leitura do storage como erro, sem afirmar estado', async () => {
    const storage = createFakeStorage();
    storage.failReads = true;
    const view = createFakeView();
    const controller = createPopupController(
      {
        storage: storage.area,
        tabs: createFakeTabs({ url: DOCS_URL }),
        messaging: createFakeMessaging(() => okStatus(false)),
      },
      view.view,
    );

    await controller.init();

    const state = view.last();
    expect(state?.kind).toBe('error');
    expect(state?.message).toBe(STRINGS.statusStorageError);
    expect(state?.interactive).toBe(false);
  });

  it('trata falha na consulta da aba como erro', async () => {
    const storage = createFakeStorage();
    const view = createFakeView();
    const controller = createPopupController(
      {
        storage: storage.area,
        tabs: createFakeTabs({ fail: true }),
        messaging: createFakeMessaging(() => okStatus(false)),
      },
      view.view,
    );

    await controller.init();

    const state = view.last();
    expect(state?.kind).toBe('error');
    expect(state?.message).toBe(STRINGS.errorTabQuery);
  });

  it('trata página não compatível sem tentar comunicar', async () => {
    const storage = createFakeStorage();
    const view = createFakeView();
    const messaging = createFakeMessaging(() => okStatus(false));
    const controller = createPopupController(
      {
        storage: storage.area,
        tabs: createFakeTabs({ url: 'https://docs.google.com/document/u/0/' }),
        messaging,
      },
      view.view,
    );

    await controller.init();

    const state = view.last();
    expect(state?.kind).toBe('unsupported');
    expect(state?.message).toBe(STRINGS.statusUnsupported);
    expect(state?.interactive).toBe(false);
  });

  it('trata falha de comunicação com a aba como erro de comunicação', async () => {
    const storage = createFakeStorage();
    const view = createFakeView();
    const controller = createPopupController(
      {
        storage: storage.area,
        tabs: createFakeTabs({ url: DOCS_URL }),
        messaging: createUnreachableMessaging(),
      },
      view.view,
    );

    await controller.init();

    const state = view.last();
    expect(state?.kind).toBe('error');
    expect(state?.message).toBe(STRINGS.statusCommError);
  });

  it('trata resposta inválida como erro de comunicação', async () => {
    const storage = createFakeStorage();
    const view = createFakeView();
    const controller = createPopupController(
      {
        storage: storage.area,
        tabs: createFakeTabs({ url: DOCS_URL }),
        messaging: createFakeMessaging(() => ({ ok: 'talvez' })),
      },
      view.view,
    );

    await controller.init();

    const state = view.last();
    expect(state?.kind).toBe('error');
    expect(state?.message).toBe(STRINGS.errorInvalidMessage);
  });

  it('converge quando a página diverge da preferência salva', async () => {
    const storage = createFakeStorage({ [STORAGE_KEY]: { enabled: true } });
    const view = createFakeView();
    const sent: string[] = [];
    const controller = createPopupController(
      {
        storage: storage.area,
        tabs: createFakeTabs({ url: DOCS_URL }),
        messaging: createFakeMessaging((_tabId, message) => {
          sent.push(message.kind);
          return message.kind === 'ddm:set-enabled'
            ? okStatus(true)
            : okStatus(false);
        }),
      },
      view.view,
    );

    await controller.init();

    expect(sent).toEqual(['ddm:get-status', 'ddm:set-enabled']);
    const state = view.last();
    expect(state?.kind).toBe('ready');
    expect(state?.enabled).toBe(true);
  });
});

describe('popup controller — alternância', () => {
  it('persiste a preferência e confirma a aplicação', async () => {
    const storage = createFakeStorage();
    const view = createFakeView();
    const controller = createPopupController(
      {
        storage: storage.area,
        tabs: createFakeTabs({ url: DOCS_URL }),
        messaging: createFakeMessaging((_tabId, message) =>
          message.kind === 'ddm:set-enabled' ? okStatus(true) : okStatus(false),
        ),
      },
      view.view,
    );

    await controller.init();
    view.toggle(true);
    await vi.waitFor(() => {
      expect(view.last()?.kind).toBe('ready');
    });

    expect(storage.storedPreference()).toEqual({ enabled: true });
    const state = view.last();
    expect(state?.enabled).toBe(true);
    expect(state?.message).toBe(STRINGS.statusActiveInterface);
  });

  it('reverte o interruptor e não afirma aplicação quando a gravação falha', async () => {
    const storage = createFakeStorage();
    const view = createFakeView();
    const controller = createPopupController(
      {
        storage: storage.area,
        tabs: createFakeTabs({ url: DOCS_URL }),
        messaging: createFakeMessaging(() => okStatus(false)),
      },
      view.view,
    );

    await controller.init();
    storage.failWrites = true;
    view.toggle(true);
    await vi.waitFor(() => {
      expect(view.last()?.kind).toBe('error');
    });

    const state = view.last();
    expect(state?.enabled).toBe(false);
    expect(state?.message).toBe(STRINGS.statusStorageError);
    expect(storage.storedPreference()).toBeNull();
  });

  it('informa aplicação pendente quando a comunicação falha depois de salvar', async () => {
    const storage = createFakeStorage();
    const view = createFakeView();
    let fail = false;
    const controller = createPopupController(
      {
        storage: storage.area,
        tabs: createFakeTabs({ url: DOCS_URL }),
        messaging: createFakeMessaging(() => {
          if (fail) {
            throw new Error('Could not establish connection.');
          }
          return okStatus(false);
        }),
      },
      view.view,
    );

    await controller.init();
    fail = true;
    view.toggle(true);
    await vi.waitFor(() => {
      expect(view.last()?.kind).toBe('pending');
    });

    const state = view.last();
    expect(state?.enabled).toBe(true);
    expect(state?.message).toBe(STRINGS.statusPending);
    expect(state?.message).not.toContain('aplicado com sucesso');
    // A preferência foi realmente salva.
    expect(storage.storedPreference()).toEqual({ enabled: true });
  });

  it('informa aplicação pendente quando a página não confirma a aplicação', async () => {
    const storage = createFakeStorage();
    const view = createFakeView();
    const controller = createPopupController(
      {
        storage: storage.area,
        tabs: createFakeTabs({ url: DOCS_URL }),
        messaging: createFakeMessaging((_tabId, message) =>
          message.kind === 'ddm:set-enabled' ? okStatus(false) : okStatus(false),
        ),
      },
      view.view,
    );

    await controller.init();
    view.toggle(true);
    await vi.waitFor(() => {
      expect(view.last()?.kind).toBe('pending');
    });

    expect(view.last()?.message).toBe(STRINGS.statusPending);
    expect(storage.storedPreference()).toEqual({ enabled: true });
  });

  it('desativa o tema e persiste a preferência desligada', async () => {
    const storage = createFakeStorage({ [STORAGE_KEY]: { enabled: true } });
    const view = createFakeView();
    const controller = createPopupController(
      {
        storage: storage.area,
        tabs: createFakeTabs({ url: DOCS_URL }),
        messaging: createFakeMessaging((_tabId, message) =>
          message.kind === 'ddm:set-enabled' ? okStatus(false) : okStatus(true),
        ),
      },
      view.view,
    );

    await controller.init();
    view.toggle(false);
    await vi.waitFor(() => {
      expect(view.last()?.kind).toBe('ready');
    });

    expect(storage.storedPreference()).toEqual({ enabled: false });
    expect(view.last()?.enabled).toBe(false);
    expect(view.last()?.message).toBe(STRINGS.statusInactive);
  });

  it('ignora alternâncias feitas antes da inicialização terminar', async () => {
    const storage = createFakeStorage();
    const view = createFakeView();
    const controller = createPopupController(
      {
        storage: storage.area,
        tabs: createFakeTabs({ url: DOCS_URL }),
        messaging: createFakeMessaging(() => okStatus(false)),
      },
      view.view,
    );

    view.toggle(true);
    await controller.init();

    expect(storage.storedPreference()).toBeNull();
  });
});
