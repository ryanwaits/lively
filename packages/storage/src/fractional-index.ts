// Base-62 chars in ASCII order so string comparison works correctly
const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const BASE = CHARS.length; // 62

export function generateKeyBetween(
  a: string | null,
  b: string | null
): string {
  if (a === null && b === null) {
    return "V"; // roughly middle of base-62
  }
  if (a === null) {
    // Before b
    const firstIdx = CHARS.indexOf(b![0]);
    if (firstIdx > 1) {
      return CHARS[Math.floor(firstIdx / 2)];
    }
    // Append a midpoint character
    return b!.slice(0, -1) + CHARS[Math.floor(CHARS.indexOf(b![b!.length - 1]) / 2)];
  }
  if (b === null) {
    // After a
    const lastIdx = CHARS.indexOf(a[a.length - 1]);
    if (lastIdx < BASE - 2) {
      const step = Math.ceil((BASE - 1 - lastIdx) / 2);
      return a.slice(0, -1) + CHARS[lastIdx + step];
    }
    return a + "V";
  }

  // Between a and b
  return midpoint(a, b);
}

function midpoint(a: string, b: string): string {
  // Pad to same length treating missing chars as 0 (for a) and BASE (for b)
  const len = Math.max(a.length, b.length);

  for (let i = 0; i < len; i++) {
    const aIdx = i < a.length ? CHARS.indexOf(a[i]) : 0;
    const bIdx = i < b.length ? CHARS.indexOf(b[i]) : BASE;

    if (aIdx === bIdx) continue;

    if (bIdx - aIdx > 1) {
      // There's room between these two characters
      const mid = aIdx + Math.floor((bIdx - aIdx) / 2);
      return a.slice(0, i) + CHARS[mid];
    }

    // Difference is 1 — need to go deeper
    // Take the a char and find midpoint in next position
    const nextAIdx = i + 1 < a.length ? CHARS.indexOf(a[i + 1]) : 0;
    const mid = Math.floor((nextAIdx + BASE) / 2);
    if (mid > nextAIdx) {
      return a.slice(0, i + 1) + CHARS[mid];
    }
    // Need even more depth
    return a.slice(0, i + 1) + CHARS[nextAIdx] + "V";
  }

  // a === b (shouldn't happen), append midpoint
  return a + "V";
}

export function generateNKeysBetween(
  a: string | null,
  b: string | null,
  n: number
): string[] {
  if (n === 0) return [];
  if (n === 1) return [generateKeyBetween(a, b)];

  const keys: string[] = [];
  let prev = a;
  for (let i = 0; i < n; i++) {
    const key = generateKeyBetween(prev, b);
    keys.push(key);
    prev = key;
  }
  return keys;
}
