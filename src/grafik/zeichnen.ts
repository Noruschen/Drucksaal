// Zeichenfunktionen für die Pixelart. Sie kennen weder Browser noch Phaser:
// Sie zeichnen nur Rechtecke auf eine «Leinwand». So kann dieselbe Zeichnung
// auf der Design-Testseite und später im PNG-Skript (Meilenstein M2) laufen.

export interface Leinwand {
  rechteck(x: number, y: number, b: number, h: number, farbe: string): void;
}

export interface Farben {
  wand: string;
  wandDunkel: string;
  fenster: string;
  boden: string;
  bodenFuge: string;
  markierung: string;
  maschine: string;
  maschineHell: string;
  maschineDunkel: string;
  umriss: string;
  akzent: string;
  /** Hautfarbe der Figur */
  haut: string;
  papier: string;
  papierSchatten: string;
  leiste: string;
  text: string;
  textAufPapier: string;
  textAufBoden: string;
  knopf: string;
  knopfHell: string;
  knopfDunkel: string;
  knopfText: string;
  c: string;
  m: string;
  y: string;
  k: string;
  gut: string;
  warnung: string;
  schlecht: string;
}

/** 0 = nur Flächen, 1 = mit Umriss und Farbmarken, 2 = mit Schatten und Fenstern, 3 = mit Lichtern und Hallendetails */
export type Detailgrad = 0 | 1 | 2 | 3;

export type Zustand = 'steht' | 'ruestet' | 'druckt';

export interface Stil {
  farben: Farben;
  detail: Detailgrad;
  umriss: boolean;
}

function signalfarbe(f: Farben, z: Zustand): string {
  return z === 'steht' ? f.schlecht : z === 'ruestet' ? f.warnung : f.gut;
}

/** Teil mit optionalem Umriss. */
function teil(l: Leinwand, s: Stil, x: number, y: number, b: number, h: number, farbe: string): void {
  if (s.umriss) l.rechteck(x - 1, y - 1, b + 2, h + 2, s.farben.umriss);
  l.rechteck(x, y, b, h, farbe);
}

export function zeichneHalle(l: Leinwand, s: Stil, breite: number, oben: number, bodenAb: number, unten: number): void {
  const f = s.farben;
  l.rechteck(0, oben, breite, bodenAb - oben, f.wand);
  l.rechteck(0, bodenAb, breite, unten - bodenAb, f.boden);
  if (s.detail >= 1) {
    l.rechteck(0, bodenAb - 3, breite, 3, f.wandDunkel);
    // Gelbe Bodenmarkierung des Fahrwegs
    l.rechteck(0, unten - 2, breite, 1, f.markierung);
  }
  if (s.detail >= 2) {
    // Fensterband und Stützen
    for (let x = 10; x < breite - 20; x += 52) {
      l.rechteck(x, oben + 6, 40, 9, f.fenster);
      l.rechteck(x + 19, oben + 6, 1, 9, f.wandDunkel);
    }
    for (let x = 0; x <= breite; x += 104) l.rechteck(x + 2, oben, 4, bodenAb - oben, f.wandDunkel);
    for (let x = 0; x < breite; x += 26) l.rechteck(x, bodenAb, 1, unten - bodenAb, f.bodenFuge);
    l.rechteck(0, bodenAb + 20, breite, 1, f.bodenFuge);
  }
  if (s.detail >= 3) {
    // Hallenlampen mit Lichtkegel
    for (let x = 56; x < breite; x += 104) {
      l.rechteck(x, oben, 1, 4, f.umriss);
      l.rechteck(x - 5, oben + 4, 11, 2, f.umriss);
      l.rechteck(x - 4, oben + 6, 9, 1, f.markierung);
    }
  }
}

/** Signallampe: steht rot, rüstet gelb blinkend, druckt grün. */
function lampe(f: Farben, z: Zustand, bild: number): string {
  if (z === 'steht') return f.schlecht;
  if (z === 'ruestet') return bild === 0 ? f.warnung : f.maschineDunkel;
  return f.gut;
}

export const DIGITAL_BREITE = 70;

/**
 * Digitaldruckmaschine von vorn: Papiermagazin, Druckmodul mit Bedienfeld, Auslage.
 * (x, y) ist die linke untere Ecke. Breite 70, Höhe 40. bild = 0 oder 1 (Bewegung).
 */
