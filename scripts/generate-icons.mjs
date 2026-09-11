// Génère les icônes PWA + le logo d'interface à partir de assets/logo-source.png
// Usage : node scripts/generate-icons.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'assets', 'logo-source.png');
const outDir = join(root, 'public');

// Couleur de fond des icônes PWA.
const BG = '#FFFFFF';

const logoBuffer = await readFile(src);
await mkdir(outDir, { recursive: true });

// Le logo source contient une marge transparente autour du dessin : on la
// retire pour pouvoir le recadrer/centrer précisément dans chaque icône.
const trimmed = await sharp(logoBuffer).trim().toBuffer();

/**
 * Compose le logo (sans cadre, sans texte — non modifié) sur un carré uni de
 * la couleur du thème, centré, occupant `fillRatio` de la largeur/hauteur du
 * canevas. Ne dessine AUCUN coin arrondi : iOS applique son propre masque.
 */
async function composeSquareIcon(size, fillRatio) {
  const inner = Math.round(size * fillRatio);
  const resizedLogo = await sharp(trimmed)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: resizedLogo, gravity: 'center' }])
    .png()
    .toBuffer();
}

// Icônes PWA : fond sombre du thème, logo centré et bien lisible (~82 % du
// canevas). Coins carrés — c'est iOS/Android qui appliquent leur masque.
for (const { file, size } of [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
]) {
  const png = await composeSquareIcon(size, 0.82);
  await writeFile(join(outDir, file), png);
  console.log('écrit', file, `${size}x${size}`);
}

// Icône « maskable » : zone de sécurité plus généreuse (~62 %) pour survivre
// au rognage circulaire/arrondi appliqué par certains launchers Android.
const maskable = await composeSquareIcon(512, 0.62);
await writeFile(join(outDir, 'icon-512-maskable.png'), maskable);
console.log('écrit icon-512-maskable.png 512x512');

// Logo pour l'interface (page Recherche) : même dessin, SANS cadre ni fond,
// transparence conservée. Redimensionné (sans agrandir) pour rester net en
// Retina à l'affichage CSS ciblé (~100 px) sans peser inutilement lourd.
const meta = await sharp(trimmed).metadata();
const targetWidth = Math.min(meta.width, 480);
const uiLogo = await sharp(trimmed)
  .resize({ width: targetWidth, withoutEnlargement: true })
  .png()
  .toBuffer();
await writeFile(join(outDir, 'logo.png'), uiLogo);
console.log('écrit logo.png', `${targetWidth}x${Math.round((targetWidth * meta.height) / meta.width)}`);
