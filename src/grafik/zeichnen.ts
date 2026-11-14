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

// ---------------------------------------------------------------------------
// Maschinen nach Alexanders Fotos (13.11.2026): RA 76 anthrazit mit hohen weissen
// Rahmen und schwarzem Glas auf dunklem Podest, SM 52 silbern mit dunklem Sockel,
// Digitaldruck weiss mit dunkler Front. Ohne Herstellerlogos.
// ---------------------------------------------------------------------------

/** Feste Farben der Maschinen. Sie gehören zur Palette «Werkhalle». */
export const MF = {
  anthrazit: '#3b4148',
  anthrazitHell: '#525a63',
  anthrazitDunkel: '#262a30',
  glas: '#14181d',
  glasGlanz: '#3d4855',
  rahmen: '#f1f0ea',
  podest: '#434a54',
  podestHell: '#5b6470',
  silber: '#c9ced3',
  silberHell: '#e6e9ec',
  silberDunkel: '#8f979f',
  weiss: '#f4f5f6',
  schatten: '#7b8695',
  blau: '#3fa7d6',
  papier: '#fbfbf6',
  papierSchatten: '#cfd3d0',
  c: '#1aa7e0',
  m: '#d93a8a',
  y: '#f4d51e',
  k: '#20242e',
  gut: '#49b35a',
  warnung: '#f2a530',
  schlecht: '#d94a3d',
} as const;

function lampeEcht(z: Zustand, bild: number): string {
  if (z === 'steht') return MF.schlecht;
  if (z === 'ruestet') return bild === 0 ? MF.warnung : MF.anthrazitDunkel;
  return MF.gut;
}

function stapel(l: Leinwand, x: number, y: number, b: number, h: number): void {
  l.rechteck(x, y - h, b, h, MF.papier);
  for (let i = 2; i < h; i += 2) l.rechteck(x, y - i, b, 1, MF.papierSchatten);
}

/** Leitstand: Pult mit grossem Bildschirm, darauf der Bogen. Breite b, (x, y) links unten. */
function leitstandEcht(l: Leinwand, x: number, y: number, b: number, z: Zustand, bild: number): void {
  l.rechteck(x, y - 11, b, 11, MF.anthrazitDunkel);
  l.rechteck(x, y - 11, b, 1, MF.anthrazitHell);
  // Bogen auf dem Pult
  l.rechteck(x + 2, y - 12, 2, 1, MF.c);
  l.rechteck(x + 4, y - 12, 2, 1, MF.y);
  l.rechteck(x + 6, y - 12, 2, 1, MF.m);
  // Bildschirm
  l.rechteck(x + 1, y - 23, b - 2, 9, MF.anthrazit);
  l.rechteck(x + 2, y - 22, b - 4, 7, z === 'steht' ? MF.glas : MF.weiss);
  if (z !== 'steht') {
    l.rechteck(x + 3, y - 21 + bild, 2, 2, MF.c);
    l.rechteck(x + 5, y - 20 - bild + 1, 2, 2, MF.m);
    l.rechteck(x + 3, y - 18, b - 6, 1, MF.gut);
  }
}

export const RA76_BREITE = 98;

/**
 * RA 76 von der Bedienseite: Leitstand, Auslage (silbern mit blauem Lichtband), vier Druckwerke
 * (anthrazit, hoher weisser Rahmen mit schwarzem Glas) auf dunklem Podest, Anleger.
 * Der Bogen läuft von rechts nach links. (x, y) links unten, bild = 0 oder 1.
 */
export function zeichneRA76(l: Leinwand, x: number, y: number, z: Zustand, bild = 0): void {
  l.rechteck(x - 1, y, RA76_BREITE + 2, 2, MF.schatten);
  leitstandEcht(l, x, y, 11, z, bild);

  // Auslage
  const ax = x + 13;
  l.rechteck(ax, y - 27, 18, 24, MF.silber);
  l.rechteck(ax, y - 27, 18, 1, MF.silberHell);
  l.rechteck(ax, y - 13, 18, 10, MF.anthrazitDunkel);
  l.rechteck(ax + 2, y - 12, 14, 8, MF.glas);
  stapel(l, ax + 3, y - 4, 12, z === 'druckt' ? 4 + bild : 2);
  if (z === 'druckt') l.rechteck(ax + 3 + (bild === 0 ? 5 : 1), y - 11, 6, 1, MF.papier);
  l.rechteck(ax + 14, y - 25, 1, 10, z === 'steht' ? MF.silberDunkel : MF.blau);
  l.rechteck(ax + 2, y - 25, 3, 3, lampeEcht(z, bild));
  l.rechteck(ax + 17, y - 26, 1, 23, MF.silberDunkel);

  // Druckwerke auf dem Podest
  const marken = [MF.y, MF.m, MF.c, MF.k];
  for (let i = 0; i < 4; i++) {
    const ux = ax + 18 + i * 13;
    l.rechteck(ux, y - 37, 13, 34, MF.anthrazit);
    l.rechteck(ux, y - 37, 13, 1, MF.anthrazitHell);
    l.rechteck(ux + 12, y - 36, 1, 33, MF.anthrazitDunkel);
    // Weisser Rahmen mit runden Ecken, darin das schwarze Glas
    l.rechteck(ux + 2, y - 35, 9, 30, MF.rahmen);
    l.rechteck(ux + 2, y - 35, 1, 1, MF.anthrazit);
    l.rechteck(ux + 10, y - 35, 1, 1, MF.anthrazit);
    l.rechteck(ux + 2, y - 6, 1, 1, MF.anthrazit);
    l.rechteck(ux + 10, y - 6, 1, 1, MF.anthrazit);
    l.rechteck(ux + 3, y - 34, 7, 28, MF.glas);
    l.rechteck(ux + 4, y - 32, 5, 2, marken[i]);
    l.rechteck(ux + 10, y - 21, 1, 1, MF.anthrazitDunkel);
    if (z === 'ruestet' && i % 2 === bild) {
      // Schutz offen: Plattenwechsel
      l.rechteck(ux + 3, y - 27, 7, 12, MF.anthrazitHell);
      l.rechteck(ux + 3, y - 22, 7, 1, MF.blau);
    } else if (z === 'druckt') {
      // Spiegelung wandert über das Glas
      const versatz = (i + bild) % 2 === 0 ? 0 : 6;
      l.rechteck(ux + 4, y - 27 + versatz, 1, 5, MF.glasGlanz);
      l.rechteck(ux + 5, y - 25 + versatz, 1, 5, MF.glasGlanz);
    } else {
      l.rechteck(ux + 4, y - 26, 1, 8, MF.glasGlanz);
    }
  }

  // Anleger
  const nx = ax + 18 + 52;
  l.rechteck(nx, y - 27, 15, 27, MF.anthrazit);
  l.rechteck(nx, y - 27, 15, 1, MF.anthrazitHell);
  l.rechteck(nx + 2, y - 23, 11, 20, MF.glas);
  stapel(l, nx + 3, y - 3, 9, z === 'druckt' ? 12 - bild : 16);
  l.rechteck(nx + 1, y - 30, 10, 3, MF.anthrazitDunkel);
  if (z === 'druckt') l.rechteck(nx - 1 + bild, y - 24, 4, 1, MF.papier);

  // Podest unter Auslage und Druckwerken
  l.rechteck(ax - 1, y - 3, 72, 3, MF.podest);
  l.rechteck(ax - 1, y - 3, 72, 1, MF.podestHell);
}

