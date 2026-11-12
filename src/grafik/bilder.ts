// Liste aller Bilder des Spiels. Das Skript werkzeuge/grafik-erzeugen.ts erzeugt daraus
// die PNG-Dateien in public/grafik/ und die BILDERLISTE.md. Das Spiel lädt die Bilder nach dieser Liste.
// Ein Bild lässt sich ersetzen: PNG mit gleichem Namen und gleicher Grösse in public/grafik/ legen
// und in der Liste «vonHand: true» setzen, damit das Skript es nicht überschreibt.

import { VARIANTEN } from '../designs/varianten.ts';
import {
  DIGITAL_BREITE,
  RA76,
  SM52,
  offsetBreite,
  zeichneDigitaldruck,
  zeichneDrucker,
  zeichneFarbigkeit,
  zeichneHalle,
  zeichneLauftasche,
  zeichneOffset,
  zeichneSchaltflaeche,
  zeichneSymbol,
  zeichneUhr,
  type Leinwand,
  type Stil,
  type Zustand,
} from './zeichnen.ts';

/** Gewähltes Design: Variante 1 «Werkhalle». */
export const STIL: Stil = VARIANTEN[0].stil;
const F = STIL.farben;

export interface Bild {
  name: string;
  breite: number;
  hoehe: number;
  beschrieb: string;
  vonHand?: boolean;
  /** Vergrösserung beim Schreiben der Datei (nur für die Symbole des Home-Bildschirms) */
  massstab?: number;
  /** false = wird nicht ins Spiel geladen */
  imSpiel?: boolean;
  zeichne: (l: Leinwand) => void;
}

/** Alle Maschinenbilder sind gleich gross, die Maschine steht unten in der Mitte. */
export const MASCHINE_B = 102;
export const MASCHINE_H = 48;
export const HALLE_B = 320;
export const HALLE_H = 109;
/** Höhe der Wand im Hallenbild, darunter beginnt der Boden. */
export const HALLE_WAND = 50;

const ZUSTAENDE: { zustand: Zustand; kurz: string; text: string; bilder: number }[] = [
  { zustand: 'steht', kurz: 'steht', text: 'steht', bilder: 1 },
  { zustand: 'ruestet', kurz: 'ruestet', text: 'rüstet', bilder: 2 },
  { zustand: 'druckt', kurz: 'druckt', text: 'druckt', bilder: 2 },
];

/** Maschinen bekommen einen feinen Umriss, damit sie sich von der hellen Wand abheben. */
const MASCHINEN_STIL: Stil = { ...STIL, umriss: true, farben: { ...F, umriss: F.bodenFuge } };

function maschinenBilder(id: string, name: string, breite: number, zeichne: (l: Leinwand, x: number, y: number, z: Zustand, bild: number) => void): Bild[] {
  const liste: Bild[] = [];
  for (const z of ZUSTAENDE) {
    for (let bild = 0; bild < z.bilder; bild++) {
      liste.push({
        name: `${id}_${z.kurz}_${bild + 1}`,
        breite: MASCHINE_B,
        hoehe: MASCHINE_H,
        beschrieb: `${name}, ${z.text}${z.bilder > 1 ? `, Bewegungsbild ${bild + 1} von ${z.bilder}` : ''}`,
        zeichne: (l) => zeichne(l, Math.floor((MASCHINE_B - breite) / 2), MASCHINE_H - 2, z.zustand, bild),
      });
    }
  }
  return liste;
}

function taschenStil(papier: string, rand: string): Stil {
  return { ...STIL, farben: { ...F, papier, umriss: rand } };
}