export function zeichneDigitaldruck(l: Leinwand, s: Stil, x: number, y: number, z: Zustand, bild = 0): void {
  const f = s.farben;
  const d = s.detail;
  if (d >= 2) l.rechteck(x - 1, y, 72, 2, f.bodenFuge);

  // Papiermagazin
  teil(l, s, x, y - 26, 20, 26, f.maschine);
  if (d >= 1) {
    l.rechteck(x + 2, y - 18, 16, 1, f.maschineDunkel);
    l.rechteck(x + 2, y - 10, 16, 1, f.maschineDunkel);
    l.rechteck(x + 8, y - 15, 4, 1, f.maschineDunkel);
    l.rechteck(x + 8, y - 7, 4, 1, f.maschineDunkel);
  }
  if (z === 'ruestet' && bild === 1) {
    // Schublade offen: Papier nachlegen
    l.rechteck(x + 2, y - 17, 16, 6, f.maschineHell);
    l.rechteck(x + 3, y - 16, 14, 2, f.papier);
  }

  // Druckmodul
  teil(l, s, x + 20, y - 30, 30, 30, f.maschine);
  if (d >= 2) {
    l.rechteck(x + 24, y - 24, 16, 9, f.maschineDunkel);
    if (z === 'druckt') l.rechteck(x + 25 + (bild === 0 ? 1 : 8), y - 23, 5, 7, f.akzent);
    else l.rechteck(x + 25, y - 23, 14, 1, f.akzent);
  }
  if (d >= 1) {
    const marken = [f.c, f.m, f.y, f.k];
    marken.forEach((farbe, i) => l.rechteck(x + 24 + i * 5, y - 9, 3, 4, farbe));
    l.rechteck(x + 44, y - 27, 3, 3, lampe(f, z, bild));
  }
  // Bedienfeld auf Ständer
  teil(l, s, x + 37, y - 39, 12, 8, f.maschineDunkel);
  l.rechteck(x + 38, y - 38, 10, 6, z === 'steht' ? f.maschineDunkel : z === 'ruestet' && bild === 1 ? f.fenster : f.akzent);
  l.rechteck(x + 42, y - 31, 2, 1, f.maschineDunkel);

  // Auslage
  teil(l, s, x + 50, y - 22, 20, 22, f.maschine);
  l.rechteck(x + 52, y - 19, 16, 11, f.maschineDunkel);
  const stapel = z === 'druckt' ? 4 + bild : 2;
  l.rechteck(x + 53, y - 9 - stapel, 14, stapel, f.papier);
  l.rechteck(x + 52, y - 9, 16, 1, f.maschineHell);
  if (z === 'druckt' && bild === 0) l.rechteck(x + 53, y - 18, 9, 1, f.papier);

  if (d >= 2) {
    l.rechteck(x, y - 26, 20, 1, f.maschineHell);
    l.rechteck(x + 20, y - 30, 30, 1, f.maschineHell);
    l.rechteck(x + 50, y - 22, 20, 1, f.maschineHell);
    l.rechteck(x + 19, y - 25, 1, 25, f.maschineDunkel);
    l.rechteck(x + 49, y - 21, 1, 21, f.maschineDunkel);
    l.rechteck(x, y - 2, 70, 2, f.maschineDunkel);
  }
  if (d >= 3) {
    l.rechteck(x + 3, y - 23, 6, 1, f.maschineHell);
    l.rechteck(x + 39, y - 37, 3, 1, f.papier);
  }
}

export interface Offsetmasse {
  werke: number;
  werkBreite: number;
  werkHoehe: number;
  leitstandBreite: number;
  auslageBreite: number;
  auslageHoehe: number;
  tischBreite: number;
  anlegerBreite: number;
  anlegerHoehe: number;
}

export const SM52: Offsetmasse = { werke: 4, werkBreite: 10, werkHoehe: 25, leitstandBreite: 8, auslageBreite: 14, auslageHoehe: 16, tischBreite: 3, anlegerBreite: 12, anlegerHoehe: 17 };
export const RA76: Offsetmasse = { werke: 4, werkBreite: 13, werkHoehe: 34, leitstandBreite: 9, auslageBreite: 20, auslageHoehe: 21, tischBreite: 4, anlegerBreite: 14, anlegerHoehe: 23 };

export function offsetBreite(m: Offsetmasse): number {
  return m.leitstandBreite + 1 + m.auslageBreite + m.werke * m.werkBreite + m.tischBreite + m.anlegerBreite;
}

/**
 * Bogenoffsetmaschine von der Seite, von links nach rechts: Leitstand, Auslage,
 * Druckwerke (Gelb, Magenta, Cyan, Schwarz), Anlagetisch, Anleger. Der Bogen läuft von rechts nach links.
 * (x, y) ist die linke untere Ecke. bild = 0 oder 1 (Bewegung).
 */