export const SM52_BREITE = 76;

/** SM 52 von der Seite: Leitstand, Auslage, vier Druckwerke (silbern, dunkler Sockel), Anleger. */
export function zeichneSM52(l: Leinwand, x: number, y: number, z: Zustand, bild = 0): void {
  l.rechteck(x - 1, y, SM52_BREITE + 2, 2, MF.schatten);
  // Kleines Pult mit Bildschirm
  l.rechteck(x, y - 10, 9, 10, MF.silberDunkel);
  l.rechteck(x, y - 10, 9, 1, MF.silberHell);
  l.rechteck(x + 1, y - 18, 7, 6, MF.anthrazit);
  l.rechteck(x + 2, y - 17, 5, 4, z === 'steht' ? MF.glas : bild === 0 ? MF.blau : MF.weiss);
  l.rechteck(x + 4, y - 12, 1, 2, MF.anthrazit);

  // Auslage
  const ax = x + 10;
  l.rechteck(ax, y - 18, 14, 18, MF.silber);
  l.rechteck(ax, y - 18, 14, 1, MF.silberHell);
  l.rechteck(ax + 8, y - 22, 6, 4, MF.silber);
  l.rechteck(ax, y - 5, 14, 5, MF.anthrazit);
  l.rechteck(ax + 2, y - 15, 10, 10, MF.glas);
  stapel(l, ax + 3, y - 5, 8, z === 'druckt' ? 4 + bild : 2);
  if (z === 'druckt') l.rechteck(ax + 3 + (bild === 0 ? 3 : 0), y - 14, 5, 1, MF.papier);
  l.rechteck(ax + 2, y - 21, 2, 3, lampeEcht(z, bild));

  // Druckwerke
  const marken = [MF.y, MF.m, MF.c, MF.k];
  for (let i = 0; i < 4; i++) {
    const ux = ax + 14 + i * 10;
    l.rechteck(ux, y - 25, 10, 25, MF.silber);
    l.rechteck(ux + 1, y - 27, 8, 2, MF.silberHell);
    l.rechteck(ux, y - 25, 1, 18, MF.silberHell);
    l.rechteck(ux + 9, y - 25, 1, 25, MF.silberDunkel);
    l.rechteck(ux, y - 7, 10, 7, MF.anthrazit);
    l.rechteck(ux + 2, y - 23, 6, 2, marken[i]);
    const offen = z === 'ruestet' && i % 2 === bild;
    l.rechteck(ux + 2, y - 19, 6, 10, offen ? MF.glas : MF.silberDunkel);
    if (offen) l.rechteck(ux + 2, y - 15, 6, 1, MF.blau);
    else if (z === 'druckt') l.rechteck(ux + 3 + ((i + bild) % 2) * 3, y - 17, 1, 6, MF.silberHell);
    else l.rechteck(ux + 3, y - 17, 1, 6, MF.silber);
    l.rechteck(ux + 2, y - 4, 6, 1, MF.anthrazitHell);
  }

  // Anleger
  const nx = ax + 14 + 40;
  l.rechteck(nx, y - 19, 12, 19, MF.silber);
  l.rechteck(nx, y - 19, 12, 1, MF.silberHell);
  l.rechteck(nx, y - 5, 12, 5, MF.anthrazit);
  l.rechteck(nx + 2, y - 16, 8, 11, MF.glas);
  stapel(l, nx + 3, y - 5, 6, z === 'druckt' ? 6 - bild : 9);
  l.rechteck(nx + 1, y - 22, 8, 3, MF.anthrazit);
  if (z === 'druckt') l.rechteck(nx - 2 + bild, y - 17, 4, 1, MF.papier);
}

export const DIGITAL_ECHT_BREITE = 72;

/** Digitaldruckmaschine von vorn: Papiermagazin, Druckmodul (weiss mit dunkler Front, Bedienfeld), Stapelauslage. */
export function zeichneDigital(l: Leinwand, x: number, y: number, z: Zustand, bild = 0): void {
  l.rechteck(x - 1, y, DIGITAL_ECHT_BREITE + 2, 2, MF.schatten);

  // Papiermagazin mit Schubladen
  l.rechteck(x, y - 27, 20, 27, MF.weiss);
  l.rechteck(x, y - 27, 20, 2, MF.anthrazit);
  l.rechteck(x + 19, y - 25, 1, 25, MF.silber);
  for (const sy of [19, 12, 5]) {
    l.rechteck(x + 2, y - sy, 16, 1, MF.silberDunkel);
    l.rechteck(x + 8, y - sy + 2, 4, 1, MF.silberDunkel);
  }
  if (z === 'ruestet' && bild === 1) {
    l.rechteck(x + 2, y - 18, 16, 5, MF.silber);
    l.rechteck(x + 3, y - 17, 14, 2, MF.papier);
  }

  // Druckmodul: unten weiss, oben dunkle Front mit blauem Band
  const dx = x + 21;
  l.rechteck(dx, y - 32, 30, 32, MF.weiss);
  l.rechteck(dx, y - 32, 30, 13, MF.anthrazit);
  l.rechteck(dx, y - 20, 30, 1, z === 'steht' ? MF.anthrazitHell : MF.blau);
  l.rechteck(dx + 3, y - 29, 16, 7, MF.glas);
  if (z === 'druckt') l.rechteck(dx + 4 + (bild === 0 ? 0 : 8), y - 28, 6, 5, MF.glasGlanz);
  l.rechteck(dx + 24, y - 30, 3, 3, lampeEcht(z, bild));
  [MF.c, MF.m, MF.y, MF.k].forEach((farbe, i) => l.rechteck(dx + 4 + i * 5, y - 15, 3, 4, farbe));
  l.rechteck(dx + 2, y - 8, 26, 1, MF.silber);
  l.rechteck(dx + 12, y - 6, 6, 1, MF.silberDunkel);
  l.rechteck(dx + 29, y - 18, 1, 18, MF.silber);
  // Bedienfeld auf Arm
  l.rechteck(dx + 19, y - 41, 11, 8, MF.anthrazitDunkel);
  l.rechteck(dx + 20, y - 40, 9, 6, z === 'steht' ? MF.glas : z === 'ruestet' && bild === 1 ? MF.weiss : MF.blau);
  l.rechteck(dx + 24, y - 33, 2, 1, MF.anthrazitDunkel);

  // Stapelauslage
  const sx = x + 52;
  l.rechteck(sx, y - 24, 20, 24, MF.weiss);
  l.rechteck(sx, y - 24, 20, 2, MF.anthrazit);
  l.rechteck(sx + 2, y - 20, 16, 13, MF.glas);
  stapel(l, sx + 3, y - 7, 14, z === 'druckt' ? 4 + bild : 2);
  if (z === 'druckt' && bild === 0) l.rechteck(sx + 3, y - 19, 9, 1, MF.papier);
  l.rechteck(sx + 2, y - 4, 16, 1, MF.silberDunkel);
}

