// Vorschau Ausrüster, Version C «Ausrüsterei leiten»: Jeder Auftrag hat einen Weg über die Stationen
// (schneiden, falzen, heften). Der Spieler schickt ihn mit je einem Tipp zur nächsten Station, danach auf die
// Rampe und in den Lastwagen. Eine Station bleibt besetzt, bis der fertige Auftrag weitergeschickt ist.
// Kein Bezug zu Phaser oder zum Browser.

import type { Zufall } from './zufall';

export interface StationDaten {
  id: string;
  name: string;
  /** Bearbeitungszeit pro Auftrag */
  dauer: number;
}

export interface AusruestereiEinstellungen {
  dauer: number;
  /** Abstand zwischen zwei neuen Aufträgen */
  takt: number;
  /** Danach kommen keine neuen Aufträge mehr */
  annahmeBis: number;
  startAuftraege: number;
  maxEingang: number;
  stationen: StationDaten[];
  /** Mögliche Wege über die Stationen, mit Gewicht für die Häufigkeit */
  wege: { weg: string[]; gewicht: number }[];
  rampePlaetze: number;
  lastwagenPlaetze: number;
  /** So lange ist der Lastwagen nach der Abfahrt weg */
  fahrzeit: number;
  /** Liefertermin: Summe der Bearbeitungszeiten mal Faktor plus Zuschlag, ab Erscheinen */
  terminFaktor: number;
  terminZuschlag: number;
  punktePuenktlich: number;
  punkteVerspaetet: number;
}

export interface Auftrag {
  nummer: number;
  /** Stationen in der Reihenfolge der Bearbeitung */
  weg: string[];
  /** So viele Stationen sind schon erledigt */
  erledigt: number;
  erschienen: number;
  termin: number;
}

export interface Station {
  daten: StationDaten;
  auftrag: Auftrag | null;
  /** Restzeit der Bearbeitung, 0 = fertig und wartet auf das Weiterschicken */
  rest: number;
}

export type Tipp = 'weiter' | 'rampe' | 'geladen' | 'besetzt' | 'laeuft' | 'nichts';

export interface AusruestereiAuswertung {
  punkte: number;
  puenktlich: number;
  verspaetet: number;
  /** Am Schichtende nicht abgefahren (zählt als verspätet) */
  nichtGeliefert: number;
  fahrten: number;
  /** Zeit, in der fertige Aufträge eine Station besetzt hielten */
  stillstand: number;
}

export class Ausruesterei {
  zeit = 0;
  punkte = 0;
  puenktlich = 0;
  verspaetet = 0;
  nichtGeliefert = 0;
  fahrten = 0;
  stillstand = 0;
  eingang: Auftrag[] = [];
  stationen: Station[];
  rampe: Auftrag[] = [];
  geladen: Auftrag[] = [];
  /** Bis zu dieser Spielzeit ist der Lastwagen weg */
  unterwegsBis = 0;
  private naechsteNummer = 1;
  private naechsterAuftrag: number;
  private beendet = false;

  constructor(
    readonly einstellungen: AusruestereiEinstellungen,
    private readonly zufall: Zufall,
  ) {
    this.stationen = einstellungen.stationen.map((daten) => ({ daten, auftrag: null, rest: 0 }));
    for (let i = 0; i < einstellungen.startAuftraege; i++) this.eingang.push(this.neuerAuftrag());
    this.naechsterAuftrag = einstellungen.takt;
  }

  get fertig(): boolean {
    return this.beendet;
  }

  get lastwagenDa(): boolean {
    return this.zeit >= this.unterwegsBis - 1e-9;
  }

  private neuerAuftrag(): Auftrag {
    const e = this.einstellungen;
    const summe = e.wege.reduce((s, w) => s + w.gewicht, 0);
    let wurf = this.zufall() * summe;
    let weg = e.wege[0].weg;
    for (const w of e.wege) {
      wurf -= w.gewicht;
      if (wurf < 0) {
        weg = w.weg;
        break;
      }
    }
    return this.auftragMit(weg);
  }

  /** Legt einen Auftrag mit festem Weg an (für die Tests). */
  auftragMit(weg: string[]): Auftrag {
    const e = this.einstellungen;
    const arbeit = weg.reduce((s, id) => s + (e.stationen.find((x) => x.id === id)?.dauer ?? 0), 0);
    return { nummer: this.naechsteNummer++, weg: [...weg], erledigt: 0, erschienen: this.zeit, termin: this.zeit + arbeit * e.terminFaktor + e.terminZuschlag };
  }

  private station(id: string): Station | undefined {
    return this.stationen.find((s) => s.daten.id === id);
  }

  /** Schickt einen Auftrag zu seiner nächsten Station oder, wenn alles erledigt ist, auf die Rampe. */
  private schicke(auftrag: Auftrag): 'weiter' | 'rampe' | 'besetzt' {
    if (auftrag.erledigt >= auftrag.weg.length) {
      if (this.rampe.length >= this.einstellungen.rampePlaetze) return 'besetzt';
      this.rampe.push(auftrag);
      return 'rampe';
    }
    const ziel = this.station(auftrag.weg[auftrag.erledigt]);
    if (!ziel || ziel.auftrag) return 'besetzt';
    ziel.auftrag = auftrag;
    ziel.rest = ziel.daten.dauer;
    return 'weiter';
  }

