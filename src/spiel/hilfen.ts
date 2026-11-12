import Phaser from 'phaser';
import { STIL } from '../grafik/bilder.ts';

// Gewähltes Design: Variante 1 «Werkhalle».
export const FARBEN = STIL.farben;

/**
 * Schrift im Spiel. Auf Alexanders Wunsch nicht pixelig, sondern scharf:
 * Sie wird in der vollen Auflösung des Bildschirms gezeichnet, die Grafik bleibt Pixelart.
 */
export const SCHRIFT = { name: 'Barlow Semi Condensed', familie: 'BarlowSemiCondensed', datei: 'barlow-semi-condensed-500.woff2', groesse: 9 };

export const BREITE = 320;
export const HOEHE = 180;

/** Aktueller ganzzahliger Vergrösserungsfaktor (Bildpunkte des Geräts pro Spielpixel). */
export const ansicht = { faktor: 1 };

export interface Rechteck {
  x: number;
  y: number;
  b: number;
  h: number;
}

export function trifft(r: Rechteck, x: number, y: number): boolean {
  return x >= r.x && x < r.x + r.b && y >= r.y && y < r.y + r.h;
}

export function farbzahl(hex: string): number {
  return parseInt(hex.slice(1), 16);
}

/** Zeichnet gefüllte Rechtecke mit Farben aus der Palette. */
export class Maler {
  constructor(readonly g: Phaser.GameObjects.Graphics) {}

  leeren(): void {
    this.g.clear();
  }

  r(x: number, y: number, b: number, h: number, hex: string, deckkraft = 1): void {
    if (b <= 0 || h <= 0) return;
    this.g.fillStyle(farbzahl(hex), deckkraft);
    this.g.fillRect(x, y, b, h);
  }

  rahmen(x: number, y: number, b: number, h: number, hex: string, dicke = 1): void {
    this.r(x, y, b, dicke, hex);
    this.r(x, y + h - dicke, b, dicke, hex);
    this.r(x, y, dicke, h, hex);
    this.r(x + b - dicke, y, dicke, h, hex);
  }

  balken(x: number, y: number, b: number, h: number, anteil: number, hex: string): void {
    this.r(x, y, b, h, FARBEN.umriss);
    this.r(x + 1, y + 1, b - 2, h - 2, FARBEN.maschineDunkel);
    this.r(x + 1, y + 1, Math.round((b - 2) * Math.max(0, Math.min(1, anteil))), h - 2, hex);
  }
}

export type Ausrichtung = 'links' | 'mitte' | 'rechts';

/** Legt eine Beschriftung an. Sie wird in der Auflösung des Bildschirms gezeichnet und bleibt darum scharf. */
export function schrift(szene: Phaser.Scene, x: number, y: number, inhalt: string, hex: string, ausrichtung: Ausrichtung = 'links', groesse = SCHRIFT.groesse): Phaser.GameObjects.Text {
  const t = szene.add.text(x, y, inhalt, {
    fontFamily: SCHRIFT.familie,
    fontSize: `${groesse}px`,
    color: hex,
    resolution: ansicht.faktor,
  });
  t.setOrigin(ausrichtung === 'links' ? 0 : ausrichtung === 'mitte' ? 0.5 : 1, 0);
  t.setDepth(5);
  return t;
}

/** Ändert Text und Farbe nur, wenn sie sich wirklich geändert haben (Text neu zu zeichnen ist teuer). */
export function setze(t: Phaser.GameObjects.Text, inhalt: string, hex?: string): void {
  if (t.text !== inhalt) t.setText(inhalt);
  if (hex && t.style.color !== hex) t.setColor(hex);
}

export function bild(szene: Phaser.Scene, x: number, y: number, name: string, tiefe = 1): Phaser.GameObjects.Image {
  return szene.add.image(x, y, name).setOrigin(0, 0).setDepth(tiefe);
}

/** Wechselt das Bild nur, wenn es sich geändert hat. */
export function setzeBild(b: Phaser.GameObjects.Image, name: string): void {
  if (b.texture.key !== name) b.setTexture(name);
}

/**
 * Richtet die Kamera einer Szene auf das Spielfeld 320 x 180 aus und hält sie bei jeder
 * Grössenänderung nach. Die Schrift wird dabei in der neuen Auflösung neu gezeichnet.
 */
export function richteAus(szene: Phaser.Scene): void {
  const anwenden = (): void => {
    const kamera = szene.cameras.main;
    kamera.setZoom(ansicht.faktor);
    kamera.centerOn(BREITE / 2, HOEHE / 2);
    for (const objekt of szene.children.list) {
      if (objekt instanceof Phaser.GameObjects.Text && objekt.style.resolution !== ansicht.faktor) objekt.setResolution(ansicht.faktor);
    }
  };
  anwenden();
  szene.scale.on('resize', anwenden);
  szene.events.once('shutdown', () => szene.scale.off('resize', anwenden));
}

export function minSek(sekunden: number): string {
  const s = Math.max(0, Math.ceil(sekunden - 1e-9));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
