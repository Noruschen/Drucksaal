// Erzeugt alle Grafiken des Spiels als PNG-Dateien in public/grafik/ und schreibt die Bilderliste.
// Aufruf: npm run grafik
// Braucht keine zusätzliche Bibliothek: Das PNG-Format wird mit Bordmitteln von Node.js geschrieben.

import { deflateSync, crc32 } from 'node:zlib';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BILDER, STIL } from '../src/grafik/bilder.ts';
import type { Leinwand } from '../src/grafik/zeichnen.ts';

const ziel = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'grafik');
mkdirSync(ziel, { recursive: true });

function block(art: string, daten: Buffer): Buffer {
  const laenge = Buffer.alloc(4);
  laenge.writeUInt32BE(daten.length);
  const inhalt = Buffer.concat([Buffer.from(art, 'ascii'), daten]);
  const pruefsumme = Buffer.alloc(4);
  pruefsumme.writeUInt32BE(crc32(inhalt) >>> 0);
  return Buffer.concat([laenge, inhalt, pruefsumme]);
}

function png(breite: number, hoehe: number, rgba: Uint8Array): Buffer {
  const kopf = Buffer.alloc(13);
  kopf.writeUInt32BE(breite, 0);
  kopf.writeUInt32BE(hoehe, 4);
  kopf[8] = 8; // 8 Bit pro Kanal
  kopf[9] = 6; // Farbe mit Transparenz
  const zeilen = Buffer.alloc((breite * 4 + 1) * hoehe);
  for (let y = 0; y < hoehe; y++) {
    Buffer.from(rgba.buffer, y * breite * 4, breite * 4).copy(zeilen, y * (breite * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    block('IHDR', kopf),
    block('IDAT', deflateSync(zeilen, { level: 9 })),
    block('IEND', Buffer.alloc(0)),
  ]);
}

const erlaubt = new Set(Object.values(STIL.farben).map((f) => f.toLowerCase()));
const zusatz = new Set<string>();
const zeilen: string[] = [];

for (const bild of BILDER) {
  const datei = join(ziel, `${bild.name}.png`);
  zeilen.push(`| ${bild.name}.png | ${bild.breite * (bild.massstab ?? 1)} x ${bild.hoehe * (bild.massstab ?? 1)} | ${bild.beschrieb} | ${bild.vonHand ? 'von Hand gezeichnet' : 'Skript'} |`);
  if (bild.vonHand && existsSync(datei)) continue;
  const rgba = new Uint8Array(bild.breite * bild.hoehe * 4);
  const leinwand: Leinwand = {
    rechteck(x, y, b, h, farbe) {
      if (!erlaubt.has(farbe.toLowerCase())) zusatz.add(farbe.toLowerCase());
      const n = parseInt(farbe.slice(1), 16);
      for (let py = Math.max(0, y); py < Math.min(bild.hoehe, y + h); py++) {
        for (let px = Math.max(0, x); px < Math.min(bild.breite, x + b); px++) {
          const i = (py * bild.breite + px) * 4;
          rgba[i] = (n >> 16) & 255;
          rgba[i + 1] = (n >> 8) & 255;
          rgba[i + 2] = n & 255;
          rgba[i + 3] = 255;
        }
      }
    },
  };
  bild.zeichne(leinwand);
  const n = bild.massstab ?? 1;
  if (n === 1) {
    writeFileSync(datei, png(bild.breite, bild.hoehe, rgba));
  } else {
    // Ganzzahlig vergrössern, jeder Pixel wird zu einem Quadrat aus n mal n Pixeln.
    const gross = new Uint8Array(bild.breite * n * bild.hoehe * n * 4);
    for (let y = 0; y < bild.hoehe * n; y++) {
      for (let x = 0; x < bild.breite * n; x++) {
        const von = (Math.floor(y / n) * bild.breite + Math.floor(x / n)) * 4;
        gross.set(rgba.subarray(von, von + 4), (y * bild.breite * n + x) * 4);
      }
    }
    writeFileSync(datei, png(bild.breite * n, bild.hoehe * n, gross));
  }
}

const palette = [...erlaubt].sort();
const liste = [
  '# Bilderliste',
  '',
  'Alle Bilder liegen in diesem Ordner als PNG mit transparentem Hintergrund, ohne Kantenglättung.',
  'Erzeugt mit `npm run grafik` aus `src/grafik/bilder.ts` und `src/grafik/zeichnen.ts`.',
  '',
  'Ein Bild selbst zeichnen: PNG mit gleichem Namen und gleicher Grösse in diesen Ordner legen',
  'und in `src/grafik/bilder.ts` beim Bild `vonHand: true` eintragen. Dann überschreibt das Skript es nicht mehr.',
  'Die Maschinen stehen unten in der Mitte des Bildes, die unterste Pixelreihe ist der Schatten am Boden.',
  '',
  '| Datei | Grösse in Pixeln | Inhalt | Herkunft |',
  '|---|---|---|---|',
  ...zeilen,
  '',
  '## Farbpalette «Werkhalle»',
  '',
  palette.map((f) => `\`${f}\``).join(' '),
  '',
  zusatz.size > 0 ? `Zusatzfarben für einzelne Zustände (abgelaufene Lauftasche, grüne und graue Schaltfläche): ${[...zusatz].sort().map((f) => `\`${f}\``).join(' ')}` : '',
  '',
];
writeFileSync(join(ziel, 'BILDERLISTE.md'), liste.join('\n'));
console.log(`${BILDER.length} Bilder geschrieben nach ${ziel}`);
