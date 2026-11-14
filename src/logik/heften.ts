// Vorschau Ausrüster, Version A «Heften im Takt»: Broschüren laufen auf der Sammelkette unter dem Heftkopf durch.
// Der Spieler heftet im richtigen Moment. Unvollständige Broschüren (Fehlbogen) lässt er ungeheftet durchlaufen.
// Kein Bezug zu Phaser oder zum Browser.

import type { Zufall } from './zufall';

export interface HeftenEinstellungen {
  dauer: number;
  /** Tempo der Kette am Anfang und am Ende der Schicht, in Kettenlängen pro Sekunde */
  tempoStart: number;
  tempoEnde: number;
  /** Abstand zwischen zwei Broschüren, in Kettenlängen */
  abstandVon: number;
  abstandBis: number;
  /** So nah am Heftkopf (Lage 0.5) gilt die Heftung als genau */
  toleranz: number;
  /** Bis zu diesem Abstand wird trotzdem geheftet, aber schief (Makulatur) */
  schiefBis: number;
  /** Anteil unvollständiger Broschüren, die nicht geheftet werden dürfen */
  fehlbogenAnteil: number;
  punkteGeheftet: number;
  punkteFehler: number;
}

export type Zustand = 'offen' | 'geheftet' | 'schief';

export interface Broschuere {
  nummer: number;
  /** Lage auf der Kette, 0 = links, 1 = rechts */
  lage: number;
  /** true = ein Bogen fehlt, darf nicht geheftet werden */
  fehlbogen: boolean;
  zustand: Zustand;
}

export type Heftung = 'genau' | 'schief' | 'fehlbogen' | 'leer';

export interface HeftenAuswertung {
  punkte: number;
  /** Genau geheftete, vollständige Broschüren */
  geheftet: number;
  /** Schief geheftet (Makulatur) */
  schief: number;
  /** Vollständige Broschüren, die ungeheftet durchliefen */
  verpasst: number;
  /** Unvollständige Broschüren, die geheftet wurden */
  fehlbogenGeheftet: number;
  /** Unvollständige Broschüren, die richtig ungeheftet blieben */
  fehlbogenErkannt: number;
}

export const HEFTKOPF = 0.5;

export class Heften {
  zeit = 0;
  punkte = 0;
  geheftet = 0;
  schief = 0;
  verpasst = 0;
  fehlbogenGeheftet = 0;
  fehlbogenErkannt = 0;
  kette: Broschuere[] = [];
  private naechsteNummer = 1;
  private naechsterAbstand = 0;
  private beendet = false;

  constructor(
    readonly einstellungen: HeftenEinstellungen,
    private readonly zufall: Zufall,
  ) {
    this.lege();
  }

  get fertig(): boolean {
    return this.beendet;
  }

  /** Aktuelles Tempo der Kette: steigt gleichmässig über die Schicht. */
  get tempo(): number {
    const e = this.einstellungen;
    return e.tempoStart + (e.tempoEnde - e.tempoStart) * Math.min(1, this.zeit / e.dauer);
  }

  private lege(): void {
    const e = this.einstellungen;
    this.kette.push({ nummer: this.naechsteNummer++, lage: 0, fehlbogen: this.zufall() < e.fehlbogenAnteil, zustand: 'offen' });
    this.naechsterAbstand = e.abstandVon + this.zufall() * (e.abstandBis - e.abstandVon);
  }

  /** Heftkopf auslösen. Trifft die Broschüre, die dem Heftkopf am nächsten ist. */
  hefte(): Heftung {
    if (this.beendet) return 'leer';
    const e = this.einstellungen;
    let ziel: Broschuere | null = null;
    for (const b of this.kette) {
      if (b.zustand !== 'offen') continue;
      if (!ziel || Math.abs(b.lage - HEFTKOPF) < Math.abs(ziel.lage - HEFTKOPF)) ziel = b;
    }
    if (!ziel) return 'leer';
    const abstand = Math.abs(ziel.lage - HEFTKOPF);
    if (abstand > e.schiefBis) return 'leer';
    if (ziel.fehlbogen) {
      ziel.zustand = 'schief';
      this.fehlbogenGeheftet++;
      this.punkte += e.punkteFehler;
      return 'fehlbogen';
    }
    if (abstand <= e.toleranz + 1e-9) {
      ziel.zustand = 'geheftet';
      this.geheftet++;
      this.punkte += e.punkteGeheftet;
      return 'genau';
    }
    ziel.zustand = 'schief';
    this.schief++;
    this.punkte += e.punkteFehler;
    return 'schief';
  }

  /** Lässt die Zeit um dt Sekunden laufen. */
  schritt(dt: number): void {
    if (this.beendet) return;
    const e = this.einstellungen;
    const schritt = Math.min(Math.max(0, dt), e.dauer - this.zeit);
    const weg = this.tempo * schritt;
    this.zeit += schritt;
    for (const b of this.kette) b.lage += weg;
    // Am Ende der Kette: werten, was ungeheftet durchgelaufen ist
    for (const b of this.kette) {
      if (b.lage <= 1 || b.zustand !== 'offen') continue;
      if (b.fehlbogen) this.fehlbogenErkannt++;
      else {
        this.verpasst++;
        this.punkte += e.punkteFehler;
      }
    }
    this.kette = this.kette.filter((b) => b.lage <= 1);
    const letzte = this.kette[this.kette.length - 1];
    if (!letzte || letzte.lage >= this.naechsterAbstand) this.lege();
    if (this.zeit >= e.dauer - 1e-9) this.beendet = true;
  }

  auswertung(): HeftenAuswertung {
    return { punkte: this.punkte, geheftet: this.geheftet, schief: this.schief, verpasst: this.verpasst, fehlbogenGeheftet: this.fehlbogenGeheftet, fehlbogenErkannt: this.fehlbogenErkannt };
  }
}
