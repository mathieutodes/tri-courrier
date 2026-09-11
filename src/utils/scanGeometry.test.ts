import { describe, expect, it } from 'vitest';
import { computeGuideCropRect } from './scanGeometry';

describe('computeGuideCropRect', () => {
  it('centre le cadre de visée quand la vidéo a le même ratio que le conteneur', () => {
    // Vidéo 1000x1000 affichée dans un conteneur 1000x1000 (aucun recadrage cover).
    const rect = computeGuideCropRect(1000, 1000, 1000, 1000, {
      widthFraction: 0.8,
      heightFraction: 0.4,
    });
    expect(rect.sw).toBeCloseTo(800, 5);
    expect(rect.sh).toBeCloseTo(400, 5);
    expect(rect.sx).toBeCloseTo(100, 5);
    expect(rect.sy).toBeCloseTo(300, 5);
  });

  it('tient compte du recadrage object-fit: cover sur une vidéo plus large que le conteneur', () => {
    // Vidéo 1600x1200 (4:3) affichée en plein écran 400x800 (portrait étroit) :
    // l'échelle cover est dictée par la hauteur, la largeur déborde et est recadrée.
    const rect = computeGuideCropRect(1600, 1200, 400, 800, {
      widthFraction: 1,
      heightFraction: 1,
    });
    // Le cadre de visée couvre tout le conteneur : le rectangle recadré doit
    // rester strictement dans les bornes de la vidéo native.
    expect(rect.sx).toBeGreaterThanOrEqual(0);
    expect(rect.sy).toBeGreaterThanOrEqual(0);
    expect(rect.sx + rect.sw).toBeLessThanOrEqual(1600 + 1e-6);
    expect(rect.sy + rect.sh).toBeLessThanOrEqual(1200 + 1e-6);
  });

  it('reste dans les bornes de la vidéo pour un petit cadre centré (cas d’usage réel)', () => {
    const rect = computeGuideCropRect(1280, 720, 390, 844, {
      widthFraction: 0.82,
      heightFraction: 0.28,
    });
    expect(rect.sx).toBeGreaterThanOrEqual(0);
    expect(rect.sy).toBeGreaterThanOrEqual(0);
    expect(rect.sw).toBeGreaterThan(0);
    expect(rect.sh).toBeGreaterThan(0);
    expect(rect.sx + rect.sw).toBeLessThanOrEqual(1280 + 1e-6);
    expect(rect.sy + rect.sh).toBeLessThanOrEqual(720 + 1e-6);
  });

  it('retourne un rectangle de secours défensif si une dimension est nulle ou invalide', () => {
    const rect = computeGuideCropRect(0, 0, 400, 800, { widthFraction: 0.8, heightFraction: 0.4 });
    expect(rect.sw).toBeGreaterThan(0);
    expect(rect.sh).toBeGreaterThan(0);
  });
});
