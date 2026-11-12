// Bestleistung: nur der beste Punktestand, mit Versionsnummer.
// Hier steht nur die Logik. Das Speichern im Browser macht src/spiel/speicher.ts.

/** Bei einer Änderung der Wertung (Punkte, Schichtdauer) erhöhen: Alte Bestleistungen zählen dann nicht mehr. */
export const BESTLEISTUNG_VERSION = 1;

export interface Bestleistung {
  version: number;
  punkte: number;
  puenktlich: number;
  verspaetet: number;
  /** Datum im Format 11.11.2026 */
  datum: string;
}

/** Liest einen gespeicherten Text. Ungültiges oder eine andere Version ergibt null. */
export function leseBestleistung(text: string | null): Bestleistung | null {
  if (!text) return null;
  try {
    const d = JSON.parse(text) as Partial<Bestleistung>;
    if (d.version !== BESTLEISTUNG_VERSION) return null;
    if (typeof d.punkte !== 'number' || !Number.isFinite(d.punkte)) return null;
    return {
      version: BESTLEISTUNG_VERSION,
      punkte: d.punkte,
      puenktlich: typeof d.puenktlich === 'number' ? d.puenktlich : 0,
      verspaetet: typeof d.verspaetet === 'number' ? d.verspaetet : 0,
      datum: typeof d.datum === 'string' ? d.datum : '',
    };
  } catch {
    return null;
  }
}

/** Ist das Ergebnis besser als die bisherige Bestleistung? Gleichstand zählt nicht als neu. */
export function istNeueBestleistung(punkte: number, bisher: Bestleistung | null): boolean {
  return bisher === null || punkte > bisher.punkte;
}

export function neueBestleistung(punkte: number, puenktlich: number, verspaetet: number, datum: string): Bestleistung {
  return { version: BESTLEISTUNG_VERSION, punkte, puenktlich, verspaetet, datum };
}
