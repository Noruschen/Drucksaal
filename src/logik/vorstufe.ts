// Bereich Polygraf (Medienvorstufe): Die Lauftasche zeigt eine Seite mit vier Elementen (Text und Bild).
// Der Spieler baut sie am Rechner nach: Element wählen, Feld antippen. Stimmt die Seite, kommt die nächste Lauftasche.
// Jede Lauftasche hat ein Zeitlimit. Kein Bezug zu Phaser oder zum Browser.

import type { Zufall } from './zufall';

export interface VorstufeEinstellungen {
  /** Dauer der Schicht in Sekunden */
  dauer: number;
  /** Zeit pro Lauftasche in Sekunden, danach gilt sie als verspätet */
  zeitlimit: number;
  punktePuenktlich: number;
  punkteVerspaetet: number;
  /** Raster der Seite */
  spalten: number;
  zeilen: number;
  /** Elemente, die auf jeder Seite platziert werden */
  elemente: string[];
}

/** Belegung der Felder einer Seite, zeilenweise von links oben. null = leeres Feld. */
export type Seite = (string | null)[];

export interface Vorlage {
  nummer: number;
  seite: Seite;
  erschienen: number;
  /** Bis zu dieser Spielzeit gilt die Lauftasche als pünktlich */
  limit: number;
}

export interface VorstufeAuswertung {
  punkte: number;
  puenktlich: number;
  verspaetet: number;
  /** Richtig nachgebaute Seiten, pünktlich oder verspätet */
  fertigeSeiten: number;
  /** true = die letzte Lauftasche war am Schichtende offen und ihr Zeitlimit abgelaufen (zählt als verspätet) */
  offenVerspaetet: boolean;
  /** Wie oft eine fertig belegte Seite nicht mit der Vorlage übereinstimmte */
  fehlversuche: number;
  /** Durchschnittliche Zeit pro fertige Seite in Sekunden, 0 ohne fertige Seite */
  schnitt: number;
}

export type Ablage =
  | { art: 'gesetzt' }
  | { art: 'fertig'; puenktlich: boolean }
  /** Alle Elemente gesetzt, aber falsch: Diese Felder wurden wieder geleert. */
  | { art: 'falsch'; felder: number[] }
  | { art: 'nichts' };

export class Vorstufe {
  zeit = 0;
  punkte = 0;
  puenktlich = 0;
  verspaetet = 0;
  fehlversuche = 0;
  vorlage: Vorlage;
  /** Was der Spieler am Rechner gesetzt hat */
  arbeit: Seite;
  private naechsteNummer = 1;
  private zeitSumme = 0;
  private beendet = false;
  private offenVerspaetet = false;

  constructor(
    readonly einstellungen: VorstufeEinstellungen,
    private readonly zufall: Zufall,
  ) {
    this.arbeit = this.leereSeite();
    this.vorlage = this.neueVorlage(null);
  }

  get felder(): number {
    return this.einstellungen.spalten * this.einstellungen.zeilen;
  }

  get fertig(): boolean {
    return this.beendet;
  }

  /** Restzeit der laufenden Lauftasche, negativ nach Ablauf des Zeitlimits */
  get restzeit(): number {
    return this.vorlage.limit - this.zeit;
  }

  private leereSeite(): Seite {
    return Array.from({ length: this.felder }, () => null);
  }

  private neueVorlage(vorher: Seite | null): Vorlage {
    const e = this.einstellungen;
    let seite: Seite = this.leereSeite();
    // Höchstens 20 Versuche, damit nicht zweimal dieselbe Seite kommt.
    for (let versuch = 0; versuch < 20; versuch++) {
      const plaetze = Array.from({ length: this.felder }, (_, i) => i);
      for (let i = plaetze.length - 1; i > 0; i--) {
        const j = Math.floor(this.zufall() * (i + 1));
        [plaetze[i], plaetze[j]] = [plaetze[j], plaetze[i]];
      }
      seite = this.leereSeite();
      e.elemente.slice(0, this.felder).forEach((element, i) => {
        seite[plaetze[i]] = element;
      });
      if (!vorher || seite.some((wert, i) => wert !== vorher[i])) break;
    }
    return { nummer: this.naechsteNummer++, seite, erschienen: this.zeit, limit: this.zeit + e.zeitlimit };
  }

  /** Wo liegt ein Element auf der Arbeitsseite? -1 = noch nicht gesetzt. */
  platzVon(element: string): number {
    return this.arbeit.indexOf(element);
  }

  /** Setzt ein Element auf ein Feld. Lag es schon woanders, wird es verschoben. Ein Element auf dem Zielfeld wird verdrängt. */
  setze(element: string, feld: number): Ablage {
    if (this.beendet || feld < 0 || feld >= this.felder || !this.einstellungen.elemente.includes(element)) return { art: 'nichts' };
    const alt = this.arbeit.indexOf(element);
    if (alt >= 0) this.arbeit[alt] = null;
    this.arbeit[feld] = element;
    return this.pruefe();
  }

  /** Nimmt das Element von einem Feld weg. */
  entferne(feld: number): void {
    if (this.beendet || feld < 0 || feld >= this.felder) return;
    this.arbeit[feld] = null;
  }

  private pruefe(): Ablage {
    const e = this.einstellungen;
    const gesetzt = this.arbeit.filter((wert) => wert !== null).length;
    if (gesetzt < Math.min(e.elemente.length, this.felder)) return { art: 'gesetzt' };
    const falsch: number[] = [];
    this.arbeit.forEach((wert, i) => {
      if (wert !== null && wert !== this.vorlage.seite[i]) falsch.push(i);
    });
    if (falsch.length > 0) {
      this.fehlversuche++;
      for (const i of falsch) this.arbeit[i] = null;
      return { art: 'falsch', felder: falsch };
    }
    // Seite stimmt: werten und nächste Lauftasche holen.
    const puenktlich = this.zeit <= this.vorlage.limit + 1e-6;
    if (puenktlich) {
      this.puenktlich++;
      this.punkte += e.punktePuenktlich;
    } else {
      this.verspaetet++;
      this.punkte += e.punkteVerspaetet;
    }
    this.zeitSumme += this.zeit - this.vorlage.erschienen;
    const vorher = this.vorlage.seite;
    this.arbeit = this.leereSeite();
    this.vorlage = this.neueVorlage(vorher);
    return { art: 'fertig', puenktlich };
  }

  /** Lässt die Zeit um dt Sekunden laufen. */
  schritt(dt: number): void {
    if (this.beendet) return;
    const e = this.einstellungen;
    this.zeit = Math.min(e.dauer, this.zeit + Math.max(0, dt));
    if (this.zeit >= e.dauer - 1e-9) {
      this.beendet = true;
      // Die angefangene Lauftasche zählt nur als verspätet, wenn ihr Zeitlimit schon abgelaufen ist.
      if (this.zeit > this.vorlage.limit + 1e-6) {
        this.verspaetet++;
        this.punkte += e.punkteVerspaetet;
        this.offenVerspaetet = true;
      }
    }
  }

  auswertung(): VorstufeAuswertung {
    const fertigeSeiten = this.naechsteNummer - 2;
    return {
      punkte: this.punkte,
      puenktlich: this.puenktlich,
      verspaetet: this.verspaetet,
      fertigeSeiten,
      offenVerspaetet: this.offenVerspaetet,
      fehlversuche: this.fehlversuche,
      schnitt: fertigeSeiten > 0 ? this.zeitSumme / fertigeSeiten : 0,
    };
  }
}
