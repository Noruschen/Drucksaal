import type { Ergebnis, Zahlenmodell } from './typen';
import type { Schicht } from './schicht';

export interface VerspaeteterAuftrag {
  ergebnis: Ergebnis;
  /** Sekunden nach dem Liefertermin, null bei nicht verteilten Lauftaschen */
  verspaetung: number | null;
  /** Vergleich: null bei nicht verteilten Lauftaschen */
  vergleich: null | {
    /** Maschine mit der frühesten voraussichtlichen Fertigzeit bei der Zuteilung */
    besteMaschine: string;
    /** true = die gewählte Maschine war schon die früheste */
    warBesteWahl: boolean;
    /** Um so viele Sekunden wäre der Auftrag auf der besten Maschine früher fertig gewesen */
    frueherUm: number;
  };
}

export interface Auswertung {
  punkte: number;
  puenktlich: number;
  verspaetet: number;
  /** Wie oft ein Drucker um Hilfe gerufen hat und wie lange die Maschinen deswegen standen */
  hilferufe: number;
  stillstand: number;
  verspaeteteAuftraege: VerspaeteterAuftrag[];
}

export function vergleiche(e: Ergebnis): VerspaeteterAuftrag['vergleich'] {
  if (e.maschine === null || e.prognose === null) return null;
  const gewaehlt = e.prognose[e.maschine];
  if (gewaehlt === null || gewaehlt === undefined) return null;
  let beste = e.maschine;
  let besteZeit = gewaehlt;
  for (const [id, zeit] of Object.entries(e.prognose)) {
    // Maschinen, die bei der Zuteilung voll waren (null), fallen aus dem Vergleich.
    if (zeit !== null && zeit < besteZeit - 1e-6) {
      beste = id;
      besteZeit = zeit;
    }
  }
  return { besteMaschine: beste, warBesteWahl: beste === e.maschine, frueherUm: gewaehlt - besteZeit };
}

export function werteAus(schicht: Schicht): Auswertung {
  const verspaetete = schicht.ergebnisse
    .filter((e) => !e.puenktlich)
    .sort((a, b) => a.auftrag.nummer - b.auftrag.nummer)
    .map((e) => ({
      ergebnis: e,
      verspaetung: e.fertigUm === null ? null : e.fertigUm - e.auftrag.termin,
      vergleich: vergleiche(e),
    }));
  return {
    punkte: schicht.punkte,
    puenktlich: schicht.puenktlich,
    verspaetet: schicht.verspaetet,
    hilferufe: schicht.hilferufe,
    stillstand: schicht.maschinen.reduce((summe, m) => summe + m.stillstand, 0),
    verspaeteteAuftraege: verspaetete,
  };
}

export function maschinenName(modell: Zahlenmodell, id: string): string {
  return modell.maschinen.find((m) => m.id === id)?.name ?? id;
}
