import {
  getBrowserMessageReceiver,
} from '../platform/messaging';
import {
  getBrowserStorageArea,
  getBrowserStorageChangeApi,
} from '../platform/storage';
import { startContentScript } from './content-entry';

/**
 * Bootstrap do content script.
 *
 * Fica separado de `content-entry.ts` para que o módulo de inicialização
 * continue testável sem executar efeitos colaterais ao ser importado.
 */

const handle = startContentScript({
  target: document.documentElement,
  href: window.location.href,
  storage: getBrowserStorageArea(),
  changes: getBrowserStorageChangeApi(),
  receiver: getBrowserMessageReceiver(),
  senderId: globalThis.chrome?.runtime?.id,
});

window.addEventListener(
  'pagehide',
  () => {
    handle.dispose();
  },
  { once: true },
);
