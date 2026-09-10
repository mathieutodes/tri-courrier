// Génère les icônes PNG de la PWA à partir de assets/icon-source.svg
// Usage : node scripts/generate-icons.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'assets', 'icon-source.svg');
const outDir = join(root, 'public');

const svg = await readFile(src);
await mkdir(outDir, { recursive: true });

const targets = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
];

for (const { file, size } of targets) {
  const png = await sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();
  await writeFile(join(outDir, file), png);
  console.log('écrit', file, `${size}x${size}`);
}

// Version "maskable" : le motif est réduit dans une zone sûre (safe area ~80%).
const inner = await sharp(svg, { density: 384 }).resize(410, 410).png().toBuffer();
const maskable = await sharp({
  create: { width: 512, height: 512, channels: 4, background: '#1a56db' },
})
  .composite([{ input: inner, gravity: 'center' }])
  .png()
  .toBuffer();
await writeFile(join(outDir, 'icon-512-maskable.png'), maskable);
console.log('écrit icon-512-maskable.png 512x512');
