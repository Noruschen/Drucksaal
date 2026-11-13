// Bereich Schneiden: Paletten mit Druckbogen kommen auf den Rüttler und dann in die Schneidemaschine.
// Der Monitor zeigt den Druckbogen mit den Nutzen und roten Linien. Der Spieler wählt die richtigen Schnitte
// (rund um die Nutzen und zwischen ihnen) und löst dann den Schnitt aus. Kein Bezug zu Phaser oder zum Browser.

import type { Zufall } from './zufall';

export interface Schnittbild {
  name: string;
  /** Nutzen nebeneinander und übereinander auf dem Druckbogen */
  spalten: number;
  zeilen: number;
}

export interface SchneidenEinstellungen {
  /** Dauer der Schicht in Sekunden */
  dauer: number;
  /** So lange liegt der Stapel auf dem Rüttler */
  ruettelZeit: number;
  /** Zeit pro Schnitt in der Schneidemaschine */
  schnittZeit: number;
  /** Rand des Druckbogens um die Nutzen, als Anteil der Bogenbreite und Bogenhöhe */
  rand: number;
  /** Anzahl falscher Linien (mitten durch einen Nutzen) pro Bogen */
  falscheLinienMin: number;
  falscheLinienMax: number;
  /** Anzahl Paletten, die bereitstehen */
  wartend: number;
  punkteRichtig: number;
  punkteFehlschnitt: number;
  auftraege: Schnittbild[];
}

export interface Linie {
  richtung: 'senkrecht' | 'waagrecht';
  /** Lage auf dem Bogen von 0 (links oder oben) bis 1 (rechts oder unten) */
  lage: number;
  /** true = hier muss geschnitten werden */
  richtig: boolean;
  gewaehlt: boolean;
}

export interface Stapel {
  nummer: number;
  auftrag: Schnittbild;
  linien: Linie[];
}

export type Phase = 'leer' | 'ruetteln' | 'bereit' | 'schneiden';
export type Schnitt = 'nichts' | 'richtig' | 'fehlschnitt';

export interface SchneidenAuswertung {
  punkte: number;
  /** Richtig geschnittene Paletten */
  richtig: number;
  /** Paletten mit Fehlschnitt (Makulatur) */
  fehlschnitte: number;
  /** Ausgeführte Schnitte der richtig geschnittenen Paletten */
  schnitte: number;
}

export function nutzen(a: Schnittbild): number {
  return a.spalten * a.zeilen;
}

export class Schneiden {
  zeit = 0;
  punkte = 0;
  richtig = 0;
  fehlschnitte = 0;
  schnitte = 0;
  /** Bereitstehende Paletten, feste Plätze */
  eingang: Stapel[] = [];
  /** Palette auf dem Rüttler oder in der Schneidemaschine */
  aktiv: Stapel | null = null;
  phase: Phase = 'leer';
  /** Restzeit der laufenden Phase (rütteln oder schneiden) */
  phaseRest = 0;
  private naechsteNummer = 1;
  private beendet = false;

  constructor(
    readonly einstellungen: SchneidenEinstellungen,
    private readonly zufall: Zufall,
  ) {
    for (let i = 0; i < einstellungen.wartend; i++) this.eingang.push(this.neuerStapel());
  }

  get fertig(): boolean {
    return this.beendet;
  }

