#!/usr/bin/env node
import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileDribble } from '@dribble/compiler';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

const srcDir = join(root, 'src');

/** Recursively find all .dribble files under src */
function findDribbleFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...findDribbleFiles(p));
    else if (p.endsWith('.dribble')) out.push(p);
  }
  return out;
}

const routesDir = join(srcDir, 'routes');
const files = findDribbleFiles(routesDir);
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const { code } = compileDribble(f, src);
  const outFile = f.replace(/\.dribble$/, '.ts');
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, code, 'utf8');
  console.log('Compiled', relative(root, f), '->', relative(root, outFile));
}