export const BILDER: Bild[] = [
  {
    name: 'drucksaal',
    breite: HALLE_B,
    hoehe: HALLE_H,
    beschrieb: 'Drucksaal als Hintergrund: Wand mit Fensterband, Boden mit gelber Markierung',
    zeichne: (l) => zeichneHalle(l, STIL, HALLE_B, 0, HALLE_WAND, HALLE_H),
  },
  ...maschinenBilder('digital', 'Digitaldruckmaschine', DIGITAL_BREITE, (l, x, y, z, b) => zeichneDigitaldruck(l, MASCHINEN_STIL, x, y, z, b)),
  ...maschinenBilder('sm52', 'SM 52', offsetBreite(SM52), (l, x, y, z, b) => zeichneOffset(l, MASCHINEN_STIL, x, y, SM52, z, b)),
  ...maschinenBilder('ra76', 'RA 76', offsetBreite(RA76), (l, x, y, z, b) => zeichneOffset(l, MASCHINEN_STIL, x, y, RA76, z, b)),
  { name: 'lauftasche', breite: 76, hoehe: 48, beschrieb: 'Lauftasche', zeichne: (l) => zeichneLauftasche(l, STIL, 0, 0) },
  {
    name: 'lauftasche_gewaehlt',
    breite: 76,
    hoehe: 48,
    beschrieb: 'Lauftasche, angetippt (blauer Rand)',
    zeichne: (l) => {
      zeichneLauftasche(l, taschenStil(F.papier, F.akzent), 0, 0);
      l.rechteck(1, 6, 74, 1, F.akzent);
      l.rechteck(1, 46, 74, 1, F.akzent);
      l.rechteck(1, 6, 1, 41, F.akzent);
      l.rechteck(74, 6, 1, 41, F.akzent);
    },
  },
  { name: 'lauftasche_spaet', breite: 76, hoehe: 48, beschrieb: 'Lauftasche, Liefertermin abgelaufen (rötlich)', zeichne: (l) => zeichneLauftasche(l, taschenStil('#f6c9c2', F.schlecht), 0, 0) },
  { name: 'symbol_4-0', breite: 17, hoehe: 9, beschrieb: 'Symbol Farbigkeit 4/0: Schöndruckseite bedruckt, Rückseite leer', zeichne: (l) => zeichneFarbigkeit(l, F, 0, 0, false) },
  { name: 'symbol_4-4', breite: 17, hoehe: 9, beschrieb: 'Symbol Farbigkeit 4/4: beide Seiten bedruckt', zeichne: (l) => zeichneFarbigkeit(l, F, 0, 0, true) },
  { name: 'uhr_hell', breite: 9, hoehe: 9, beschrieb: 'Uhr, hell (für die dunkle Kopfleiste)', zeichne: (l) => zeichneUhr(l, F, 0, 0, F.text, F.leiste) },
  { name: 'uhr_dunkel', breite: 9, hoehe: 9, beschrieb: 'Uhr, dunkel (für die Lauftasche)', zeichne: (l) => zeichneUhr(l, F, 0, 0, F.textAufPapier, F.papier) },
  { name: 'schaltflaeche_start', breite: 120, hoehe: 32, beschrieb: 'Schaltfläche «Schicht starten»', zeichne: (l) => zeichneSchaltflaeche(l, STIL, 0, 0, 120, 32) },
  {
    name: 'schaltflaeche_nochmals',
    breite: 110,
    hoehe: 30,
    beschrieb: 'Schaltfläche «Nochmals» (grün)',
    zeichne: (l) => zeichneSchaltflaeche(l, { ...STIL, farben: { ...F, knopf: F.gut, knopfHell: '#8fd69b', knopfDunkel: '#2f8540' } }, 0, 0, 110, 30),
  },
  { name: 'schaltflaeche_blaettern', breite: 70, hoehe: 30, beschrieb: 'Schaltfläche «Zurück» und «Weiter»', zeichne: (l) => zeichneSchaltflaeche(l, STIL, 0, 0, 70, 30) },
  {
    name: 'schaltflaeche_blaettern_aus',
    breite: 70,
    hoehe: 30,
    beschrieb: 'Schaltfläche «Zurück» und «Weiter», nicht wählbar (grau)',
    zeichne: (l) => zeichneSchaltflaeche(l, { ...STIL, farben: { ...F, knopf: F.maschineDunkel, knopfHell: '#7c8aa0', knopfDunkel: '#3d4a5e' } }, 0, 0, 70, 30),
  },
  ...[0, 1, 2].flatMap((b) =>
    [false, true].map((traegt): Bild => ({
      name: `drucker_${b === 0 ? 'steht' : `geht_${b}`}${traegt ? '_tasche' : ''}`,
      breite: 10,
      hoehe: 16,
      beschrieb: `Drucker (Figur), ${b === 0 ? 'steht' : `geht, Bewegungsbild ${b} von 2`}${traegt ? ', trägt eine Lauftasche' : ''}`,
      zeichne: (l) => zeichneDrucker(l, F, 0, 0, b, traegt),
    })),
  ),
  { name: 'symbol_home_180', breite: 36, hoehe: 36, massstab: 5, imSpiel: false, beschrieb: 'Symbol für den Home-Bildschirm am iPhone (Datei 180 x 180)', zeichne: (l) => zeichneSymbol(l, F, 36) },
  { name: 'symbol_home_192', breite: 32, hoehe: 32, massstab: 6, imSpiel: false, beschrieb: 'Symbol für den Home-Bildschirm (Datei 192 x 192)', zeichne: (l) => zeichneSymbol(l, F, 32) },
  { name: 'symbol_home_512', breite: 32, hoehe: 32, massstab: 16, imSpiel: false, beschrieb: 'Symbol für den Home-Bildschirm (Datei 512 x 512)', zeichne: (l) => zeichneSymbol(l, F, 32) },
];
