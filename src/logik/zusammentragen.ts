// Vorschau Ausrüster, Version B «Zusammentragen»: Für jede Broschüre werden die Falzbogen in der richtigen
// Reihenfolge auf die Sammelkette gelegt: zuerst der innerste Bogen, zuletzt der Umschlag.
// Die Anleger stehen bei jeder Broschüre anders. Kein Bezug zu Phaser oder zum Browser.

import type { Zufall } from './zufall';

export interface ZusammentragenEinstellungen {
  dauer: number;
  /** Teile pro Broschüre samt Umschlag */
  teileVon: number;
  teileBis: number;
  /** Zeit pro Broschüre, danach gilt sie als verspätet und die nächste kommt */
  zeitlimit: number;
  punkteRichtig: number;
  punkteFehler: number;
}

/** 0 = Umschlag, 1 = Bogen 1 (aussen), höhere Zahl = weiter innen */
export type Teil = number;

export interface Auftrag {
  nummer: number;
  /** Reihenfolge zum Auflegen: innerster Bogen zuerst, Umschlag zuletzt */
  reihenfolge: Teil[];
  /** Welcher Teil in welchem Anleger liegt, von links nach rechts */
  anleger: Teil[];
  /** So viele Teile liegen schon richtig auf der Kette */
  gelegt: number;
  /** Bis zu dieser Spielzeit gilt die Broschüre als pünktlich */
  limit: number;
}

export type Griff = 'gelegt' | 'fertig' | 'falsch' | 'nichts';

export interface ZusammentragenAuswertung {
  punkte: number;
  richtig: number;
  falsch: number;
  verspaetet: number;
}

export class Zusammentragen {
  zeit = 0;
  punkte = 0;
  richtig = 0;
  falsch = 0;
  verspaetet = 0;
  auftrag: Auftrag;
  private naechsteNummer = 1;
  private beendet = false;

  constructor(
    readonly einstellungen: ZusammentragenEinstellungen,
    private readonly zufall: Zufall,
  ) {
    this.auftrag = this.neuerAuftrag();
  }

  get fertig(): boolean {
    return this.beendet;
  }

  get restzeit(): number {
    return this.auftrag.limit - this.zeit;
  }

  private neuerAuftrag(): Auftrag {
    const e = this.einstellungen;
    const teile = e.teileVon + Math.floor(this.zufall() * (e.teileBis - e.teileVon + 1));
    // Innerster Bogen zuerst (höchste Nummer), Umschlag (0) zuletzt
    const reihenfolge: Teil[] = [];
    for (let t = teile - 1; t >= 0; t--) reihenfolge.push(t);
    const anleger = [...reihenfolge];
    // Mischen, bis die Anleger nicht zufällig schon in der Reihenfolge der Lauftasche stehen (höchstens 20 Versuche).
    for (let versuch = 0; versuch < 20; versuch++) {
      for (let i = anleger.length - 1; i > 0; i--) {
        const j = Math.floor(this.zufall() * (i + 1));
        [anleger[i], anleger[j]] = [anleger[j], anleger[i]];
      }
      if (anleger.some((teil, i) => teil !== reihenfolge[i])) break;
    }
    return { nummer: this.naechsteNummer++, reihenfolge, anleger, gelegt: 0, limit: this.zeit + e.zeitlimit };
  }

  /** Anleger antippen: Er legt seinen Teil auf die Kette. */
  greife(anleger: number): Griff {
    if (this.beendet) return 'nichts';
    const a = this.auftrag;
    const teil = a.anleger[anleger];
    if (teil === undefined) return 'nichts';
    // Schon gelegte Teile lassen sich nicht nochmals legen
    if (a.reihenfolge.indexOf(teil) < a.gelegt) return 'nichts';
    const e = this.einstellungen;
    if (teil !== a.reihenfolge[a.gelegt]) {
      this.falsch++;
      this.punkte += e.punkteFehler;
      this.auftrag = this.neuerAuftrag();
      return 'falsch';
    }
    a.gelegt++;
    if (a.gelegt < a.reihenfolge.length) return 'gelegt';
    this.richtig++;
    this.punkte += e.punkteRichtig;
    this.auftrag = this.neuerAuftrag();
    return 'fertig';
  }

  /** Lässt die Zeit um dt Sekunden laufen. Gibt true zurück, wenn dabei eine Broschüre ihr Zeitlimit überschritten hat. */
  schritt(dt: number): boolean {
    if (this.beendet) return false;
    const e = this.einstellungen;
    this.zeit = Math.min(e.dauer, this.zeit + Math.max(0, dt));
    let abgelaufen = false;
    if (this.zeit >= e.dauer - 1e-9) this.beendet = true;
    else if (this.zeit > this.auftrag.limit) {
      this.verspaetet++;
      this.punkte += e.punkteFehler;
      this.auftrag = this.neuerAuftrag();
      abgelaufen = true;
    }
    return abgelaufen;
  }

  auswertung(): ZusammentragenAuswertung {
    return { punkte: this.punkte, richtig: this.richtig, falsch: this.falsch, verspaetet: this.verspaetet };
  }
}
