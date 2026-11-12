import Phaser from 'phaser';
import { VARIANTEN } from '../designs/varianten';

// Gewähltes Design: Variante 1 «Werkhalle».
export const DESIGN = VARIANTEN[0];
export const FARBEN = DESIGN.stil.farben;
export const SCHRIFT = DESIGN.schrift;

export const BREITE = 320;
export const HOEHE = 180;

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

  r(x: number, y: number, b: number, h: number, hex: string): void {
    if (b <= 0 || h <= 0) return;
    this.g.fillStyle(farbzahl(hex), 1);
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

  knopf(k: Rechteck, hex: string, dunkel: string): void {
    this.r(k.x + 1, k.y, k.b - 2, k.h, FARBEN.umriss);
    this.r(k.x, k.y + 1, k.b, k.h - 2, FARBEN.umriss);
    this.r(k.x + 1, k.y + 1, k.b - 2, k.h - 2, hex);
    this.r(k.x + 1, k.y + k.h - 4, k.b - 2, 3, dunkel);
  }
}

export type Ausrichtung = 'links' | 'mitte' | 'rechts';

/** Legt eine Beschriftung in der Pixelschrift an. */
export function schrift(szene: Phaser.Scene, x: number, y: number, inhalt: string, hex: string, ausrichtung: Ausrichtung = 'links'): Phaser.GameObjects.Text {
  const t = szene.add.text(x, y, inhalt, {
    fontFamily: SCHRIFT.familie,
    fontSize: `${SCHRIFT.groesse}px`,
    color: hex,
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

export function minSek(sekunden: number): string {
  const s = Math.max(0, Math.ceil(sekunden - 1e-9));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