/** Taste mit Pfeil für den Leitstand. */
export function zeichneTaste(l: Leinwand, f: Farben, b: number, h: number, richtung: 'hoch' | 'runter' | 'links' | 'rechts'): void {
  l.rechteck(1, 0, b - 2, h, f.umriss);
  l.rechteck(0, 1, b, h - 2, f.umriss);
  l.rechteck(1, 1, b - 2, h - 2, MF.podestHell);
  l.rechteck(1, h - 4, b - 2, 3, MF.podest);
  l.rechteck(2, 1, b - 4, 1, MF.silberDunkel);
  const mx = Math.floor(b / 2);
  const my = Math.floor(h / 2) - 1;
  for (let i = 0; i < 6; i++) {
    if (richtung === 'hoch') l.rechteck(mx - i, my - 3 + i, i * 2, 1, MF.weiss);
    else if (richtung === 'runter') l.rechteck(mx - i, my + 3 - i, i * 2, 1, MF.weiss);
    else if (richtung === 'links') l.rechteck(mx - 3 + i, my - i, 1, i * 2, MF.weiss);
    else l.rechteck(mx + 3 - i, my - i, 1, i * 2, MF.weiss);
  }
}

// ---------------------------------------------------------------------------
// Porträts für die Wahl des Bereichs, nach Alexanders Fotos (13.11.2026). Je 40 x 46.
// ---------------------------------------------------------------------------

const PF = {
  grund: '#dfe1e3',
  haut: '#e8b98f',
  hautSchatten: '#cf9a72',
  polo: '#1d1f24',
  kragen: '#33373f',
  weiss: '#f4f5f6',
  brille: '#20242e',
  lippe: '#a85a52',
  // Medientechnologe: braune Locken, Schnauz
  locken: '#5a3a22',
  lockenDunkel: '#3f2817',
  lockenHell: '#7d5433',
  schnauz: '#9a6236',
  auge: '#6f8f8a',
  // Produktionsleiter: dunkles, leicht graues Haar, Vollbart
  haar: '#3a3532',
  haarHell: '#5c5753',
  grau: '#8a8784',
} as const;

function poloUndHals(l: Leinwand): void {
  l.rechteck(0, 0, 40, 46, PF.grund);
  l.rechteck(17, 28, 6, 7, PF.hautSchatten);
  l.rechteck(5, 35, 30, 2, PF.polo);
  l.rechteck(2, 37, 36, 9, PF.polo);
  l.rechteck(0, 40, 40, 6, PF.polo);
  l.rechteck(18, 34, 4, 4, PF.haut);
  l.rechteck(12, 33, 6, 4, PF.kragen);
  l.rechteck(22, 33, 6, 4, PF.kragen);
  l.rechteck(19, 38, 2, 8, PF.kragen);
  // Gesticktes Logo auf der Brust
  l.rechteck(28, 41, 6, 1, PF.weiss);
  l.rechteck(27, 43, 7, 1, PF.weiss);
}

/** Porträt Medientechnologe: braune Locken, runde Brille, Schnauz, schwarzes Polo. */
export function zeichnePortraitMedientechnologe(l: Leinwand): void {
  poloUndHals(l);
  // Kopf
  l.rechteck(12, 10, 16, 19, PF.haut);
  l.rechteck(14, 29, 12, 2, PF.haut);
  l.rechteck(10, 17, 2, 5, PF.haut);
  l.rechteck(28, 17, 2, 5, PF.haut);
  // Locken
  l.rechteck(11, 4, 18, 8, PF.locken);
  l.rechteck(9, 6, 2, 6, PF.locken);
  l.rechteck(29, 6, 2, 6, PF.locken);
  l.rechteck(13, 2, 5, 2, PF.locken);
  l.rechteck(20, 1, 6, 3, PF.locken);
  l.rechteck(17, 3, 3, 1, PF.locken);
  l.rechteck(12, 12, 5, 1, PF.locken);
  l.rechteck(23, 12, 4, 1, PF.locken);
  l.rechteck(11, 12, 1, 5, PF.lockenDunkel);
  l.rechteck(28, 12, 1, 5, PF.lockenDunkel);
  for (const [x, y] of [[13, 5], [18, 4], [23, 6], [26, 4], [15, 8], [21, 9], [10, 8], [28, 9], [22, 2], [14, 3]]) l.rechteck(x, y, 1, 1, PF.lockenHell);
  for (const [x, y] of [[16, 6], [20, 7], [25, 8], [12, 9], [24, 3], [18, 10]]) l.rechteck(x, y, 1, 1, PF.lockenDunkel);
  // Augenbrauen und Augen
  l.rechteck(14, 15, 4, 1, PF.lockenDunkel);
  l.rechteck(22, 15, 4, 1, PF.lockenDunkel);
  l.rechteck(15, 18, 2, 2, PF.auge);
  l.rechteck(23, 18, 2, 2, PF.auge);
  // Runde Brille
  for (const bx of [13, 21]) {
    l.rechteck(bx + 1, 16, 4, 1, PF.brille);
    l.rechteck(bx + 1, 21, 4, 1, PF.brille);
    l.rechteck(bx, 17, 1, 4, PF.brille);
    l.rechteck(bx + 5, 17, 1, 4, PF.brille);
  }
  l.rechteck(19, 18, 2, 1, PF.brille);
  l.rechteck(11, 18, 2, 1, PF.brille);
  l.rechteck(27, 18, 2, 1, PF.brille);
  // Nase, Schnauz, Mund
  l.rechteck(19, 21, 2, 3, PF.hautSchatten);
  l.rechteck(15, 25, 10, 2, PF.schnauz);
  l.rechteck(14, 26, 1, 1, PF.schnauz);
  l.rechteck(25, 26, 1, 1, PF.schnauz);
  l.rechteck(17, 27, 6, 1, PF.lippe);
}

/** Porträt Produktionsleiter: dunkles, leicht graues Haar, Vollbart, breites Lachen, schwarzes Polo. */
export function zeichnePortraitProduktionsleiter(l: Leinwand): void {
  poloUndHals(l);
  // Kopf
  l.rechteck(11, 10, 18, 19, PF.haut);
  l.rechteck(9, 17, 2, 5, PF.haut);
  l.rechteck(29, 17, 2, 5, PF.haut);
  // Haar, oben zerzaust, an den Seiten grau
  l.rechteck(11, 5, 18, 7, PF.haar);
  l.rechteck(13, 3, 3, 2, PF.haar);
  l.rechteck(18, 2, 4, 3, PF.haar);
  l.rechteck(24, 3, 3, 2, PF.haar);
  l.rechteck(27, 4, 2, 2, PF.haar);
  l.rechteck(10, 7, 1, 4, PF.haar);
  l.rechteck(29, 7, 1, 4, PF.haar);
  l.rechteck(10, 11, 2, 5, PF.grau);
  l.rechteck(28, 11, 2, 5, PF.grau);
  l.rechteck(12, 12, 3, 1, PF.haar);
  l.rechteck(25, 12, 3, 1, PF.haar);
  for (const [x, y] of [[14, 6], [19, 4], [23, 7], [26, 6], [16, 9], [21, 8], [12, 8]]) l.rechteck(x, y, 1, 1, PF.haarHell);
  // Augenbrauen und lachende Augen
  l.rechteck(13, 15, 5, 1, PF.haar);
  l.rechteck(22, 15, 5, 1, PF.haar);
  l.rechteck(14, 18, 3, 1, PF.brille);
  l.rechteck(23, 18, 3, 1, PF.brille);
  // Nase
  l.rechteck(19, 19, 2, 4, PF.hautSchatten);
  // Vollbart
  l.rechteck(11, 21, 2, 8, PF.haar);
  l.rechteck(27, 21, 2, 8, PF.haar);
  l.rechteck(12, 24, 16, 7, PF.haar);
  l.rechteck(14, 31, 12, 1, PF.haar);
  l.rechteck(15, 23, 10, 1, PF.haar);
  l.rechteck(12, 28, 2, 2, PF.grau);
  l.rechteck(26, 28, 2, 2, PF.grau);
  l.rechteck(18, 30, 4, 1, PF.grau);
  // Lachen
  l.rechteck(16, 25, 8, 2, PF.weiss);
  l.rechteck(16, 27, 8, 1, PF.lippe);
}