export function zeichneOffset(l: Leinwand, s: Stil, x: number, y: number, m: Offsetmasse, z: Zustand, bild = 0): void {
  const f = s.farben;
  const d = s.detail;
  const gesamt = offsetBreite(m);
  if (d >= 2) l.rechteck(x - 1, y, gesamt + 2, 2, f.bodenFuge);

  // Leitstand: Pult mit Bildschirm
  const lb = m.leitstandBreite;
  teil(l, s, x, y - 11, lb, 11, f.maschine);
  l.rechteck(x, y - 11, lb, 2, d >= 2 ? f.maschineHell : f.maschine);
  teil(l, s, x + 1, y - 19, lb - 2, 6, f.maschineDunkel);
  l.rechteck(x + 2, y - 18, lb - 4, 4, z === 'steht' ? f.maschineDunkel : bild === 0 ? f.akzent : f.fenster);
  l.rechteck(x + Math.floor(lb / 2), y - 13, 1, 2, f.maschineDunkel);

  // Auslage mit Bogenstapel, Kettenführung steigt zum letzten Druckwerk an
  const ax = x + lb + 1;
  const ab = m.auslageBreite;
  const ah = m.auslageHoehe;
  teil(l, s, ax, y - ah, ab, ah, f.maschine);
  teil(l, s, ax + ab - 7, y - ah - 4, 7, 4, f.maschine);
  l.rechteck(ax + 2, y - ah + 4, ab - 5, ah - 7, f.maschineDunkel);
  const stapel = z === 'druckt' ? Math.floor((ah - 9) * 0.6) + bild : 3;
  l.rechteck(ax + 3, y - 3 - stapel, ab - 7, stapel, f.papier);
  if (d >= 2) for (let i = 2; i < stapel; i += 2) l.rechteck(ax + 3, y - 3 - i, ab - 7, 1, f.papierSchatten);
  l.rechteck(ax + 2, y - 3, ab - 5, 1, f.maschineHell);
  if (z === 'druckt') l.rechteck(ax + 3 + (bild === 0 ? 4 : 1), y - ah + 5, 6, 1, f.papier);
  if (d >= 1) l.rechteck(ax + 2, y - ah - 3, 2, 3, lampe(f, z, bild));
  if (d >= 2) l.rechteck(ax, y - ah, ab - 7, 1, f.maschineHell);

  // Druckwerke: Unterbau mit Zylindern, darüber das Farbwerk
  const marken = [f.y, f.m, f.c, f.k];
  const wx0 = ax + ab;
  const wh = m.werkHoehe;
  const unterbau = Math.floor(wh * 0.5);
  for (let i = 0; i < m.werke; i++) {
    const wx = wx0 + i * m.werkBreite;
    const wb = m.werkBreite - 1;
    teil(l, s, wx, y - unterbau, wb, unterbau, f.maschine);
    teil(l, s, wx + 2, y - wh, wb - 2, wh - unterbau, f.maschine);
    teil(l, s, wx + 3, y - wh - 2, wb - 4, 2, f.maschine);
    l.rechteck(wx + wb, y - unterbau + 2, 1, unterbau - 2, f.maschineDunkel);
    if (d >= 1) l.rechteck(wx + 4, y - wh + 2, wb - 6, 2, marken[i % 4]);
    if (d >= 2) {
      l.rechteck(wx + 2, y - wh, 1, wh - unterbau, f.maschineHell);
      l.rechteck(wx, y - unterbau, 2, 1, f.maschineHell);
      l.rechteck(wx + wb - 1, y - wh + 1, 1, wh - 1, f.maschineDunkel);
      // Schutz am Farbwerk: beim Rüsten abwechselnd offen (Plattenwechsel)
      const offen = z === 'ruestet' && i % 2 === bild;
      const sh = wh - unterbau - 8;
      l.rechteck(wx + 4, y - wh + 6, wb - 6, sh, offen ? f.fenster : f.maschineDunkel);
      if (offen) l.rechteck(wx + 4, y - wh + 6 + Math.floor(sh / 2), wb - 6, 1, f.akzent);
      // Zwei Zylinder im Unterbau, beim Drucken drehen sie
      const zy = y - unterbau + 3;
      const zg = Math.min(4, wb - 6);
      l.rechteck(wx + 2, zy, zg, zg, f.maschineDunkel);
      l.rechteck(wx + wb - zg - 2, zy + zg + 1, zg, zg, f.maschineDunkel);
      if (z === 'druckt') {
        l.rechteck(wx + 2 + (bild === 0 ? 0 : zg - 1), zy + (bild === 0 ? 0 : zg - 1), 1, 1, f.maschineHell);
        l.rechteck(wx + wb - zg - 2 + (bild === 0 ? zg - 1 : 0), zy + zg + 1 + (bild === 0 ? 0 : zg - 1), 1, 1, f.maschineHell);
      }
    }
    if (d >= 3) {
      l.rechteck(wx, y - 4, wb, 1, f.maschineDunkel);
      l.rechteck(wx + 4, y - wh - 2, wb - 7, 1, f.maschineHell);
    }
  }

  // Anlagetisch
  const tx = wx0 + m.werke * m.werkBreite;
  const tb = m.tischBreite;
  const nh = m.anlegerHoehe;
  teil(l, s, tx, y - nh + 4, tb, nh - 4, f.maschine);
  l.rechteck(tx - 1, y - nh + 3, tb + 2, 2, f.maschineDunkel);
  if (z === 'druckt') l.rechteck(tx - 1 + bild, y - nh + 2, tb + 1, 1, f.papier);

  // Anleger mit Bogenstapel und Saugkopf
  const nx = tx + tb;
  const nb = m.anlegerBreite;
  teil(l, s, nx, y - nh, nb, nh, f.maschine);
  l.rechteck(nx + 2, y - nh + 4, nb - 4, nh - 7, f.maschineDunkel);
  const vorrat = nh - 10 - (z === 'druckt' ? 3 + bild : 0);
  l.rechteck(nx + 3, y - 3 - vorrat, nb - 6, vorrat, f.papier);
  if (d >= 2) for (let i = 2; i < vorrat; i += 2) l.rechteck(nx + 3, y - 3 - i, nb - 6, 1, f.papierSchatten);
  l.rechteck(nx + 2, y - 3, nb - 4, 1, f.maschineHell);
  teil(l, s, nx + 1, y - nh - 3, nb - 5, 3, f.maschineDunkel);
  if (d >= 2) {
    l.rechteck(nx, y - nh, nb, 1, f.maschineHell);
    l.rechteck(ax, y - 2, gesamt - lb - 1, 2, f.maschineDunkel);
  }
}

