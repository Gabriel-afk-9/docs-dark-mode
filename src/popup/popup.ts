import { getBrowserMessageSender } from '../platform/messaging';
import { getBrowserStorageArea } from '../platform/storage';
import { getBrowserTabsApi } from '../platform/tabs';
import { createPopupController } from './popup-controller';
import { createPopupView } from './popup-view';

/**
 * Ponto de entrada do popup.
 *
 * Este arquivo apenas faz a composição: cria a view, cria o controller com
 * as APIs reais do navegador e inicia a leitura do estado. Nenhuma regra de
 * negócio vive aqui.
 */
const view = createPopupView(document);

const controller = createPopupController(
  {
    storage: getBrowserStorageArea(),
    tabs: getBrowserTabsApi(),
    messaging: getBrowserMessageSender(),
  },
  view,
);

void controller.init();
