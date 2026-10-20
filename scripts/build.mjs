import { access, cp, mkdir, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, context } from 'esbuild';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(rootDir, 'dist');
const isWatch = process.argv.includes('--watch');

const REQUIRED_OUTPUTS = [
  'manifest.json',
  'popup/popup.html',
  'popup/popup.js',
  'popup/popup.css',
  'content/content.js',
  'content/docs-theme.css',
  'icons/icon-16.png',
  'icons/icon-32.png',
  'icons/icon-48.png',
  'icons/icon-128.png',
];

const BUNDLES = [
  {
    name: 'popup',
    entryPoint: path.join(rootDir, 'src', 'popup', 'popup.ts'),
    outfile: path.join(outDir, 'popup', 'popup.js'),
  },
  {
    name: 'content',
    entryPoint: path.join(rootDir, 'src', 'content', 'main.ts'),
    outfile: path.join(outDir, 'content', 'content.js'),
  },
];

function bundleOptions(bundle) {
  return {
    entryPoints: [bundle.entryPoint],
    outfile: bundle.outfile,
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2022'],
    charset: 'utf8',
    legalComments: 'none',
    minify: !isWatch,
    sourcemap: isWatch,
    // Diagnóstico desligado no build de produção (RF-10).
    define: {
      __DDM_DEBUG__: isWatch ? 'true' : 'false',
    },
    logLevel: 'info',
  };
}

async function copyStaticFiles() {
  await mkdir(path.join(outDir, 'popup'), { recursive: true });
  await mkdir(path.join(outDir, 'content'), { recursive: true });
  await cp(path.join(rootDir, 'manifest.json'), path.join(outDir, 'manifest.json'));
  await cp(path.join(rootDir, 'src', 'popup', 'popup.html'), path.join(outDir, 'popup', 'popup.html'));
  await cp(path.join(rootDir, 'src', 'popup', 'popup.css'), path.join(outDir, 'popup', 'popup.css'));
  await cp(
    path.join(rootDir, 'src', 'content', 'styles', 'docs-theme.css'),
    path.join(outDir, 'content', 'docs-theme.css'),
  );
  await cp(path.join(rootDir, 'assets', 'icons'), path.join(outDir, 'icons'), { recursive: true });
}

async function verifyOutput() {
  const missing = [];
  for (const relativePath of REQUIRED_OUTPUTS) {
    try {
      await access(path.join(outDir, relativePath), constants.F_OK);
    } catch {
      missing.push(relativePath);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Saída do build incompleta. Faltando: ${missing.join(', ')}`);
  }
}

async function main() {
  await rm(outDir, { recursive: true, force: true });
  await copyStaticFiles();

  if (isWatch) {
    for (const bundle of BUNDLES) {
      const ctx = await context(bundleOptions(bundle));
      await ctx.watch();
    }
    console.log('Build em modo watch (dist/). Ctrl+C para encerrar.');
    return;
  }

  for (const bundle of BUNDLES) {
    await build(bundleOptions(bundle));
  }
  await verifyOutput();
  console.log('Build concluído. Artefato carregável em dist/.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
