// Testseite für Schritt 4: vier Stilvarianten desselben Ausschnitts.
// Bewusst ohne Phaser: Es geht nur um Farben, Detailgrad und Schrift.

import {
  RA76,
  SM52,
  offsetBreite,
  zeichneBalken,
  zeichneDigitaldruck,
  zeichneFarbigkeit,
  zeichneHalle,
  zeichneLauftasche,
  zeichneOffset,
  zeichneSchaltflaeche,
  zeichneUhr,
  type Leinwand,
} from '../grafik/zeichnen';
import { VARIANTEN, type Schrift, type Variante } from './varianten';

const BREITE = 320;
const HOEHE = 180;
const TESTZEILE = '«Rüstzeit für 4/4: fünf Bögen, Öl»';

function hexZuRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Schreibt Text ohne Kantenglättung: Jeder Bildpunkt ist ganz Farbe oder ganz leer. */
function text(ctx: CanvasRenderingContext2D, s: Schrift, inhalt: string, x: number, y: number, farbe: string, ausrichtung: 'links' | 'mitte' | 'rechts' = 'links'): number {
  const font = `${s.groesse}px ${s.familie}`;
  ctx.font = font;
  const b = Math.ceil(ctx.measureText(inhalt).width) + 2;
  const h = s.groesse + 6;
  const puffer = document.createElement('canvas');
  puffer.width = b;
  puffer.height = h;
  const p = puffer.getContext('2d')!;
  p.font = font;
  p.textBaseline = 'alphabetic';
  p.fillStyle = '#000';
  p.fillText(inhalt, 1, s.grundlinie + 2);
  const bild = p.getImageData(0, 0, b, h);
  const [r, g, bl] = hexZuRgb(farbe);
  for (let i = 0; i < bild.data.length; i += 4) {
    const deckend = bild.data[i + 3] >= 110;
    bild.data[i] = r;
    bild.data[i + 1] = g;
    bild.data[i + 2] = bl;
    bild.data[i + 3] = deckend ? 255 : 0;
  }
  p.putImageData(bild, 0, 0);
  const links = ausrichtung === 'links' ? x : ausrichtung === 'mitte' ? Math.round(x - b / 2) : x - b;
  ctx.drawImage(puffer, links - 1, y - 2);
  return b - 2;
}

