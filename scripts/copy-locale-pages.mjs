// GitHub Pages serves static files only, so `/en/` and `/bm/` need to be real
// files on disk. Both are self-contained copies of the same build — the app
// reads the URL path at runtime (see src/i18n.ts) and renders accordingly.
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

for (const lang of ['en', 'bm']) {
  const target = join(distDir, lang);
  mkdirSync(target, { recursive: true });
  cpSync(join(distDir, 'index.html'), join(target, 'index.html'));
  if (existsSync(join(distDir, 'assets'))) {
    cpSync(join(distDir, 'assets'), join(target, 'assets'), { recursive: true });
  }
}
