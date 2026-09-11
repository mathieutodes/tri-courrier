/**
 * Distance de Levenshtein (nombre minimal d'insertions/suppressions/
 * substitutions pour passer de `a` à `b`). Utilisée par le mode SCAN pour
 * tolérer de petites erreurs OCR (ex. « DUP0NT » ↔ « DUPONT ») sans logique
 * floue plus complexe. Implémentation itérative à deux lignes (peu coûteuse
 * en mémoire, suffisante pour des noms/adresses courts).
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previousRow = Array.from({ length: b.length + 1 }, (_, i) => i);
  let currentRow = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    currentRow[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currentRow[j] = Math.min(
        previousRow[j] + 1, // suppression
        currentRow[j - 1] + 1, // insertion
        previousRow[j - 1] + cost, // substitution
      );
    }
    [previousRow, currentRow] = [currentRow, previousRow];
  }

  return previousRow[b.length];
}
