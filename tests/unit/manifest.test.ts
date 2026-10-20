import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Invariantes do manifesto da extensão.
 *
 * O objetivo é garantir que a Fase 3 não ampliou o escopo: as permissões
 * continuam mínimas, não existe service worker e o tema da interface
 * entra como CSS declarado no mesmo content script já existente.
 */

type ContentScript = {
  readonly matches?: readonly string[];
  readonly js?: readonly string[];
  readonly css?: readonly string[];
  readonly run_at?: string;
  readonly all_frames?: boolean;
};

type Manifest = {
  readonly manifest_version?: number;
  readonly permissions?: readonly string[];
  readonly host_permissions?: readonly string[];
  readonly background?: unknown;
  readonly content_scripts?: readonly ContentScript[];
  readonly web_accessible_resources?: unknown;
};

const manifestPath = resolve(process.cwd(), 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;

describe('manifest da extensão', () => {
  it('é um Manifest V3', () => {
    expect(manifest.manifest_version).toBe(3);
  });

  it('mantém as permissões mínimas aprovadas', () => {
    expect(manifest.permissions).toEqual(['storage']);
    expect(manifest.host_permissions).toEqual(['https://docs.google.com/document/*']);
  });

  it('não declara service worker nem background', () => {
    expect(manifest.background).toBeUndefined();
  });

  it('não expõe recursos acessíveis pela web', () => {
    expect(manifest.web_accessible_resources).toBeUndefined();
  });

  it('declara o tema da interface no content script existente', () => {
    expect(manifest.content_scripts).toHaveLength(1);
    const script = manifest.content_scripts?.[0];
    expect(script?.matches).toEqual(['https://docs.google.com/document/*']);
    expect(script?.js).toEqual(['content/content.js']);
    expect(script?.css).toEqual(['content/docs-theme.css']);
    expect(script?.run_at).toBe('document_idle');
    expect(script?.all_frames).toBe(false);
  });
});
