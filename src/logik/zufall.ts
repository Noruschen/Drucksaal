/** Zufallszahl von 0 (inklusive) bis 1 (exklusive). */
export type Zufall = () => number;

/** Wiederholbarer Zufall für Tests: gleicher Startwert, gleiche Schicht. */
export function zufallMitStartwert(startwert: number): Zufall {
  let a = startwert >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