  /** Ein Tipp auf einen Auftrag: Er geht einen Schritt weiter, wenn der nächste Platz frei ist. */
  tippe(nummer: number): Tipp {
    if (this.beendet) return 'nichts';
    const imEingang = this.eingang.findIndex((a) => a.nummer === nummer);
    if (imEingang >= 0) {
      const antwort = this.schicke(this.eingang[imEingang]);
      if (antwort !== 'besetzt') this.eingang.splice(imEingang, 1);
      return antwort;
    }
    const s = this.stationen.find((x) => x.auftrag?.nummer === nummer);
    if (s && s.auftrag) {
      if (s.rest > 0) return 'laeuft';
      const antwort = this.schicke(s.auftrag);
      if (antwort !== 'besetzt') s.auftrag = null;
      return antwort;
    }
    const aufRampe = this.rampe.findIndex((a) => a.nummer === nummer);
    if (aufRampe >= 0) {
      if (!this.lastwagenDa || this.geladen.length >= this.einstellungen.lastwagenPlaetze) return 'besetzt';
      this.geladen.push(this.rampe[aufRampe]);
      this.rampe.splice(aufRampe, 1);
      return 'geladen';
    }
    return 'nichts';
  }

  /** Lastwagen losschicken. Geliefert ist ein Auftrag bei der Abfahrt. */
  abfahrt(): boolean {
    if (this.beendet || !this.lastwagenDa || this.geladen.length === 0) return false;
    const e = this.einstellungen;
    for (const a of this.geladen) {
      if (this.zeit <= a.termin + 1e-6) {
        this.puenktlich++;
        this.punkte += e.punktePuenktlich;
      } else {
        this.verspaetet++;
        this.punkte += e.punkteVerspaetet;
      }
    }
    this.geladen = [];
    this.fahrten++;
    this.unterwegsBis = this.zeit + e.fahrzeit;
    return true;
  }

  /** Lässt die Zeit um dt Sekunden laufen. */
  schritt(dt: number): void {
    if (this.beendet) return;
    const e = this.einstellungen;
    const schritt = Math.min(Math.max(0, dt), e.dauer - this.zeit);
    this.zeit += schritt;
    for (const s of this.stationen) {
      if (!s.auftrag) continue;
      if (s.rest > 0) {
        // Wird der Auftrag mitten im Schritt fertig, zählt der Rest des Schritts schon als Stillstand.
        const ueber = schritt - s.rest;
        s.rest = Math.max(0, s.rest - schritt);
        if (s.rest === 0) {
          s.auftrag.erledigt++;
          this.stillstand += Math.max(0, ueber);
        }
      } else {
        this.stillstand += schritt;
      }
    }
    // Neue Aufträge im Takt, solange Platz ist und die Annahme läuft
    while (this.zeit >= this.naechsterAuftrag - 1e-9) {
      if (this.naechsterAuftrag <= e.annahmeBis + 1e-9 && this.eingang.length < e.maxEingang) this.eingang.push(this.neuerAuftrag());
      this.naechsterAuftrag += e.takt;
    }
    if (this.zeit >= e.dauer - 1e-9) {
      this.beendet = true;
      // Alles, was nicht abgefahren ist, zählt als verspätet.
      const offen = this.eingang.length + this.rampe.length + this.geladen.length + this.stationen.filter((s) => s.auftrag).length;
      this.nichtGeliefert = offen;
      this.verspaetet += offen;
      this.punkte += offen * e.punkteVerspaetet;
    }
  }

  auswertung(): AusruestereiAuswertung {
    return { punkte: this.punkte, puenktlich: this.puenktlich, verspaetet: this.verspaetet, nichtGeliefert: this.nichtGeliefert, fahrten: this.fahrten, stillstand: this.stillstand };
  }
}

/**
 * Spielt viele Schichten automatisch durch, zum Abstimmen der Werte: Alle 0,5 s schickt die automatische
 * Spielweise alles weiter, was weiter kann (dringendster Auftrag zuerst), lädt und fährt ab, sobald der
 * Lastwagen voll ist oder nichts mehr nachkommt.
 */
export function simuliereAusruesterei(e: AusruestereiEinstellungen, schichten: number, zufall: (schicht: number) => Zufall): { quote: number; auftraege: number; fahrten: number } {
  let puenktlich = 0;
  let gesamt = 0;
  let fahrten = 0;
  for (let i = 0; i < schichten; i++) {
    const s = new Ausruesterei(e, zufall(i));
    while (!s.fertig) {
      const fruehZuerst = (a: Auftrag, b: Auftrag): number => a.termin - b.termin;
      for (const a of [...s.rampe].sort(fruehZuerst)) s.tippe(a.nummer);
      for (const st of [...s.stationen].reverse()) if (st.auftrag && st.rest === 0) s.tippe(st.auftrag.nummer);
      for (const a of [...s.eingang].sort(fruehZuerst)) s.tippe(a.nummer);
      const unterwegs = s.eingang.length + s.stationen.filter((x) => x.auftrag).length;
      const dringend = s.geladen.some((a) => a.termin - s.zeit < 6);
      if (s.geladen.length >= e.lastwagenPlaetze || (s.geladen.length > 0 && (unterwegs === 0 || dringend || e.dauer - s.zeit < 2))) s.abfahrt();
      s.schritt(0.5);
    }
    const w = s.auswertung();
    puenktlich += w.puenktlich;
    gesamt += w.puenktlich + w.verspaetet;
    fahrten += w.fahrten;
  }
  return { quote: gesamt > 0 ? (100 * puenktlich) / gesamt : 0, auftraege: gesamt / schichten, fahrten: fahrten / schichten };
}