/** Symbol für die Farbigkeit: zwei Bogen (Schön- und Widerdruckseite). Grösse 17 x 9. */
export function zeichneFarbigkeit(l: Leinwand, f: Farben, x: number, y: number, beidseitig: boolean): void {
  const bogen = (bx: number, bedruckt: boolean): void => {
    l.rechteck(bx, y, 8, 9, f.umriss);
    l.rechteck(bx + 1, y + 1, 6, 7, f.papier);
    if (bedruckt) {
      l.rechteck(bx + 2, y + 2, 2, 2, f.c);
      l.rechteck(bx + 4, y + 2, 2, 2, f.m);
      l.rechteck(bx + 2, y + 5, 2, 2, f.y);
      l.rechteck(bx + 4, y + 5, 2, 2, f.k);
    }
  };
  bogen(x, true);
  bogen(x + 9, beidseitig);
}

/** Uhr, 9 x 9. */
export function zeichneUhr(l: Leinwand, f: Farben, x: number, y: number, rand: string, flaeche: string): void {
  l.rechteck(x + 2, y, 5, 9, rand);
  l.rechteck(x, y + 2, 9, 5, rand);
  l.rechteck(x + 1, y + 1, 7, 7, rand);
  l.rechteck(x + 2, y + 1, 5, 7, flaeche);
  l.rechteck(x + 1, y + 2, 7, 5, flaeche);
  l.rechteck(x + 4, y + 2, 1, 3, rand);
  l.rechteck(x + 4, y + 4, 3, 1, rand);
  void f;
}

/** Lauftasche ohne Beschriftung, 76 x 48. */
export function zeichneLauftasche(l: Leinwand, s: Stil, x: number, y: number): void {
  const f = s.farben;
  // Lasche oben
  l.rechteck(x + 6, y, 30, 6, f.umriss);
  l.rechteck(x + 7, y + 1, 28, 5, f.papierSchatten);
  // Tasche
  l.rechteck(x, y + 5, 76, 43, f.umriss);
  l.rechteck(x + 1, y + 6, 74, 41, f.papier);
  if (s.detail >= 1) l.rechteck(x + 1, y + 18, 74, 1, f.papierSchatten);
  if (s.detail >= 2) {
    l.rechteck(x + 1, y + 45, 74, 2, f.papierSchatten);
    l.rechteck(x + 73, y + 6, 2, 41, f.papierSchatten);
  }
  if (s.detail >= 3) {
    // Lochung und Klarsichtfenster
    l.rechteck(x + 66, y + 9, 3, 3, f.umriss);
    l.rechteck(x + 40, y + 1, 10, 1, f.papierSchatten);
  }
}

