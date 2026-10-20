import { describe, expect, it } from 'vitest';
import { isSupportedDocsEditorUrl } from '../../src/shared/urls';

describe('isSupportedDocsEditorUrl', () => {
  it('aceita o editor de documento em conta principal', () => {
    expect(isSupportedDocsEditorUrl('https://docs.google.com/document/d/abc123/edit')).toBe(true);
  });

  it('aceita o editor sem o sufixo /edit', () => {
    expect(isSupportedDocsEditorUrl('https://docs.google.com/document/d/abc123')).toBe(true);
  });

  it('aceita o editor em conta secundária', () => {
    expect(isSupportedDocsEditorUrl('https://docs.google.com/document/u/1/d/abc123/edit')).toBe(true);
  });

  it('aceita a criação de documento', () => {
    expect(isSupportedDocsEditorUrl('https://docs.google.com/document/create')).toBe(true);
    expect(isSupportedDocsEditorUrl('https://docs.google.com/document/u/0/create')).toBe(true);
  });

  it('aceita query string e fragmento do editor', () => {
    expect(
      isSupportedDocsEditorUrl('https://docs.google.com/document/d/abc123/edit?tab=t.0#heading'),
    ).toBe(true);
  });

  it('recusa a listagem de documentos', () => {
    expect(isSupportedDocsEditorUrl('https://docs.google.com/document/')).toBe(false);
    expect(isSupportedDocsEditorUrl('https://docs.google.com/document/u/0/')).toBe(false);
  });

  it('recusa visualização publicada e pré-visualização', () => {
    expect(isSupportedDocsEditorUrl('https://docs.google.com/document/d/e/2PACX-abc/pub')).toBe(false);
    expect(isSupportedDocsEditorUrl('https://docs.google.com/document/d/abc123/preview')).toBe(false);
    expect(isSupportedDocsEditorUrl('https://docs.google.com/document/d/abc123/mobilebasic')).toBe(false);
  });

  it('recusa outros hosts, mesmo do Google', () => {
    expect(isSupportedDocsEditorUrl('https://drive.google.com/document/d/abc123/edit')).toBe(false);
    expect(isSupportedDocsEditorUrl('https://docs.google.com.evil.test/document/d/abc/edit')).toBe(false);
  });

  it('recusa http:// e URLs inválidas', () => {
    expect(isSupportedDocsEditorUrl('http://docs.google.com/document/d/abc123/edit')).toBe(false);
    expect(isSupportedDocsEditorUrl('não é uma url')).toBe(false);
    expect(isSupportedDocsEditorUrl('')).toBe(false);
  });
});
