/**
 * Géométrie pure du mode SCAN : calcule, dans le repère de pixels NATIFS de
 * la vidéo, le rectangle correspondant au cadre de visée affiché à l'écran.
 *
 * La vidéo est affichée plein écran avec `object-fit: cover` (elle remplit le
 * conteneur, un dépassement étant recadré symétriquement sur un axe). Le
 * cadre de visée est un rectangle centré, exprimé en fraction de la taille du
 * conteneur. Aucune dépendance DOM : entièrement testable avec de simples
 * dimensions.
 */

export interface CropRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export interface GuideFraction {
  /** Largeur du cadre de visée, en fraction de la largeur du conteneur (0..1). */
  widthFraction: number;
  /** Hauteur du cadre de visée, en fraction de la hauteur du conteneur (0..1). */
  heightFraction: number;
}

export function computeGuideCropRect(
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number,
  guide: GuideFraction,
): CropRect {
  if (
    !(videoWidth > 0) ||
    !(videoHeight > 0) ||
    !(containerWidth > 0) ||
    !(containerHeight > 0)
  ) {
    return { sx: 0, sy: 0, sw: Math.max(1, videoWidth), sh: Math.max(1, videoHeight) };
  }

  // Échelle appliquée par `object-fit: cover` : la vidéo est agrandie jusqu'à
  // couvrir entièrement le conteneur sur les deux axes.
  const scale = Math.max(containerWidth / videoWidth, containerHeight / videoHeight);
  const displayedWidth = videoWidth * scale;
  const displayedHeight = videoHeight * scale;
  // Portion de la vidéo affichée qui dépasse du conteneur (recadrée), répartie
  // symétriquement de chaque côté.
  const overflowX = (displayedWidth - containerWidth) / 2;
  const overflowY = (displayedHeight - containerHeight) / 2;

  const guideWidthPx = containerWidth * guide.widthFraction;
  const guideHeightPx = containerHeight * guide.heightFraction;
  const guideLeftPx = (containerWidth - guideWidthPx) / 2;
  const guideTopPx = (containerHeight - guideHeightPx) / 2;

  // Conversion : coordonnées écran (conteneur) -> coordonnées vidéo affichée
  // (+ décalage du recadrage cover) -> coordonnées vidéo natives (/ échelle).
  const sx = (guideLeftPx + overflowX) / scale;
  const sy = (guideTopPx + overflowY) / scale;
  const sw = guideWidthPx / scale;
  const sh = guideHeightPx / scale;

  // Clamp défensif : ne jamais dépasser les dimensions natives de la vidéo,
  // quels que soient les arrondis flottants.
  const clampedSx = Math.max(0, Math.min(sx, videoWidth - 1));
  const clampedSy = Math.max(0, Math.min(sy, videoHeight - 1));
  const clampedSw = Math.max(1, Math.min(sw, videoWidth - clampedSx));
  const clampedSh = Math.max(1, Math.min(sh, videoHeight - clampedSy));

  return { sx: clampedSx, sy: clampedSy, sw: clampedSw, sh: clampedSh };
}