/** Computer-Arbeitsplatz des Produktionsleiters: Tisch mit Bildschirm (Planung), Tastatur und Stuhl. 34 x 30. */
export function zeichneArbeitsplatz(l: Leinwand): void {
  // Schatten am Boden
  l.rechteck(0, 28, 34, 2, MF.schatten);
  // Stuhl
  l.rechteck(1, 12, 2, 12, MF.anthrazit);
  l.rechteck(1, 20, 9, 2, MF.anthrazit);
  l.rechteck(5, 22, 1, 5, MF.anthrazitDunkel);
  l.rechteck(2, 27, 7, 1, MF.anthrazitDunkel);
  // Tisch
  l.rechteck(9, 15, 25, 2, MF.silberHell);
  l.rechteck(9, 17, 25, 1, MF.silberDunkel);
  l.rechteck(11, 18, 2, 10, MF.silberDunkel);
  l.rechteck(30, 18, 2, 10, MF.silberDunkel);
  l.rechteck(24, 18, 6, 8, MF.silber);
  l.rechteck(26, 21, 2, 1, MF.silberDunkel);
  // Bildschirm mit Planung
  l.rechteck(13, 2, 18, 11, MF.anthrazitDunkel);
  l.rechteck(14, 3, 16, 9, MF.weiss);
  l.rechteck(15, 4, 6, 1, MF.blau);
  l.rechteck(15, 6, 10, 1, MF.gut);
  l.rechteck(15, 8, 7, 1, MF.warnung);
  l.rechteck(15, 10, 12, 1, MF.gut);
  l.rechteck(21, 13, 2, 2, MF.anthrazitDunkel);
  // Tastatur
  l.rechteck(13, 14, 9, 1, MF.anthrazit);
}

/** Porträt Polygraf: dunkles Haar, dunkle runde Brille, Dreitagebart, Lachen, schwarzes Polo. Nach Alexanders Foto (13.11.2026). */
export function zeichnePortraitPolygraf(l: Leinwand): void {
  const haar = '#3a281e';
  const haarHell = '#57392a';
  const brille = '#3b3431';
  const bart = '#bd8f6d';
  poloUndHals(l);
  l.rechteck(12, 10, 16, 19, PF.haut);
  l.rechteck(14, 29, 12, 2, PF.haut);
  l.rechteck(10, 17, 2, 5, PF.haut);
  l.rechteck(28, 17, 2, 5, PF.haut);
  // Haar, zur Seite gekämmt
  l.rechteck(11, 5, 18, 6, haar);
  l.rechteck(13, 3, 14, 2, haar);
  l.rechteck(12, 11, 11, 1, haar);
  l.rechteck(12, 12, 6, 1, haar);
  l.rechteck(11, 11, 1, 5, haar);
  l.rechteck(28, 11, 1, 4, haar);
  for (const [x, y] of [[15, 5], [20, 4], [24, 6], [18, 8], [22, 9], [14, 7]]) l.rechteck(x, y, 1, 1, haarHell);
  // Augenbrauen, Augen, Brille
  l.rechteck(14, 15, 4, 1, haar);
  l.rechteck(22, 15, 4, 1, haar);
  l.rechteck(15, 19, 2, 1, '#4a3426');
  l.rechteck(23, 19, 2, 1, '#4a3426');
  for (const bx of [13, 21]) {
    l.rechteck(bx + 1, 16, 4, 1, brille);
    l.rechteck(bx + 1, 21, 4, 1, brille);
    l.rechteck(bx, 17, 1, 4, brille);
    l.rechteck(bx + 5, 17, 1, 4, brille);
  }
  l.rechteck(19, 18, 2, 1, brille);
  l.rechteck(11, 18, 2, 1, brille);
  l.rechteck(27, 18, 2, 1, brille);
  l.rechteck(19, 21, 2, 3, PF.hautSchatten);
  // Dreitagebart und Lachen
  l.rechteck(12, 23, 2, 6, bart);
  l.rechteck(26, 23, 2, 6, bart);
  l.rechteck(13, 27, 14, 3, bart);
  l.rechteck(14, 30, 12, 1, bart);
  l.rechteck(15, 24, 10, 1, bart);
  l.rechteck(16, 25, 8, 2, PF.weiss);
  l.rechteck(16, 27, 8, 1, PF.lippe);
}

/** Arbeitsplatz der Medienvorstufe: Tisch, grosser Bildschirm mit Seitenlayout, Stuhl. 34 x 30. */
export function zeichneVorstufenplatz(l: Leinwand): void {
  l.rechteck(0, 28, 34, 2, MF.schatten);
  l.rechteck(1, 12, 2, 12, MF.anthrazit);
  l.rechteck(1, 20, 9, 2, MF.anthrazit);
  l.rechteck(5, 22, 1, 5, MF.anthrazitDunkel);
  l.rechteck(2, 27, 7, 1, MF.anthrazitDunkel);
  l.rechteck(9, 15, 25, 2, MF.silberHell);
  l.rechteck(9, 17, 25, 1, MF.silberDunkel);
  l.rechteck(11, 18, 2, 10, MF.silberDunkel);
  l.rechteck(30, 18, 2, 10, MF.silberDunkel);
  l.rechteck(11, 0, 21, 13, MF.anthrazitDunkel);
  l.rechteck(12, 1, 19, 11, MF.weiss);
  l.rechteck(14, 2, 7, 9, MF.papier);
  l.rechteck(15, 3, 5, 3, MF.c);
  l.rechteck(15, 7, 5, 1, MF.silberDunkel);
  l.rechteck(15, 9, 3, 1, MF.silberDunkel);
  l.rechteck(23, 2, 7, 4, MF.m);
  l.rechteck(23, 7, 7, 1, MF.silberDunkel);
  l.rechteck(23, 9, 5, 1, MF.y);
  l.rechteck(20, 13, 3, 2, MF.anthrazitDunkel);
  l.rechteck(13, 14, 9, 1, MF.anthrazit);
  l.rechteck(25, 14, 3, 1, MF.silberDunkel);
}

export type Seitenelement = 'titel' | 'text' | 'foto' | 'grafik';

