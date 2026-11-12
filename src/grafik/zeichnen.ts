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

/** Digitaldruckmaschine. (x, y) ist die linke untere Ecke. Breite 70, Höhe 36. */
export function zeichneDigitaldruck(l: Leinwand, s: Stil, x: number, y: number, z: Zustand): void {
  const f = s.farben;
  if (s.detail >= 2) l.rechteck(x - 2, y, 74, 2, f.bodenFuge);
  teil(l, s, x, y - 26, 62, 26, f.maschine);
  // Auslage rechts mit Bogenstapel
  teil(l, s, x + 62, y - 12, 8, 2, f.maschineDunkel);
  l.rechteck(x + 63, y - (z === 'druckt' ? 16 : 14), 6, z === 'druckt' ? 4 : 2, f.papier);
  // Bedienfeld auf Ständer
  teil(l, s, x + 46, y - 35, 12, 8, f.maschineDunkel);
  l.rechteck(x + 47, y - 34, 10, 6, z === 'steht' ? f.maschineDunkel : f.akzent);
  l.rechteck(x + 51, y - 27, 2, 1, f.maschineDunkel);
  if (s.detail >= 1) {
    // Papierschubladen links, Farbmarken in der Mitte
    l.rechteck(x + 2, y - 17, 14, 1, f.maschineDunkel);
    l.rechteck(x + 2, y - 9, 14, 1, f.maschineDunkel);
    l.rechteck(x + 18, y - 26, 1, 26, f.maschineDunkel);
    const marken = [f.c, f.m, f.y, f.k];
    marken.forEach((farbe, i) => l.rechteck(x + 23 + i * 5, y - 7, 3, 3, farbe));
    l.rechteck(x + 2, y - 23, 3, 3, signalfarbe(f, z));
  }
  if (s.detail >= 2) {
    l.rechteck(x, y - 26, 62, 2, f.maschineHell);
    l.rechteck(x + 22, y - 20, 20, 8, f.maschineDunkel);
    l.rechteck(x + 23, y - 19, 18, 1, f.akzent);
    l.rechteck(x, y - 2, 62, 2, f.maschineDunkel);
  }
  if (s.detail >= 3) {
    l.rechteck(x + 7, y - 14, 4, 1, f.maschineHell);
    l.rechteck(x + 7, y - 6, 4, 1, f.maschineHell);
    l.rechteck(x + 24, y - 17, 6, 1, f.maschineHell);
    l.rechteck(x + 48, y - 33, 3, 1, f.papier);
  }
}

export interface Offsetmasse {
  werke: number;
  werkBreite: number;
  werkHoehe: number;
  auslageBreite: number;
  auslageHoehe: number;
  anlegerBreite: number;
  anlegerHoehe: number;
}

export const SM52: Offsetmasse = { werke: 4, werkBreite: 11, werkHoehe: 27, auslageBreite: 16, auslageHoehe: 20, anlegerBreite: 14, anlegerHoehe: 18 };
export const RA76: Offsetmasse = { werke: 4, werkBreite: 14, werkHoehe: 36, auslageBreite: 22, auslageHoehe: 27, anlegerBreite: 16, anlegerHoehe: 24 };

export function offsetBreite(m: Offsetmasse): number {
  return m.auslageBreite + m.werke * m.werkBreite + m.anlegerBreite;
}

/** Bogenoffsetmaschine von der Seite: Auslage, Druckwerke, Anleger. (x, y) ist die linke untere Ecke. */
export function zeichneOffset(l: Leinwand, s: Stil, x: number, y: number, m: Offsetmasse, z: Zustand): void {
  const f = s.farben;
  const gesamt = offsetBreite(m);
  if (s.detail >= 2) l.rechteck(x - 2, y, gesamt + 4, 2, f.bodenFuge);

  // Auslage mit Bogenstapel
  const ab = m.auslageBreite;
  const ah = m.auslageHoehe;
  teil(l, s, x, y - ah, ab, ah, f.maschine);
  l.rechteck(x + 2, y - ah + 4, ab - 4, ah - 6, f.maschineDunkel);
  const stapel = z === 'druckt' ? Math.floor((ah - 8) * 0.7) : 3;
  l.rechteck(x + 3, y - 2 - stapel, ab - 6, stapel, f.papier);
  if (s.detail >= 2) for (let i = 2; i < stapel; i += 2) l.rechteck(x + 3, y - 2 - i, ab - 6, 1, f.papierSchatten);
  if (s.detail >= 1) l.rechteck(x + 2, y - ah + 1, 3, 2, signalfarbe(f, z));
  if (s.detail >= 2) {
    // Leitstand an der Auslage
    teil(l, s, x + ab - 9, y - ah - 6, 8, 5, f.maschineDunkel);
    l.rechteck(x + ab - 8, y - ah - 5, 6, 3, z === 'steht' ? f.maschineDunkel : f.akzent);
  }

  // Druckwerke
  const marken = [f.k, f.c, f.m, f.y];
  for (let i = 0; i < m.werke; i++) {
    const wx = x + ab + i * m.werkBreite;
    const wb = m.werkBreite - 1;
    const wh = m.werkHoehe;
    teil(l, s, wx, y - wh, wb, wh, f.maschine);
    teil(l, s, wx + 1, y - wh - 2, wb - 2, 2, f.maschine);
    if (s.detail >= 1) l.rechteck(wx + 2, y - wh + 2, wb - 4, 3, marken[i % 4]);
    if (s.detail >= 2) {
      l.rechteck(wx, y - wh, 1, wh, f.maschineHell);
      l.rechteck(wx + 2, y - wh + 8, wb - 4, 7, f.maschineDunkel);
      l.rechteck(wx + wb - 1, y - wh + 1, 1, wh - 1, f.maschineDunkel);
    }
    if (s.detail >= 3) {
      // Zylinder im Schutzfenster, Trittbrett
      l.rechteck(wx + 3, y - wh + 9, wb - 6, 2, z === 'druckt' ? f.akzent : f.maschine);
      l.rechteck(wx + 3, y - wh + 12, wb - 6, 2, f.maschine);
      l.rechteck(wx + 1, y - 5, wb - 2, 1, f.maschineDunkel);
      l.rechteck(wx + 2, y - wh - 2, wb - 5, 1, f.maschineHell);
    }
  }

  // Anleger mit Bogenstapel
  const nx = x + ab + m.werke * m.werkBreite;
  const nb = m.anlegerBreite;
  const nh = m.anlegerHoehe;
  teil(l, s, nx, y - nh, nb, nh, f.maschine);
  l.rechteck(nx + 2, y - nh + 4, nb - 4, nh - 6, f.maschineDunkel);
  const vorrat = z === 'druckt' ? Math.floor((nh - 8) * 0.5) : nh - 9;
  l.rechteck(nx + 3, y - 2 - vorrat, nb - 6, vorrat, f.papier);
  if (s.detail >= 2) for (let i = 2; i < vorrat; i += 2) l.rechteck(nx + 3, y - 2 - i, nb - 6, 1, f.papierSchatten);
  teil(l, s, nx + 1, y - nh - 3, nb - 4, 3, f.maschineDunkel);

  if (s.detail >= 2) l.rechteck(x, y - 2, gesamt, 2, f.maschineDunkel);
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
