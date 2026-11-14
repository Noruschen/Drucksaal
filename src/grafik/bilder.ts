// Liste aller Bilder des Spiels. Das Skript werkzeuge/grafik-erzeugen.ts erzeugt daraus
// die PNG-Dateien in public/grafik/ und die BILDERLISTE.md. Das Spiel lädt die Bilder nach dieser Liste.
// Ein Bild lässt sich ersetzen: PNG mit gleichem Namen und gleicher Grösse in public/grafik/ legen
// und in der Liste «vonHand: true» setzen, damit das Skript es nicht überschreibt.

import { VARIANTEN } from '../designs/varianten.ts';
import {
  DIGITAL_ECHT_BREITE,
  MF,
  WF,
  RA76_BREITE,
  SM52_BREITE,
  zeichneArbeitsplatz,
  zeichneDigital,
  zeichneFalzmaschine,
  zeichneLastwagenHeck,
  zeichnePalette,
  zeichnePortraitAusruester,
  zeichneFirmengebaeude,
  zeichneLastwagenSeite,
  zeichnePortraitSchneiden,
  zeichneRuettler,
  zeichneSchneidemaschine,
  zeichneSammelhefter,
  type Laufzustand,
  zeichnePortraitMedientechnologe,
  zeichnePortraitPolygraf,
  zeichneSeitenelement,
  zeichneVorstufenplatz,
  zeichnePortraitProduktionsleiter,
  zeichneRA76,
  zeichneSM52,
  zeichneTaste,
  zeichneDrucker,
  zeichneFarbigkeit,
  zeichneHalle,
  zeichneLauftasche,
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

/** Zustände und Bewegungsbilder der Maschinen in der Weiterverarbeitung */
const LAUFBILDER: { zustand: Laufzustand; text: string; bild: number; von: number }[] = [
  { zustand: 'steht', text: 'steht', bild: 0, von: 1 },
  { zustand: 'ruestet', text: 'rüstet', bild: 0, von: 2 },
  { zustand: 'ruestet', text: 'rüstet', bild: 1, von: 2 },
  { zustand: 'laeuft', text: 'läuft', bild: 0, von: 2 },
  { zustand: 'laeuft', text: 'läuft', bild: 1, von: 2 },
];

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
  ...maschinenBilder('digital', 'Digitaldruckmaschine', DIGITAL_ECHT_BREITE, (l, x, y, z, b) => zeichneDigital(l, x, y, z, b)),
  ...maschinenBilder('sm52', 'SM 52', SM52_BREITE, (l, x, y, z, b) => zeichneSM52(l, x, y, z, b)),
  ...maschinenBilder('ra76', 'RA 76', RA76_BREITE, (l, x, y, z, b) => zeichneRA76(l, x, y, z, b)),
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
  ...(['hoch', 'runter'] as const).map((r): Bild => ({ name: `taste_farbe_${r}`, breite: 40, hoehe: 30, beschrieb: `Leitstand: Taste Farbe ${r === 'hoch' ? 'mehr' : 'weniger'}`, zeichne: (l) => zeichneTaste(l, F, 40, 30, r) })),
  ...(['hoch', 'runter', 'links', 'rechts'] as const).map((r): Bild => ({ name: `taste_passer_${r}`, breite: 30, hoehe: 30, beschrieb: `Leitstand: Taste Passer nach ${r === 'hoch' ? 'oben' : r === 'runter' ? 'unten' : r}`, zeichne: (l) => zeichneTaste(l, F, 30, 30, r) })),
  { name: 'schaltflaeche_bereich', breite: 118, hoehe: 32, beschrieb: 'Schaltfläche zur Wahl des Bereichs', zeichne: (l) => zeichneSchaltflaeche(l, STIL, 0, 0, 118, 32) },
  {
    name: 'schaltflaeche_nochmals_klein',
    breite: 70,
    hoehe: 30,
    beschrieb: 'Schaltfläche «Nochmals», schmal (grün)',
    zeichne: (l) => zeichneSchaltflaeche(l, { ...STIL, farben: { ...F, knopf: F.gut, knopfHell: '#8fd69b', knopfDunkel: '#2f8540' } }, 0, 0, 70, 30),
  },
  { name: 'arbeitsplatz', breite: 34, hoehe: 30, beschrieb: 'Computer-Arbeitsplatz des Produktionsleiters (Tisch, Bildschirm mit Planung, Stuhl)', zeichne: (l) => zeichneArbeitsplatz(l) },
  { name: 'portrait_polygraf', breite: 40, hoehe: 46, beschrieb: 'Porträt Polygraf für die Wahl des Berufs (nach Foto)', zeichne: (l) => zeichnePortraitPolygraf(l) },
  { name: 'vorstufenplatz', breite: 34, hoehe: 30, beschrieb: 'Arbeitsplatz der Medienvorstufe (Tisch, Bildschirm mit Seitenlayout, Stuhl)', zeichne: (l) => zeichneVorstufenplatz(l) },
  ...(['titel', 'text', 'foto', 'grafik'] as const).map((art): Bild => ({
    name: `seite_${art}`,
    breite: 36,
    hoehe: 30,
    beschrieb: `Bereich Polygraf: Seitenelement ${{ titel: 'Titel', text: 'Text', foto: 'Foto', grafik: 'Grafik' }[art]}`,
    zeichne: (l) => zeichneSeitenelement(l, art),
  })),
  ...(['links', 'rechts'] as const).map((r): Bild => ({ name: `taste_blaettern_${r}`, breite: 30, hoehe: 40, beschrieb: `Wahl des Berufs: nach ${r} blättern`, zeichne: (l) => zeichneTaste(l, F, 30, 40, r) })),
  { name: 'portrait_ausruester', breite: 40, hoehe: 46, beschrieb: 'Porträt Ausrüster für die Wahl des Berufs (nach Foto)', zeichne: (l) => zeichnePortraitAusruester(l) },
  ...LAUFBILDER.map(({ zustand, text, bild: nr, von }): Bild => ({
    name: `mbo_${zustand}_${nr + 1}`,
    breite: 64,
    hoehe: 42,
    beschrieb: `Falzmaschine «MBO», ${text}${von > 1 ? `, Bewegungsbild ${nr + 1} von ${von}` : ''}`,
    zeichne: (l) => zeichneFalzmaschine(l, zustand, nr),
  })),
  ...LAUFBILDER.map(({ zustand, text, bild: nr, von }): Bild => ({
    name: `hefter_${zustand}_${nr + 1}`,
    breite: 124,
    hoehe: 38,
    beschrieb: `Sammelhefter «Martini Hefter», ${text}${von > 1 ? `, Bewegungsbild ${nr + 1} von ${von}` : ''}`,
    zeichne: (l) => zeichneSammelhefter(l, zustand, nr),
  })),
  ...[1, 2, 3].map((g): Bild => ({ name: `palette_${g}`, breite: 26, hoehe: 20, beschrieb: `Palette mit Bogenstapel, Grösse ${g} (${g} ${g === 1 ? 'Platz' : 'Plätze'})`, zeichne: (l) => zeichnePalette(l, g) })),
  { name: 'lastwagen_heck', breite: 46, hoehe: 44, beschrieb: 'Heck des roten Lastwagens an der Rampe, mit dem «a» aus dem Schriftzug', zeichne: (l) => zeichneLastwagenHeck(l) },
  { name: 'portrait_schneiden', breite: 40, hoehe: 46, beschrieb: 'Porträt für den Bereich Schneiden, für die Wahl des Berufs (nach Foto)', zeichne: (l) => zeichnePortraitSchneiden(l) },
  { name: 'ruettler_leer', breite: 40, hoehe: 40, beschrieb: 'Rüttler ohne Stapel', zeichne: (l) => zeichneRuettler(l, 0, false) },
  { name: 'ruettler_1', breite: 40, hoehe: 40, beschrieb: 'Rüttler mit Bogenstapel, Bewegungsbild 1 von 2', zeichne: (l) => zeichneRuettler(l, 0, true) },
  { name: 'ruettler_2', breite: 40, hoehe: 40, beschrieb: 'Rüttler mit Bogenstapel, Bewegungsbild 2 von 2', zeichne: (l) => zeichneRuettler(l, 1, true) },
  { name: 'schneidemaschine_steht', breite: 56, hoehe: 46, beschrieb: 'Schneidemaschine ohne Stapel, Messer oben', zeichne: (l) => zeichneSchneidemaschine(l, false, false) },
  { name: 'schneidemaschine_bereit', breite: 56, hoehe: 46, beschrieb: 'Schneidemaschine mit Bogenstapel, Messer oben', zeichne: (l) => zeichneSchneidemaschine(l, false, true) },
  { name: 'schneidemaschine_schneidet', breite: 56, hoehe: 46, beschrieb: 'Schneidemaschine mit Bogenstapel, Messer unten', zeichne: (l) => zeichneSchneidemaschine(l, true, true) },
  { name: 'firmengebaeude', breite: 320, hoehe: 180, beschrieb: 'Neuer Startbildschirm (Vorschau): Firmengebäude von aussen mit Baum, Laterne und Strasse (nach Foto)', zeichne: (l) => zeichneFirmengebaeude(l) },
  { name: 'lastwagen_seite', breite: 80, hoehe: 34, beschrieb: 'Lastwagen von der Seite: roter Aufbau mit weissem «a», weisses Führerhaus, zwei Achsen', zeichne: (l) => zeichneLastwagenSeite(l) },
  { name: 'portrait_medientechnologe', breite: 40, hoehe: 46, beschrieb: 'Porträt Medientechnologe für die Wahl des Bereichs (nach Foto)', zeichne: (l) => zeichnePortraitMedientechnologe(l) },
  { name: 'portrait_produktionsleiter', breite: 40, hoehe: 46, beschrieb: 'Porträt Produktionsleiter für die Wahl des Bereichs (nach Foto)', zeichne: (l) => zeichnePortraitProduktionsleiter(l) },
  {
    name: 'logo_wallimann',
    breite: 104,
    hoehe: 17,
    vonHand: true,
    beschrieb: 'Logo Wallimann als Pixelart (roter Schriftzug). Umgerechnet aus dem Logo von wallimann.ch, nicht vom Skript gezeichnet',
    zeichne: () => undefined,
  },
];

/** Zusätzliche feste Farben der Maschinen, für die Palette in der Bilderliste. */
export const MASCHINENFARBEN: string[] = [...Object.values(MF), ...Object.values(WF)];