/** Element einer Seite für den Bereich Polygraf, 36 x 30: Titel, Text, Foto oder Grafik. */
export function zeichneSeitenelement(l: Leinwand, art: Seitenelement): void {
  const b = 36;
  const h = 30;
  l.rechteck(0, 0, b, h, MF.silberDunkel);
  l.rechteck(1, 1, b - 2, h - 2, MF.weiss);
  if (art === 'titel') {
    // Grosse, fette Zeilen
    l.rechteck(4, 6, 28, 6, MF.k);
    l.rechteck(4, 16, 19, 6, MF.k);
  } else if (art === 'text') {
    // Viele dünne Zeilen (Lauftext)
    for (let i = 0; i < 6; i++) l.rechteck(4, 4 + i * 4, i === 5 ? 16 : 28, 2, MF.silberDunkel);
  } else if (art === 'foto') {
    // Landschaft: Himmel, Sonne, Berge
    l.rechteck(3, 3, 30, 24, MF.c);
    l.rechteck(24, 6, 5, 5, MF.y);
    l.rechteck(3, 21, 30, 6, MF.gut);
    for (let i = 0; i < 8; i++) l.rechteck(8 - i + 3, 13 + i, 2 + i * 2, 1, '#2f8540');
    for (let i = 0; i < 6; i++) l.rechteck(22 - i, 15 + i, 2 + i * 2, 1, '#2f8540');
  } else {
    // Grafik: Balkendiagramm in den Druckfarben
    l.rechteck(4, 25, 28, 1, MF.k);
    l.rechteck(6, 16, 5, 9, MF.c);
    l.rechteck(13, 9, 5, 16, MF.m);
    l.rechteck(20, 13, 5, 12, MF.y);
    l.rechteck(27, 5, 4, 20, MF.k);
  }
}

// ---------------------------------------------------------------------------
// Bereich Ausrüster: Falzmaschine «MBO», Sammelhefter «Martini Hefter», Palette, Lastwagen.
// Nach Alexanders Fotos (13.11.2026), ohne Herstellerlogos.
// ---------------------------------------------------------------------------

/** Farben der Weiterverarbeitung. Sie gehören zur Palette «Werkhalle». */
export const WF = {
  blau: '#5b9bd5',
  blauDunkel: '#3f7fbd',
  blauHell: '#8cbce6',
  band: '#49b35a',
  holz: '#b98a56',
  holzDunkel: '#8a6239',
  rot: '#d20a11',
  rotDunkel: '#9c070c',
  rotHell: '#e8474d',
} as const;

export type Laufzustand = 'steht' | 'ruestet' | 'laeuft';

function lampeLauf(z: Laufzustand, bild: number): string {
  if (z === 'steht') return MF.schlecht;
  if (z === 'ruestet') return bild === 0 ? MF.warnung : MF.anthrazitDunkel;
  return MF.gut;
}

/** Falzmaschine von der Seite, 64 x 42: weisse Haube mit dunklen Fenstern, anthrazit unten, heller Anleger rechts. */
export function zeichneFalzmaschine(l: Leinwand, z: Laufzustand, bild = 0): void {
  l.rechteck(0, 40, 64, 2, MF.schatten);
  // Unterbau mit Falzwerk
  l.rechteck(2, 22, 34, 18, MF.anthrazit);
  l.rechteck(2, 36, 34, 4, MF.anthrazitDunkel);
  l.rechteck(6, 26, 8, 4, MF.anthrazitDunkel);
  l.rechteck(18, 26, 8, 4, MF.anthrazitDunkel);
  // Grüne Rollen, drehen im Lauf
  const versatz = z === 'laeuft' && bild === 1 ? 2 : 0;
  l.rechteck(7 + versatz, 31, 3, 1, WF.band);
  l.rechteck(19 + versatz, 31, 3, 1, WF.band);
  l.rechteck(28, 31, 3, 1, lampeLauf(z, bild));
  // Weisse Haube mit zwei dunklen Fenstern
  l.rechteck(4, 8, 28, 15, MF.rahmen);
  l.rechteck(6, 6, 22, 2, MF.rahmen);
  l.rechteck(7, 10, 10, 9, MF.glas);
  l.rechteck(20, 10, 9, 9, MF.glas);
  if (z === 'laeuft') {
    l.rechteck(8 + bild * 4, 12, 4, 1, MF.papier);
    l.rechteck(21 + bild * 3, 15, 4, 1, MF.papier);
  } else if (z === 'ruestet' && bild === 1) {
    l.rechteck(7, 10, 10, 9, MF.anthrazitHell);
  } else {
    l.rechteck(8, 11, 3, 1, MF.anthrazitHell);
  }
  // Mittelteil mit Handrad
  l.rechteck(36, 16, 12, 24, MF.anthrazit);
  l.rechteck(36, 14, 12, 2, MF.anthrazitHell);
  l.rechteck(39, 20, 5, 5, MF.anthrazitDunkel);
  l.rechteck(41, 22, 1, 1, MF.silber);
  // Heller Rahmen des Anlegers mit Bogenstapel
  l.rechteck(48, 6, 2, 34, MF.silber);
  l.rechteck(60, 6, 2, 34, MF.silber);
  l.rechteck(48, 6, 14, 2, MF.silber);
  l.rechteck(48, 24, 14, 2, MF.silberHell);
  const hoch = z === 'laeuft' ? 10 - bild * 2 : 12;
  stapel(l, 50, 38, 10, hoch);
  if (z === 'laeuft') l.rechteck(46 + bild, 23, 6, 1, MF.papier);
  // Bedienfeld
  l.rechteck(44, 8, 6, 8, MF.anthrazitDunkel);
  l.rechteck(45, 9, 4, 5, z === 'steht' ? MF.glas : z === 'ruestet' && bild === 1 ? MF.weiss : MF.blau);
}

