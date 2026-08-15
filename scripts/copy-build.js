import { cp, rm, mkdir } from 'node:fs/promises';
await rm('docs', { recursive: true, force: true });
await mkdir('docs', { recursive: true });
await cp('dist', 'docs', { recursive: true });
console.log('copied fresh production build to docs/');
