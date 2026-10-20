/**
 * Globais de compilação.
 *
 * `__DDM_DEBUG__` é substituído por `define` no esbuild (produção: `false`,
 * desenvolvimento: `true`) e pelo Vitest (`false`). É a única forma de
 * habilitar o diagnóstico described em RF-10.
 */
declare const __DDM_DEBUG__: boolean | undefined;