/** Sammelhefter von der Seite, 124 x 38: lange blaue Linie mit drei Anlegern, Heftstation und Auslage. */
export function zeichneSammelhefter(l: Leinwand, z: Laufzustand, bild = 0): void {
  l.rechteck(0, 36, 124, 2, MF.schatten);
  // Bildschirm auf Ständer
  l.rechteck(0, 4, 2, 32, WF.blau);
  l.rechteck(0, 2, 12, 9, MF.anthrazitDunkel);
  l.rechteck(1, 3, 10, 7, z === 'steht' ? MF.glas : MF.papier);
  if (z !== 'steht') l.rechteck(2, 5, 4 + bild * 3, 1, MF.gut);
  // Auslage mit grünem Band und Dreischneider
  l.rechteck(16, 20, 22, 16, WF.blau);
  l.rechteck(16, 18, 22, 2, WF.blauHell);
  l.rechteck(18, 22, 12, 8, MF.glas);
  l.rechteck(6, 30, 12, 2, WF.band);
  l.rechteck(6, 32, 2, 4, WF.blauDunkel);
  l.rechteck(14, 28, 4, 3, WF.band);
  if (z === 'laeuft') {
    // Fertige Hefte laufen aus
    l.rechteck(8 + bild * 4, 29, 3, 1, MF.papier);
    l.rechteck(20 + bild * 3, 24, 4, 1, MF.papier);
  }
  // Heftstation mit Bedienfeld
  l.rechteck(38, 12, 16, 24, WF.blau);
  l.rechteck(38, 10, 16, 2, WF.blauHell);
  l.rechteck(41, 14, 9, 7, MF.papier);
  l.rechteck(42, 15, 7, 5, z === 'steht' ? MF.glas : z === 'ruestet' && bild === 1 ? MF.weiss : MF.blau);
  l.rechteck(51, 12, 2, 3, lampeLauf(z, bild));
  // Sammelkette mit drei Anlegern
  l.rechteck(54, 24, 58, 12, WF.blau);
  l.rechteck(54, 22, 58, 2, MF.silber);
  l.rechteck(54, 34, 58, 2, WF.blauDunkel);
  for (let i = 0; i < 3; i++) {
    const x = 58 + i * 15;
    l.rechteck(x, 12, 12, 10, WF.blau);
    l.rechteck(x, 10, 12, 2, WF.blauHell);
    l.rechteck(x + 2, 6, 8, 5, MF.silber);
    l.rechteck(x + 2, 14, 8, 6, MF.glas);
    // Gefalzte Bogen im Anleger, im Lauf abwechselnd
    const voll = z !== 'laeuft' || (i + bild) % 2 === 0;
    l.rechteck(x + 3, voll ? 4 : 5, 6, voll ? 2 : 1, MF.papier);
    if (z === 'laeuft' && (i + bild) % 2 === 1) l.rechteck(x + 4, 22, 4, 1, MF.papier);
    if (z === 'ruestet' && i % 2 === bild) l.rechteck(x + 2, 14, 8, 6, MF.anthrazitHell);
  }
  // Umschlaganleger am Ende
  l.rechteck(104, 14, 14, 10, WF.blau);
  l.rechteck(104, 12, 14, 2, WF.blauHell);
  l.rechteck(106, 16, 10, 6, MF.glas);
  l.rechteck(118, 26, 6, 8, MF.silberDunkel);
}

/** Palette mit Bogenstapel von der Seite, 26 x 20. groesse 1 bis 3 bestimmt die Höhe des Stapels. */
export function zeichnePalette(l: Leinwand, groesse: number): void {
  const hoch = 3 + groesse * 3;
  l.rechteck(0, 16, 26, 1, WF.holzDunkel);
  l.rechteck(0, 17, 26, 1, WF.holz);
  l.rechteck(0, 18, 4, 2, WF.holzDunkel);
  l.rechteck(11, 18, 4, 2, WF.holzDunkel);
  l.rechteck(22, 18, 4, 2, WF.holzDunkel);
  stapel(l, 2, 16, 22, hoch);
  l.rechteck(2, 16 - hoch, 22, 1, MF.silberDunkel);
}

/** Das «a» aus dem Schriftzug «wallimann», 13 x 12, als Pixelmuster. */
const BUCHSTABE_A = [
  '....######...',
  '..#########..',
  '..##########.',
  '.###.....###.',
  '.###......###',
  '###.......###',
  '###.......###',
  '####.....####',
  '.###.....####',
  '.############',
  '..###########',
  '....######..#',
];

/** Heck des roten Lastwagens an der Rampe, 46 x 44, mit dem «a» auf dem Aufbau. */
export function zeichneLastwagenHeck(l: Leinwand): void {
  l.rechteck(0, 42, 46, 2, MF.schatten);
  // Aufbau
  l.rechteck(6, 4, 40, 30, WF.rot);
  l.rechteck(6, 4, 40, 2, WF.rotHell);
  l.rechteck(6, 32, 40, 2, WF.rotDunkel);
  l.rechteck(6, 4, 2, 30, WF.rotDunkel);
  l.rechteck(8, 8, 2, 22, '#7d0509');
  // Ladebrücke zur Rampe
  l.rechteck(0, 30, 8, 3, MF.silberDunkel);
  l.rechteck(0, 33, 2, 9, MF.silberDunkel);
  // Rad
  l.rechteck(24, 32, 12, 12, MF.anthrazitDunkel);
  l.rechteck(28, 36, 4, 4, MF.silberDunkel);
  BUCHSTABE_A.forEach((zeile, y) => {
    for (let x = 0; x < zeile.length; x++) if (zeile[x] === '#') l.rechteck(22 + x, 12 + y, 1, 1, MF.weiss);
  });
}

/** Porträt Ausrüster: dunkles, nach hinten gekämmtes Haar mit Grau, langer dunkler Vollbart, schwarzes Polo. Nach Alexanders Foto. */
export function zeichnePortraitAusruester(l: Leinwand): void {
  const haar = '#2a2827';
  const grau = '#6e6b68';
  const bart = '#1f1c1b';
  poloUndHals(l);
  l.rechteck(11, 10, 18, 19, PF.haut);
  l.rechteck(9, 17, 2, 5, PF.haut);
  l.rechteck(29, 17, 2, 5, PF.haut);
  // Haar nach hinten gekämmt, an den Seiten grau
  l.rechteck(11, 4, 18, 7, haar);
  l.rechteck(13, 3, 14, 1, haar);
  l.rechteck(12, 11, 3, 1, haar);
  l.rechteck(25, 11, 3, 1, haar);
  l.rechteck(10, 7, 2, 8, grau);
  l.rechteck(28, 7, 2, 8, grau);
  for (const [x, y] of [[14, 5], [17, 4], [20, 5], [23, 4], [16, 7], [22, 8], [19, 9]]) l.rechteck(x, y, 2, 1, '#4a4745');
  // Kräftige Augenbrauen, dunkle Augen
  l.rechteck(13, 15, 5, 1, bart);
  l.rechteck(22, 15, 5, 1, bart);
  l.rechteck(14, 17, 3, 2, PF.weiss);
  l.rechteck(23, 17, 3, 2, PF.weiss);
  l.rechteck(15, 17, 2, 2, '#3b2416');
  l.rechteck(24, 17, 2, 2, '#3b2416');
  l.rechteck(19, 18, 2, 4, PF.hautSchatten);
  // Langer Vollbart
  l.rechteck(11, 20, 2, 12, bart);
  l.rechteck(27, 20, 2, 12, bart);
  l.rechteck(12, 23, 16, 13, bart);
  l.rechteck(14, 36, 12, 2, bart);
  l.rechteck(16, 38, 8, 1, bart);
  l.rechteck(15, 22, 10, 1, bart);
  l.rechteck(17, 25, 6, 1, PF.lippe);
  for (const [x, y] of [[13, 30], [26, 31], [15, 34], [23, 35], [19, 37]]) l.rechteck(x, y, 1, 1, grau);
}

// ---------------------------------------------------------------- Bereich Schneiden

