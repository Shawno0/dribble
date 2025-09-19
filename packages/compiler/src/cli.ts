#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';
import { compileDribble } from './index';

const inFile = process.argv[2];
if (!inFile) {
  console.error('Usage: dribblec <file.dribble>');
  process.exit(1);
}
const src = readFileSync(inFile, 'utf8');
const { code } = compileDribble(inFile, src);
const outFile = resolve(dirname(inFile), basename(inFile).replace(/\.dribble$/, '.ts'));
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, code, 'utf8');
console.log('Compiled', inFile, '->', outFile);