  private neuerStapel(): Stapel {
    const e = this.einstellungen;
    const auftrag = e.auftraege[Math.floor(this.zufall() * e.auftraege.length)];
    const linien: Linie[] = [];
    const innen = 1 - 2 * e.rand;
    const falsch: Linie[] = [];
    for (let i = 0; i <= auftrag.spalten; i++) linien.push({ richtung: 'senkrecht', lage: e.rand + (i * innen) / auftrag.spalten, richtig: true, gewaehlt: false });
    for (let i = 0; i <= auftrag.zeilen; i++) linien.push({ richtung: 'waagrecht', lage: e.rand + (i * innen) / auftrag.zeilen, richtig: true, gewaehlt: false });
    for (let i = 0; i < auftrag.spalten; i++) falsch.push({ richtung: 'senkrecht', lage: e.rand + ((i + 0.5) * innen) / auftrag.spalten, richtig: false, gewaehlt: false });
    for (let i = 0; i < auftrag.zeilen; i++) falsch.push({ richtung: 'waagrecht', lage: e.rand + ((i + 0.5) * innen) / auftrag.zeilen, richtig: false, gewaehlt: false });
    // Falsche Linien mischen und einige davon zeigen
    for (let i = falsch.length - 1; i > 0; i--) {
      const j = Math.floor(this.zufall() * (i + 1));
      [falsch[i], falsch[j]] = [falsch[j], falsch[i]];
    }
    const anzahl = Math.min(falsch.length, e.falscheLinienMin + Math.floor(this.zufall() * (e.falscheLinienMax - e.falscheLinienMin + 1)));
    linien.push(...falsch.slice(0, anzahl));
    return { nummer: this.naechsteNummer++, auftrag, linien };
  }

  /** Palette aus dem Eingang auf den Rüttler stellen. Geht nur, wenn Rüttler und Schneidemaschine frei sind. */
  nimm(nummer: number): boolean {
    if (this.beendet || this.phase !== 'leer') return false;
    const platz = this.eingang.findIndex((s) => s.nummer === nummer);
    if (platz < 0) return false;
    this.aktiv = this.eingang[platz];
    this.eingang[platz] = this.neuerStapel();
    this.phase = 'ruetteln';
    this.phaseRest = this.einstellungen.ruettelZeit;
    return true;
  }

  /** Linie auf dem Monitor an- oder abwählen. Geht schon während des Rüttelns. */
  waehle(index: number): boolean {
    if (this.beendet || !this.aktiv || (this.phase !== 'ruetteln' && this.phase !== 'bereit')) return false;
    const linie = this.aktiv.linien[index];
    if (!linie) return false;
    linie.gewaehlt = !linie.gewaehlt;
    return true;
  }

  /** Schnitt auslösen. Stimmen die gewählten Linien nicht genau, ist der Stapel Makulatur. */
  schneide(): Schnitt {
    if (this.beendet || !this.aktiv || this.phase !== 'bereit') return 'nichts';
    const linien = this.aktiv.linien;
    if (!linien.some((l) => l.gewaehlt)) return 'nichts';
    const e = this.einstellungen;
    if (linien.every((l) => l.gewaehlt === l.richtig)) {
      const anzahl = linien.filter((l) => l.richtig).length;
      this.richtig++;
      this.schnitte += anzahl;
      this.punkte += e.punkteRichtig;
      this.phase = 'schneiden';
      this.phaseRest = anzahl * e.schnittZeit;
      return 'richtig';
    }
    this.fehlschnitte++;
    this.punkte += e.punkteFehlschnitt;
    this.aktiv = null;
    this.phase = 'leer';
    this.phaseRest = 0;
    return 'fehlschnitt';
  }

  /** Lässt die Zeit um dt Sekunden laufen. */
  schritt(dt: number): void {
    if (this.beendet) return;
    const e = this.einstellungen;
    const schritt = Math.min(Math.max(0, dt), e.dauer - this.zeit);
    this.zeit += schritt;
    if (this.phase === 'ruetteln' || this.phase === 'schneiden') {
      this.phaseRest -= schritt;
      if (this.phaseRest <= 1e-9) {
        this.phaseRest = 0;
        if (this.phase === 'ruetteln') this.phase = 'bereit';
        else {
          this.phase = 'leer';
          this.aktiv = null;
        }
      }
    }
    if (this.zeit >= e.dauer - 1e-9) this.beendet = true;
  }

  auswertung(): SchneidenAuswertung {
    return { punkte: this.punkte, richtig: this.richtig, fehlschnitte: this.fehlschnitte, schnitte: this.schnitte };
  }
}