/** Porträt für den Bereich Schneiden: langes braunes Haar mit Mittelscheitel, Lächeln, schwarzes Polo. */
export function zeichnePortraitSchneiden(l: Leinwand): void {
  const haar = '#5b3a26';
  const haarDunkel = '#3e2617';
  const haarHell = '#7d5638';
  poloUndHals(l);
  // Langes Haar hinter dem Kopf, fällt über die Schultern
  l.rechteck(8, 6, 24, 30, haarDunkel);
  l.rechteck(6, 14, 4, 26, haar);
  l.rechteck(30, 14, 4, 26, haar);
  l.rechteck(5, 26, 3, 16, haar);
  l.rechteck(32, 26, 3, 16, haar);
  // Hals und Kragen wieder nach vorn holen
  l.rechteck(17, 28, 6, 7, PF.hautSchatten);
  l.rechteck(18, 34, 4, 4, PF.haut);
  // Gesicht
  l.rechteck(12, 10, 16, 18, PF.haut);
  l.rechteck(13, 28, 14, 2, PF.haut);
  l.rechteck(15, 30, 10, 1, PF.haut);
  // Haar oben mit Mittelscheitel, Strähnen an den Seiten
  l.rechteck(11, 4, 18, 5, haar);
  l.rechteck(13, 3, 14, 1, haar);
  l.rechteck(9, 6, 4, 10, haar);
  l.rechteck(27, 6, 4, 10, haar);
  l.rechteck(11, 9, 4, 3, haar);
  l.rechteck(25, 9, 4, 3, haar);
  l.rechteck(10, 16, 2, 20, haar);
  l.rechteck(28, 16, 2, 20, haar);
  l.rechteck(20, 3, 1, 6, haarDunkel);
  for (const [x, y] of [[14, 5], [24, 5], [8, 18], [31, 20], [7, 30], [32, 32], [10, 26], [29, 28]]) l.rechteck(x, y, 1, 4, haarHell);
  // Haarklammern
  l.rechteck(12, 5, 2, 1, '#8a4b2a');
  l.rechteck(26, 5, 2, 1, '#8a4b2a');
  // Augenbrauen, Augen, Nase
  l.rechteck(14, 15, 4, 1, haarDunkel);
  l.rechteck(22, 15, 4, 1, haarDunkel);
  l.rechteck(14, 17, 4, 2, PF.weiss);
  l.rechteck(22, 17, 4, 2, PF.weiss);
  l.rechteck(15, 17, 2, 2, '#4a3220');
  l.rechteck(23, 17, 2, 2, '#4a3220');
  l.rechteck(14, 16, 4, 1, '#20242e');
  l.rechteck(22, 16, 4, 1, '#20242e');
  l.rechteck(19, 19, 2, 3, PF.hautSchatten);
  // Lächeln mit Zähnen
  l.rechteck(16, 24, 8, 1, PF.lippe);
  l.rechteck(17, 25, 6, 1, PF.weiss);
  l.rechteck(17, 26, 6, 1, PF.lippe);
  l.rechteck(15, 23, 1, 1, PF.hautSchatten);
  l.rechteck(24, 23, 1, 1, PF.hautSchatten);
  // Feine Halskette
  l.rechteck(17, 36, 1, 1, '#d8b25a');
  l.rechteck(22, 36, 1, 1, '#d8b25a');
  l.rechteck(19, 37, 2, 1, '#d8b25a');
}

export const RUETTLER_BREITE = 40;
export const RUETTLER_HOEHE = 40;

/** Rüttler: schräger Tisch mit Anschlag auf einem Gestell. bild 0 oder 1 (rüttelt), mitStapel zeigt den Bogenstapel. */
export function zeichneRuettler(l: Leinwand, bild: number, mitStapel: boolean): void {
  const v = bild; // Versatz beim Rütteln
  // Gestell
  l.rechteck(4, 36, 32, 3, MF.anthrazitDunkel);
  l.rechteck(7, 22, 3, 14, MF.anthrazit);
  l.rechteck(30, 26, 3, 10, MF.anthrazit);
  l.rechteck(10, 30, 20, 2, MF.anthrazitHell);
  l.rechteck(16, 32, 8, 4, MF.anthrazit);
  l.rechteck(18, 33, 2, 1, bild === 0 ? MF.gut : MF.warnung);
  // Schräger Tisch: links hoch, rechts tief, als Treppe
  for (let i = 0; i < 8; i++) {
    l.rechteck(4 + i * 4, 17 + i + v, 4, 3, WF.blauDunkel);
    l.rechteck(4 + i * 4, 17 + i + v, 4, 1, WF.blauHell);
  }
  // Anschlag rechts und hinten
  l.rechteck(34, 8 + v, 2, 18, WF.blauDunkel);
  l.rechteck(4, 4 + v, 2, 14, WF.blauDunkel);
  if (mitStapel) {
    for (let i = 0; i < 6; i++) {
      l.rechteck(8 + i * 4, 8 + i + v, 4, 9, MF.papier);
      l.rechteck(8 + i * 4, 10 + i + v, 4, 1, MF.papierSchatten);
      l.rechteck(8 + i * 4, 13 + i + v, 4, 1, MF.papierSchatten);
      l.rechteck(8 + i * 4, 8 + i + v, 4, 1, MF.silberDunkel);
    }
  }
}

export const SCHNEIDEMASCHINE_BREITE = 56;
export const SCHNEIDEMASCHINE_HOEHE = 46;

/** Schneidemaschine von vorn: Tisch, Portal mit Messer, Bedienfeld. messerUnten = schneidet, mitStapel zeigt den Bogenstapel. */
export function zeichneSchneidemaschine(l: Leinwand, messerUnten: boolean, mitStapel: boolean): void {
  // Sockel
  l.rechteck(4, 30, 48, 14, MF.anthrazit);
  l.rechteck(4, 30, 48, 1, MF.anthrazitHell);
  l.rechteck(2, 44, 52, 2, MF.anthrazitDunkel);
  l.rechteck(8, 34, 14, 7, MF.anthrazitDunkel);
  l.rechteck(34, 34, 14, 7, MF.anthrazitDunkel);
  // Tisch
  l.rechteck(0, 26, 56, 4, MF.silber);
  l.rechteck(0, 26, 56, 1, MF.silberHell);
  // Portal
  l.rechteck(4, 2, 6, 24, MF.silberHell);
  l.rechteck(46, 2, 6, 24, MF.silberHell);
  l.rechteck(4, 2, 48, 10, MF.silberHell);
  l.rechteck(4, 11, 48, 1, MF.silberDunkel);
  l.rechteck(9, 2, 1, 24, MF.silberDunkel);
  l.rechteck(46, 2, 1, 24, MF.silberDunkel);
  // Bedienfeld mit kleinem Bildschirm und Lampe
  l.rechteck(14, 4, 14, 6, MF.glas);
  l.rechteck(15, 5, 8, 1, MF.blau);
  l.rechteck(32, 5, 3, 3, messerUnten ? MF.gut : MF.schlecht);
  l.rechteck(38, 5, 3, 3, MF.anthrazit);
  // Stapel auf dem Tisch
  if (mitStapel) {
    l.rechteck(14, 20, 28, 6, MF.papier);
    l.rechteck(14, 22, 28, 1, MF.papierSchatten);
    l.rechteck(14, 24, 28, 1, MF.papierSchatten);
  }
  // Pressbalken und Messer
  const y = messerUnten ? (mitStapel ? 16 : 22) : 12;
  l.rechteck(10, y, 36, 3, MF.anthrazit);
  l.rechteck(10, y + 3, 36, 1, MF.silberDunkel);
  l.rechteck(10, y + 4, 36, 1, MF.weiss);
}

// ---------------------------------------------------------------- Neuer Startbildschirm (Vorschau)

/** Lage des Firmengebäudes und der Eingangstür im Bild, für Schild und Animation. */
export const GEBAEUDE = { x: 8, y: 52, b: 304, h: 62, feld: 19, tuer: { x: 281, y: 96, b: 16, h: 18 } } as const;

