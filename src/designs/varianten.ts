import type { Stil } from '../grafik/zeichnen.ts';

export interface Schrift {
  name: string;
  familie: string;
  datei: string;
  /** Rastergrösse in Spielpixeln */
  groesse: number;
  /** Abstand von der Oberkante der Zeile bis zur Grundlinie */
  grundlinie: number;
}

export interface Variante {
  nummer: number;
  name: string;
  beschrieb: string;
  detailText: string;
  schrift: Schrift;
  stil: Stil;
}

export const VARIANTEN: Variante[] = [
  {
    nummer: 1,
    name: 'Werkhalle',
    beschrieb: 'Hell und sachlich, wie ein Drucksaal bei Tageslicht.',
    detailText: 'mittel',
    schrift: { name: 'Tiny5', familie: 'Tiny5', datei: 'tiny5.woff2', groesse: 8, grundlinie: 7 },
    stil: {
      detail: 2,
      umriss: false,
      farben: {
        wand: '#c9d3dd', wandDunkel: '#9eadbd', fenster: '#eaf4fb',
        boden: '#8d98a6', bodenFuge: '#7b8695', markierung: '#f2c230',
        maschine: '#e6ebf0', maschineHell: '#ffffff', maschineDunkel: '#56657a',
        umriss: '#2b3445', akzent: '#3fa7d6',
        papier: '#fbfbf6', papierSchatten: '#cfd3d0',
        leiste: '#2b3445', text: '#ffffff', textAufPapier: '#2b3445', textAufBoden: '#2b3445',
        knopf: '#3fa7d6', knopfHell: '#8fd3f0', knopfDunkel: '#2678a3', knopfText: '#ffffff',
        c: '#1aa7e0', m: '#d93a8a', y: '#f4d51e', k: '#20242e',
        gut: '#49b35a', warnung: '#f2a530', schlecht: '#d94a3d',
      },
    },
  },
  {
    nummer: 2,
    name: 'Handheld',
    beschrieb: 'Vier Grüntöne wie auf einer alten Spielkonsole. Sehr ruhig, wenig Details.',
    detailText: 'niedrig',
    schrift: { name: 'Press Start 2P', familie: 'PressStart2P', datei: 'press-start-2p.woff2', groesse: 8, grundlinie: 8 },
    stil: {
      detail: 1,
      umriss: true,
      farben: {
        wand: '#8bac0f', wandDunkel: '#306230', fenster: '#9bbc0f',
        boden: '#9bbc0f', bodenFuge: '#8bac0f', markierung: '#306230',
        maschine: '#8bac0f', maschineHell: '#9bbc0f', maschineDunkel: '#306230',
        umriss: '#0f380f', akzent: '#9bbc0f',
        papier: '#9bbc0f', papierSchatten: '#8bac0f',
        leiste: '#0f380f', text: '#9bbc0f', textAufPapier: '#0f380f', textAufBoden: '#0f380f',
        knopf: '#306230', knopfHell: '#8bac0f', knopfDunkel: '#0f380f', knopfText: '#9bbc0f',
        c: '#0f380f', m: '#306230', y: '#9bbc0f', k: '#0f380f',
        gut: '#9bbc0f', warnung: '#306230', schlecht: '#0f380f',
      },
    },
  },
  {
    nummer: 3,
    name: 'Nachtschicht',
    beschrieb: 'Dunkle Halle, leuchtende Druckfarben Cyan, Magenta und Gelb. Viele Details.',
    detailText: 'hoch',
    schrift: { name: 'Silkscreen', familie: 'Silkscreen', datei: 'silkscreen.woff2', groesse: 8, grundlinie: 7 },
    stil: {
      detail: 3,
      umriss: false,
      farben: {
        wand: '#1c2340', wandDunkel: '#131830', fenster: '#2c3a6b',
        boden: '#2a3050', bodenFuge: '#222844', markierung: '#ffd23f',
        maschine: '#4a557a', maschineHell: '#7a88b8', maschineDunkel: '#252b48',
        umriss: '#0b0e1c', akzent: '#3df2ff',
        papier: '#f3f1e4', papierSchatten: '#b9b6a3',
        leiste: '#0b0e1c', text: '#e8ecff', textAufPapier: '#0b0e1c', textAufBoden: '#e8ecff',
        knopf: '#e6399b', knopfHell: '#ff7cc4', knopfDunkel: '#9c1f66', knopfText: '#ffffff',
        c: '#3df2ff', m: '#ff4fb0', y: '#ffe94a', k: '#0b0e1c',
        gut: '#5cf08a', warnung: '#ffb347', schlecht: '#ff5a5a',
      },
    },
  },
  {
    nummer: 4,
    name: 'Papier und Druckfarbe',
    beschrieb: 'Warme Papiertöne mit dunklem Umriss, wie eine kolorierte Zeichnung.',
    detailText: 'mittel bis hoch',
    schrift: { name: 'Micro 5', familie: 'Micro5', datei: 'micro-5.woff2', groesse: 11, grundlinie: 8 },
    stil: {
      detail: 2,
      umriss: true,
      farben: {
        wand: '#efe3c8', wandDunkel: '#d2bf98', fenster: '#fff8e6',
        boden: '#c9a97a', bodenFuge: '#b8956a', markierung: '#e8a71c',
        maschine: '#7fa6a1', maschineHell: '#a9c9c2', maschineDunkel: '#4a6b6c',
        umriss: '#3a2a22', akzent: '#f08a3c',
        papier: '#fffaf0', papierSchatten: '#e2d3b5',
        leiste: '#3a2a22', text: '#fff3d6', textAufPapier: '#3a2a22', textAufBoden: '#3a2a22',
        knopf: '#d8553a', knopfHell: '#f08a6c', knopfDunkel: '#9c3a28', knopfText: '#fffaf0',
        c: '#2a9bc4', m: '#c9407a', y: '#f0c82c', k: '#3a2a22',
        gut: '#5b9e4d', warnung: '#e8a71c', schlecht: '#c9402e',
      },
    },
  },
];