function zeichneVariante(canvas: HTMLCanvasElement, v: Variante): void {
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const l: Leinwand = {
    rechteck(x, y, b, h, farbe) {
      if (b <= 0 || h <= 0) return;
      ctx.fillStyle = farbe;
      ctx.fillRect(x, y, b, h);
    },
  };
  const s = v.stil;
  const f = s.farben;
  const sch = v.schrift;

  // Drucksaal
  zeichneHalle(l, s, BREITE, 16, 66, 124);

  // Kopfleiste
  l.rechteck(0, 0, BREITE, 16, f.leiste);
  zeichneUhr(l, f, 4, 3, f.text, f.leiste);
  text(ctx, sch, '2:14', 16, 4, f.text);
  zeichneBalken(l, f, 60, 5, 70, 6, 0.26, f.akzent);
  text(ctx, sch, 'Punkte 250', BREITE - 4, 4, f.text, 'rechts');

  // Drei Maschinen
  const boden = 92;
  const spalte = (i: number): number => 4 + i * 104 + 52;
  const namen = ['Digitaldruck', 'SM 52', 'RA 76'];
  const zustaende = ['steht', 'rüstet', 'Fortdruck'];
  zeichneDigitaldruck(l, s, spalte(0) - 35, boden, 'steht');
  zeichneOffset(l, s, spalte(1) - Math.round(offsetBreite(SM52) / 2), boden, SM52, 'ruestet');
  zeichneOffset(l, s, spalte(2) - Math.round(offsetBreite(RA76) / 2), boden, RA76, 'druckt');
  for (let i = 0; i < 3; i++) {
    // Schild an der Wand
    ctx.font = `${sch.groesse}px ${sch.familie}`;
    const tb = Math.ceil(ctx.measureText(namen[i]).width);
    l.rechteck(spalte(i) - Math.round(tb / 2) - 4, 19, tb + 8, sch.groesse + 5, f.umriss);
    l.rechteck(spalte(i) - Math.round(tb / 2) - 3, 20, tb + 6, sch.groesse + 3, f.leiste);
    text(ctx, sch, namen[i], spalte(i), 22, f.text, 'mitte');
    // Zustand und Balken am Boden
    text(ctx, sch, zustaende[i], spalte(i), 94, f.textAufBoden, 'mitte');
    const anteil = [0, 0.4, 0.7][i];
    const farbe = [f.schlecht, f.warnung, f.gut][i];
    zeichneBalken(l, f, spalte(i) - 30, 104, 60, 6, anteil, farbe);
  }

  // Testzeile
  text(ctx, sch, TESTZEILE, BREITE / 2, 112, f.textAufBoden, 'mitte');

  // Fussleiste mit Lauftasche, Schaltfläche und Symbolen
  l.rechteck(0, 124, BREITE, 56, f.leiste);
  zeichneLauftasche(l, s, 6, 128);
  text(ctx, sch, "2'500 Ex", 9, 137, f.textAufPapier);
  zeichneFarbigkeit(l, f, 11, 150, false);
  text(ctx, sch, '4/0', 31, 151, f.textAufPapier);
  zeichneUhr(l, f, 11, 163, f.textAufPapier, f.papier);
  text(ctx, sch, '38 s', 23, 164, f.textAufPapier);
  zeichneBalken(l, f, 57, 165, 21, 6, 0.6, f.gut);

  zeichneSchaltflaeche(l, s, 88, 131, 124, 30);
  text(ctx, sch, 'Schicht starten', 150, 141, f.knopfText, 'mitte');
  text(ctx, sch, 'ÄÖÜ äöü 0123456789', 88, 166, f.text);

  zeichneFarbigkeit(l, f, 217, 132, false);
  text(ctx, sch, '4/0', 237, 133, f.text);
  zeichneFarbigkeit(l, f, 217, 146, true);
  text(ctx, sch, '4/4', 237, 147, f.text);

  // Palette
  const einmalig = [...new Set(Object.values(f))];
  einmalig.forEach((farbe, i) => {
    const px = 267 + (i % 6) * 8;
    const py = 132 + Math.floor(i / 6) * 8;
    l.rechteck(px, py, 7, 7, f.text);
    l.rechteck(px + 1, py + 1, 5, 5, farbe);
  });
}

/** Grösster ganzer Faktor in echten Bildpunkten des Geräts, der in die Breite passt. */
function passeGroesseAn(): void {
  const dpr = window.devicePixelRatio || 1;
  document.querySelectorAll<HTMLElement>('.variante').forEach((karte) => {
    const canvas = karte.querySelector('canvas')!;
    const platz = karte.clientWidth;
    const faktor = Math.max(1, Math.floor((platz * dpr) / BREITE));
    canvas.style.width = `${(BREITE * faktor) / dpr}px`;
    canvas.style.height = `${(HOEHE * faktor) / dpr}px`;
    karte.querySelector('.faktor')!.textContent = `Vergrösserung ${faktor}-fach in Bildpunkten des Geräts`;
  });
}

async function start(): Promise<void> {
  const basis = import.meta.env.BASE_URL;
  await Promise.all(
    VARIANTEN.map(async (v) => {
      const schrift = new FontFace(v.schrift.familie, `url(${basis}schrift/${v.schrift.datei})`);
      await schrift.load();
      document.fonts.add(schrift);
    }),
  );

  const raster = document.getElementById('raster')!;
  for (const v of VARIANTEN) {
    const karte = document.createElement('section');
    karte.className = 'variante';
    const titel = document.createElement('h2');
    titel.textContent = `Variante ${v.nummer}: «${v.name}»`;
    const canvas = document.createElement('canvas');
    canvas.width = BREITE;
    canvas.height = HOEHE;
    const anzahlFarben = new Set(Object.values(v.stil.farben)).size;
    const info = document.createElement('p');
    info.textContent = `${v.beschrieb} Schrift: ${v.schrift.name}. Farben: ${anzahlFarben}. Detailgrad: ${v.detailText}.`;
    const faktor = document.createElement('p');
    faktor.className = 'faktor';
    karte.append(titel, canvas, info, faktor);
    raster.append(karte);
    zeichneVariante(canvas, v);
  }
  passeGroesseAn();
  window.addEventListener('resize', passeGroesseAn);
  document.body.dataset.bereit = 'ja';
}

void start();