/** Firmengebäude von aussen, 320 x 180: Himmel, zweigeschossiger Bau mit Fensterbändern, Baum, Laterne, Strasse mit rotem Streifen. */
export function zeichneFirmengebaeude(l: Leinwand): void {
  const G = GEBAEUDE;
  // Himmel mit Wolken
  l.rechteck(0, 0, 320, 116, '#79b8ea');
  l.rechteck(0, 64, 320, 52, '#9ccbf0');
  l.rechteck(0, 93, 320, 23, '#bcdcf5');
  for (const [x, y, b] of [[10, 18, 46], [256, 14, 54]]) {
    l.rechteck(x, y + 4, b, 7, '#ffffff');
    l.rechteck(x + 6, y, b - 18, 5, '#ffffff');
    l.rechteck(x + 4, y + 11, b - 10, 2, '#e6f0f8');
  }
  // Gebäude: helle Paneele, zwei Fensterbänder mit Storen, schmale Stützen
  const wand = '#e7eaec';
  const wandDunkel = '#c5cbd0';
  const glas = '#3a444e';
  l.rechteck(G.x, G.y, G.b, G.h, wand);
  l.rechteck(G.x - 1, G.y - 2, G.b + 2, 3, '#aab2b9');
  l.rechteck(G.x, G.y + G.h - 3, G.b, 3, wandDunkel);
  const fensterH = 16;
  for (const fy of [G.y + 8, G.y + 35]) {
    l.rechteck(G.x + 2, fy, G.b - 4, fensterH, glas);
    for (let k = 1; k < fensterH; k += 2) l.rechteck(G.x + 2, fy + k, G.b - 4, 1, '#56626e');
  }
  for (let sx = G.x; sx < G.x + G.b; sx += G.feld) {
    l.rechteck(sx, G.y, 2, G.h, '#f6f7f8');
    l.rechteck(sx + 2, G.y, 1, G.h, wandDunkel);
  }
  l.rechteck(G.x + G.b - 2, G.y, 2, G.h, '#f6f7f8');
  // Eingang rechts mit Vordach und Glastür
  const ex = G.x + G.b - G.feld * 2 + 3;
  l.rechteck(ex, G.y + 35, G.feld * 2 - 5, G.h - 35, wand);
  l.rechteck(G.tuer.x - 1, G.tuer.y - 1, G.tuer.b + 2, G.tuer.h + 1, '#8f979f');
  l.rechteck(G.tuer.x, G.tuer.y, G.tuer.b, G.tuer.h, glas);
  l.rechteck(G.tuer.x + G.tuer.b / 2 - 1, G.tuer.y, 1, G.tuer.h, '#8f979f');
  l.rechteck(G.tuer.x + 2, G.tuer.y + 2, 2, 6, '#56626e');
  l.rechteck(G.tuer.x + G.tuer.b - 5, G.tuer.y + 2, 2, 6, '#56626e');
  l.rechteck(ex - 2, G.tuer.y - 5, G.feld * 2 - 2, 3, '#8f979f');
  // Rasen
  l.rechteck(0, 114, 320, 12, '#6cae45');
  l.rechteck(0, 114, 320, 2, '#84c35a');
  // Weg zum Eingang
  l.rechteck(G.tuer.x - 2, 114, G.tuer.b + 4, 12, '#b9bfc5');
  // Baum
  const bx = 112;
  const unten = 118;
  l.rechteck(bx + 23, unten - 17, 4, 17, '#6b4a2b');
  const laub: [number, number, number, number, string][] = [
    [10, 80, 30, 20, '#3f9a3e'],
    [4, 69, 42, 24, '#2f7d32'],
    [0, 51, 50, 27, '#2f7d32'],
    [5, 27, 40, 13, '#2f7d32'],
    [14, 77, 15, 16, '#58b451'],
    [7, 61, 15, 16, '#3f9a3e'],
    [25, 56, 17, 19, '#3f9a3e'],
    [10, 40, 13, 11, '#58b451'],
  ];
  for (const [dx, hoch, b, h, farbe] of laub) l.rechteck(bx + dx, unten - hoch, b, h, farbe);
  // Laterne und Busch
  l.rechteck(160, 36, 2, 86, '#9aa1a8');
  l.rechteck(158, 33, 6, 4, MF.anthrazit);
  l.rechteck(232, 104, 26, 12, '#3f9a3e');
  l.rechteck(236, 100, 16, 6, '#58b451');
  // Strasse mit Mittellinie und rotem Streifen
  l.rechteck(0, 126, 320, 54, '#4a4f57');
  l.rechteck(0, 126, 320, 2, '#8d939a');
  for (let sx = 6; sx < 320; sx += 26) l.rechteck(sx, 135, 12, 2, '#f1f1ec');
  l.rechteck(0, 142, 320, 2, '#f1f1ec');
  l.rechteck(0, 144, 320, 10, '#c7392f');
  l.rechteck(0, 154, 320, 2, '#f1f1ec');
}

export const LASTWAGEN_BREITE = 80;
export const LASTWAGEN_HOEHE = 34;

/** Lastwagen von der Seite, fährt nach links: roter Aufbau mit weissem «a», weisses Führerhaus vorn (links), zwei Achsen. */
export function zeichneLastwagenSeite(ziel: Leinwand): void {
  // Gezeichnet wird mit dem Führerhaus rechts und dann gespiegelt. Das «a» bleibt lesbar (nicht gespiegelt).
  const l: Leinwand = { rechteck: (x, y, b, h, farbe) => ziel.rechteck(LASTWAGEN_BREITE - x - b, y, b, h, farbe) };
  // Fahrgestell
  l.rechteck(2, 26, 74, 3, MF.anthrazitDunkel);
  // Aufbau
  l.rechteck(0, 2, 53, 24, WF.rot);
  l.rechteck(0, 2, 53, 2, WF.rotHell);
  l.rechteck(0, 24, 53, 2, WF.rotDunkel);
  l.rechteck(0, 2, 1, 24, WF.rotDunkel);
  l.rechteck(52, 2, 1, 24, WF.rotDunkel);
  BUCHSTABE_A.forEach((zeile, y) => {
    for (let x = 0; x < zeile.length; x++) if (zeile[x] === '#') ziel.rechteck(LASTWAGEN_BREITE - 33 + x, 8 + y, 1, 1, MF.weiss);
  });
  // Führerhaus
  l.rechteck(55, 4, 8, 4, MF.weiss);
  l.rechteck(55, 8, 20, 18, MF.weiss);
  l.rechteck(55, 8, 1, 18, MF.silber);
  l.rechteck(55, 24, 20, 2, MF.silber);
  l.rechteck(63, 10, 11, 8, MF.glas);
  l.rechteck(64, 11, 3, 2, MF.glasGlanz);
  l.rechteck(59, 19, 3, 1, MF.silberDunkel);
  l.rechteck(73, 25, 5, 3, MF.anthrazit);
  l.rechteck(75, 21, 2, 2, MF.warnung);
  // Zwei Achsen
  for (const x of [9, 59]) {
    l.rechteck(x, 25, 10, 9, MF.anthrazitDunkel);
    l.rechteck(x - 1, 27, 12, 5, MF.anthrazitDunkel);
    l.rechteck(x + 3, 28, 4, 4, MF.silberDunkel);
  }
}
