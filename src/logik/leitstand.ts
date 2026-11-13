// Bereich Medientechnologe: Fortdruck am Leitstand überwachen.
// Vier Farben (Cyan, Magenta, Yellow, Black) laufen langsam vom Sollwert weg, der Passer von Magenta
// verschiebt sich von Zeit zu Zeit. Solange alles in der Toleranz liegt, entstehen Gutbogen, sonst Makulatur.
// Kein Bezug zu Phaser oder zum Browser.

import type { Zufall } from './zufall';

export interface LeitstandEinstellungen {
  /** Dauer des Fortdrucks in Sekunden */
  dauer: number;
  bogenProSekunde: number;
  /** Erlaubte Abweichung vom Sollwert (Farbwert von -1 bis +1) */
  toleranz: number;
  /** Änderung des Farbwerts pro Tastendruck */
  schrittFarbe: number;
  /** Höchste Geschwindigkeit, mit der eine Farbe wegläuft (pro Sekunde), am Anfang und am Ende */
  driftAmAnfang: number;
  driftAmEnde: number;
  /** Nach so vielen Sekunden ändert eine Farbe ihre Richtung (von bis) */
  driftWechselVon: number;
  driftWechselBis: number;
  /** Nach so vielen Sekunden verschiebt sich der Passer um einen Schritt (von bis) */
  passerVon: number;
  passerBis: number;
  /** Grösste Verschiebung des Passers in Schritten */
  passerMax: number;
}

export const FARBNAMEN = ['Cyan', 'Magenta', 'Yellow', 'Black'] as const;

export interface Farbkanal {
  /** -1 = viel zu wenig Farbe, 0 = Sollwert, +1 = viel zu viel */
  wert: number;
  /** Änderung pro Sekunde */
  drift: number;
  naechsterWechsel: number;
  /** Sekunden ausserhalb der Toleranz */
  zeitAusserhalb: number;
}

export interface LeitstandAuswertung {
  gutbogen: number;
  makulatur: number;
  /** Anteil Gutbogen in Prozent */
  anteil: number;
  /** Sekunden ausserhalb der Toleranz je Farbe */
  farbeAusserhalb: { name: string; sekunden: number }[];
  /** Sekunden mit verschobenem Passer */
  passerDaneben: number;
}

export class Leitstand {
  zeit = 0;
  private gut = 0;
  private schlecht = 0;
  readonly farben: Farbkanal[];
  /** Verschiebung des Magenta-Passers in Schritten */
  readonly passer = { x: 0, y: 0 };
  passerZeitDaneben = 0;
  private naechsterPasser: number;

  constructor(
    readonly einstellungen: LeitstandEinstellungen,
    private readonly zufall: Zufall,
  ) {
    this.farben = FARBNAMEN.map(() => ({ wert: 0, drift: 0, naechsterWechsel: 0, zeitAusserhalb: 0 }));
    for (const f of this.farben) this.neueDrift(f);
    this.naechsterPasser = this.zwischen(einstellungen.passerVon, einstellungen.passerBis);
  }

  private zwischen(von: number, bis: number): number {
    return von + this.zufall() * (bis - von);
  }

  private neueDrift(f: Farbkanal): void {
    const e = this.einstellungen;
    const fortschritt = Math.min(1, this.zeit / e.dauer);
    const hoechstens = e.driftAmAnfang + (e.driftAmEnde - e.driftAmAnfang) * fortschritt;
    // Mindestens 40 Prozent der Höchstgeschwindigkeit, damit jede Farbe spürbar wandert.
    const betrag = hoechstens * (0.4 + 0.6 * this.zufall());
    f.drift = this.zufall() < 0.5 ? -betrag : betrag;
    f.naechsterWechsel = this.zeit + this.zwischen(e.driftWechselVon, e.driftWechselBis);
  }

  get fertig(): boolean {
    return this.zeit >= this.einstellungen.dauer - 1e-9;
  }

  get gutbogen(): number {
    return Math.floor(this.gut + 1e-9);
  }

  /** Makulatur = alle gedruckten Bogen minus Gutbogen, damit die Summe immer aufgeht. */
  get makulatur(): number {
    return Math.floor(this.gut + this.schlecht + 1e-6) - this.gutbogen;
  }

  inToleranz(i: number): boolean {
    return Math.abs(this.farben[i].wert) <= this.einstellungen.toleranz + 1e-9;
  }

  get passerStimmt(): boolean {
    return this.passer.x === 0 && this.passer.y === 0;
  }

  get allesGut(): boolean {
    return this.passerStimmt && this.farben.every((_, i) => this.inToleranz(i));
  }

  /** Mehr Farbe (richtung +1) oder weniger Farbe (richtung -1). */
  stelleFarbe(i: number, richtung: 1 | -1): void {
    if (this.fertig) return;
    const f = this.farben[i];
    if (!f) return;
    f.wert = Math.max(-1, Math.min(1, f.wert + richtung * this.einstellungen.schrittFarbe));
  }

  /** Verschiebt den Magenta-Passer um einen Schritt. */
  stellePasser(dx: number, dy: number): void {
    if (this.fertig) return;
    const max = this.einstellungen.passerMax;
    this.passer.x = Math.max(-max, Math.min(max, this.passer.x + Math.sign(dx)));
    this.passer.y = Math.max(-max, Math.min(max, this.passer.y + Math.sign(dy)));
  }

  private verschiebePasser(): void {
    const e = this.einstellungen;
    const achse = this.zufall() < 0.5 ? 'x' : 'y';
    let schritt = this.zufall() < 0.5 ? -1 : 1;
    if (Math.abs(this.passer[achse] + schritt) > e.passerMax) schritt = -schritt;
    this.passer[achse] += schritt;
    this.naechsterPasser = this.zeit + this.zwischen(e.passerVon, e.passerBis);
  }

  /** Lässt die Zeit um dt Sekunden laufen. */
  schritt(dt: number): void {
    const e = this.einstellungen;
    let rest = Math.min(dt, e.dauer - this.zeit);
    // In kleinen Stücken rechnen, damit das Ergebnis nicht von der Bildrate abhängt.
    while (rest > 1e-9) {
      const stueck = Math.min(rest, 0.05);
      const gut = this.allesGut;
      if (gut) this.gut += e.bogenProSekunde * stueck;
      else this.schlecht += e.bogenProSekunde * stueck;
      this.farben.forEach((f, i) => {
        if (!this.inToleranz(i)) f.zeitAusserhalb += stueck;
        f.wert = Math.max(-1, Math.min(1, f.wert + f.drift * stueck));
      });
      if (!this.passerStimmt) this.passerZeitDaneben += stueck;
      this.zeit += stueck;
      rest -= stueck;
      for (const f of this.farben) if (this.zeit >= f.naechsterWechsel) this.neueDrift(f);
      if (this.zeit >= this.naechsterPasser) this.verschiebePasser();
    }
  }

  auswertung(): LeitstandAuswertung {
    const summe = this.gut + this.schlecht;
    return {
      gutbogen: this.gutbogen,
      makulatur: this.makulatur,
      anteil: summe > 0 ? (100 * this.gut) / summe : 0,
      farbeAusserhalb: this.farben.map((f, i) => ({ name: FARBNAMEN[i], sekunden: f.zeitAusserhalb })),
      passerDaneben: this.passerZeitDaneben,
    };
  }
}