/** Schaltfläche ohne Beschriftung. */
export function zeichneSchaltflaeche(l: Leinwand, s: Stil, x: number, y: number, b: number, h: number): void {
  const f = s.farben;
  l.rechteck(x + 1, y, b - 2, h, f.umriss);
  l.rechteck(x, y + 1, b, h - 2, f.umriss);
  l.rechteck(x + 1, y + 1, b - 2, h - 2, f.knopf);
  if (s.detail >= 1) l.rechteck(x + 1, y + h - 4, b - 2, 3, f.knopfDunkel);
  if (s.detail >= 2) l.rechteck(x + 2, y + 1, b - 4, 1, f.knopfHell);
}

/** Fortschrittsbalken. */
export function zeichneBalken(l: Leinwand, f: Farben, x: number, y: number, b: number, h: number, anteil: number, farbe: string): void {
  l.rechteck(x, y, b, h, f.umriss);
  l.rechteck(x + 1, y + 1, b - 2, h - 2, f.maschineDunkel);
  l.rechteck(x + 1, y + 1, Math.round((b - 2) * anteil), h - 2, farbe);
}

/**
 * Drucker (Figur), 10 x 16. bild: 0 = steht, 1 und 2 = geht. traegt = hält eine Lauftasche.
 * Die Figur schaut nach rechts, für links wird das Bild im Spiel gespiegelt.
 */
export function zeichneDrucker(l: Leinwand, f: Farben, x: number, y: number, bild: number, traegt: boolean): void {
  // Kopf mit Mütze
  l.rechteck(x + 3, y, 4, 1, f.umriss);
  l.rechteck(x + 2, y + 1, 6, 1, f.umriss);
  l.rechteck(x + 3, y + 2, 4, 3, f.haut);
  l.rechteck(x + 6, y + 3, 1, 1, f.umriss);
  // Arbeitskleid
  l.rechteck(x + 2, y + 5, 6, 6, f.knopfDunkel);
  l.rechteck(x + 3, y + 5, 4, 1, f.knopf);
  // Arme
  if (traegt) {
    l.rechteck(x + 6, y + 6, 3, 2, f.knopfDunkel);
    l.rechteck(x + 5, y + 4, 5, 5, f.umriss);
    l.rechteck(x + 6, y + 5, 3, 3, f.papier);
    l.rechteck(x + 8, y + 8, 1, 1, f.haut);
  } else {
    l.rechteck(x + 1, y + 6, 1, 4, f.knopfDunkel);
    l.rechteck(x + 8, y + 6, 1, 4, f.knopfDunkel);
    l.rechteck(x + 1, y + 10, 1, 1, f.haut);
    l.rechteck(x + 8, y + 10, 1, 1, f.haut);
  }
  // Beine
  if (bild === 1) {
    l.rechteck(x + 2, y + 11, 2, 4, f.umriss);
    l.rechteck(x + 6, y + 11, 2, 4, f.umriss);
    l.rechteck(x + 1, y + 15, 3, 1, f.umriss);
    l.rechteck(x + 6, y + 15, 3, 1, f.umriss);
  } else if (bild === 2) {
    l.rechteck(x + 4, y + 11, 2, 4, f.umriss);
    l.rechteck(x + 4, y + 15, 3, 1, f.umriss);
  } else {
    l.rechteck(x + 3, y + 11, 2, 4, f.umriss);
    l.rechteck(x + 5, y + 11, 2, 4, f.umriss);
    l.rechteck(x + 2, y + 15, 3, 1, f.umriss);
    l.rechteck(x + 5, y + 15, 3, 1, f.umriss);
  }
}

/** Symbol für den Home-Bildschirm: Bogen mit den vier Druckfarben. Quadrat mit Kantenlänge g (mindestens 32). */
export function zeichneSymbol(l: Leinwand, f: Farben, g: number): void {
  const r = Math.floor((g - 32) / 2);
  l.rechteck(0, 0, g, g, f.leiste);
  l.rechteck(r + 6, r + 3, 20, 26, f.umriss);
  l.rechteck(r + 7, r + 4, 18, 24, f.papier);
  l.rechteck(r + 9, r + 6, 6, 6, f.c);
  l.rechteck(r + 17, r + 6, 6, 6, f.m);
  l.rechteck(r + 9, r + 14, 6, 6, f.y);
  l.rechteck(r + 17, r + 14, 6, 6, f.k);
  l.rechteck(r + 9, r + 23, 14, 2, f.papierSchatten);
}
