import { istNeueBestleistung, leseBestleistung, neueBestleistung, type Bestleistung } from '../logik/bestleistung';

// Lokaler Speicher des Browsers. Kein Abgleich zwischen Geräten.
// Am iPhone haben Safari-Tab und Home-Bildschirm getrennte Speicher.
const SCHLUESSEL_BEST = 'druckerei.bestleistung';
const SCHLUESSEL_TON = 'druckerei.ton';

function lies(schluessel: string): string | null {
  try {
    return window.localStorage.getItem(schluessel);
  } catch {
    return null; // Speicher gesperrt (zum Beispiel privates Surfen): Spiel läuft ohne Bestleistung weiter.
  }
}

function schreibe(schluessel: string, wert: string): void {
  try {
    window.localStorage.setItem(schluessel, wert);
  } catch {
    // Speichern nicht möglich: kein Fehler für den Spieler.
  }
}

/** Ersatz, falls der Browser das Speichern sperrt: Die Bestleistung gilt dann bis zum Schliessen der Seite. */
let merker: Bestleistung | null = null;

export function ladeBestleistung(): Bestleistung | null {
  return leseBestleistung(lies(SCHLUESSEL_BEST)) ?? merker;
}

function heute(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

/** Speichert das Ergebnis, wenn es besser ist. Gibt zurück, ob es eine neue Bestleistung ist. */
export function meldeErgebnis(punkte: number, puenktlich: number, verspaetet: number): { neu: boolean; best: Bestleistung } {
  const bisher = ladeBestleistung();
  if (istNeueBestleistung(punkte, bisher)) {
    const best = neueBestleistung(punkte, puenktlich, verspaetet, heute());
    schreibe(SCHLUESSEL_BEST, JSON.stringify(best));
    merker = best;
    return { neu: true, best };
  }
  return { neu: false, best: bisher! };
}

export function tonAn(): boolean {
  return lies(SCHLUESSEL_TON) !== 'aus';
}

export function setzeTon(an: boolean): void {
  schreibe(SCHLUESSEL_TON, an ? 'an' : 'aus');
}
