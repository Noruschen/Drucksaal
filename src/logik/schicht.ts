import { dauerFuerAuftrag, phasen, schnellsteDauer } from './dauer';
import type { Auftrag, Einstellungen, Ergebnis, Farbigkeit, Maschinendaten, Phase, Prognose, Zahlenmodell, Zuteilung } from './typen';
import type { Zufall } from './zufall';

const EPS = 1e-9;

export interface LaufenderAuftrag {
  zuteilung: Zuteilung;
  phasen: Phase[];
  phasenIndex: number;
  /** Bereits abgelaufene Zeit in der aktuellen Phase */
  phasenZeit: number;
}

export interface Maschinenzustand {
  daten: Maschinendaten;
  laufend: LaufenderAuftrag | null;
  wartend: Zuteilung[];
}

export type Abschnitt = 'schicht' | 'zeitraffer' | 'fertig';

export type Ablehnung = 'voll' | 'unbekannt' | 'beendet';

/** Eine Schicht: Lauftaschen kommen, werden zugeteilt, Maschinen arbeiten ab. */
export class Schicht {
  zeit = 0;
  punkte = 0;
  readonly offen: Auftrag[] = [];
  readonly maschinen: Maschinenzustand[];
  readonly ergebnisse: Ergebnis[] = [];
  private naechsteNummer = 1;
  private naechsterTakt: number;
  private schichtBeendet = false;

  constructor(
    readonly modell: Zahlenmodell,
    readonly einstellungen: Einstellungen,
    private readonly zufall: Zufall,
  ) {
    this.maschinen = modell.maschinen.map((daten) => ({ daten, laufend: null, wartend: [] }));
    this.naechsterTakt = einstellungen.ersteLauftascheNach;
  }

  get abschnitt(): Abschnitt {
    if (!this.schichtBeendet) return 'schicht';
    return this.maschinen.some((m) => m.laufend) ? 'zeitraffer' : 'fertig';
  }

  get puenktlich(): number {
    return this.ergebnisse.filter((e) => e.puenktlich).length;
  }

  get verspaetet(): number {
    return this.ergebnisse.filter((e) => !e.puenktlich).length;
  }

  maschine(id: string): Maschinenzustand {
    const m = this.maschinen.find((x) => x.daten.id === id);
    if (!m) throw new Error(`Unbekannte Maschine: ${id}`);
    return m;
  }

  /** Erzeugt einen Auftrag nach den Startwerten. */
  neuerAuftrag(): Auftrag {
    const e = this.einstellungen;
    const summe = e.auflagenKlassen.reduce((s, k) => s + k.anteil, 0);
    let wurf = this.zufall() * summe;
    let klasse = e.auflagenKlassen[e.auflagenKlassen.length - 1];
    for (const k of e.auflagenKlassen) {
      if (wurf < k.anteil) {
        klasse = k;
        break;
      }
      wurf -= k.anteil;
    }
    const stufen = Math.floor((klasse.bis - klasse.von) / e.auflagenSchritt) + 1;
    const auflage = klasse.von + Math.floor(this.zufall() * stufen) * e.auflagenSchritt;
    const farbigkeit: Farbigkeit = this.zufall() < e.anteilVierVier ? '4/4' : '4/0';
    return this.auftragMit(auflage, farbigkeit);
  }

  /** Legt einen Auftrag mit festen Werten an (auch für Tests). */
  auftragMit(auflage: number, farbigkeit: Farbigkeit): Auftrag {
    const e = this.einstellungen;
    return {
      nummer: this.naechsteNummer++,
      auflage,
      farbigkeit,
      erschienen: this.zeit,
      termin: this.zeit + schnellsteDauer(this.modell, auflage, farbigkeit) * e.terminFaktor + e.terminZuschlag,
    };
  }

  /** Legt eine Lauftasche auf den Tisch. Gibt false zurück, wenn schon das Maximum offen ist. */
  lauftascheAuflegen(a: Auftrag): boolean {
    if (this.offen.length >= this.einstellungen.maxOffeneLauftaschen) return false;
    this.offen.push(a);
    return true;
  }

  /** Zeit, bis die Maschine alles Zugeteilte abgearbeitet hat. */
  besetztNoch(m: Maschinenzustand): number {
    let rest = 0;
    if (m.laufend) {
      const l = m.laufend;
      rest += l.phasen[l.phasenIndex].dauer - l.phasenZeit;
      for (let i = l.phasenIndex + 1; i < l.phasen.length; i++) rest += l.phasen[i].dauer;
    }
    for (const z of m.wartend) rest += dauerFuerAuftrag(m.daten, z.auftrag);
    return rest;
  }

  istVoll(m: Maschinenzustand): boolean {
    return m.laufend !== null && m.wartend.length >= this.einstellungen.maxWartendProMaschine;
  }

  /** Voraussichtliche Fertigzeit auf jeder Maschine, Wartezeit eingerechnet. Volle Maschine: null. */
  prognose(a: Auftrag): Prognose {
    const p: Prognose = {};
    for (const m of this.maschinen) {
      p[m.daten.id] = this.istVoll(m) ? null : this.zeit + this.besetztNoch(m) + dauerFuerAuftrag(m.daten, a);
    }
    return p;
  }

  /** Teilt eine offene Lauftasche einer Maschine zu. Lässt sich nicht zurücknehmen. */
  zuteilen(auftragNummer: number, maschinenId: string): { ok: true } | { ok: false; grund: Ablehnung } {
    if (this.schichtBeendet) return { ok: false, grund: 'beendet' };
    const index = this.offen.findIndex((a) => a.nummer === auftragNummer);
    const m = this.maschinen.find((x) => x.daten.id === maschinenId);
    if (index < 0 || !m) return { ok: false, grund: 'unbekannt' };
    if (this.istVoll(m)) return { ok: false, grund: 'voll' };
    const auftrag = this.offen[index];
    const zuteilung: Zuteilung = { auftrag, maschine: m.daten.id, zugeteiltUm: this.zeit, prognose: this.prognose(auftrag) };
    this.offen.splice(index, 1);
    if (m.laufend) m.wartend.push(zuteilung);
    else this.starte(m, zuteilung);
    return { ok: true };
  }

  private starte(m: Maschinenzustand, z: Zuteilung): void {
    m.laufend = { zuteilung: z, phasen: phasen(m.daten, z.auftrag.auflage, z.auftrag.farbigkeit), phasenIndex: 0, phasenZeit: 0 };
  }

  private werte(e: Ergebnis): void {
    this.ergebnisse.push(e);
    this.punkte += e.puenktlich ? this.einstellungen.punktePuenktlich : this.einstellungen.punkteVerspaetet;
  }

  /** Lässt eine Maschine von this.zeit bis bis arbeiten. */
  private arbeite(m: Maschinenzustand, bis: number): void {
    let jetzt = this.zeit;
    while (m.laufend && jetzt < bis - EPS) {
      const l = m.laufend;
      const phase = l.phasen[l.phasenIndex];
      const rest = phase.dauer - l.phasenZeit;
      const schritt = Math.min(rest, bis - jetzt);
      l.phasenZeit += schritt;
      jetzt += schritt;
      if (l.phasenZeit >= phase.dauer - EPS) {
        l.phasenIndex++;
        l.phasenZeit = 0;
        if (l.phasenIndex >= l.phasen.length) {
          const a = l.zuteilung.auftrag;
          this.werte({ auftrag: a, maschine: m.daten.id, fertigUm: jetzt, puenktlich: jetzt <= a.termin + 1e-6, prognose: l.zuteilung.prognose });
          m.laufend = null;
          const naechste = m.wartend.shift();
          if (naechste) this.starte(m, naechste);
        }
      }
    }
  }

  /** Lässt die Spielzeit um dt Sekunden laufen. */
  schritt(dt: number): void {
    const ziel = this.zeit + dt;
    const ende = this.einstellungen.schichtDauer;
    while (this.zeit < ziel - EPS) {
      let bis = ziel;
      if (!this.schichtBeendet) bis = Math.min(bis, ende, this.naechsterTakt);
      for (const m of this.maschinen) this.arbeite(m, bis);
      this.zeit = bis;
      if (!this.schichtBeendet && this.zeit >= ende - EPS) {
        // Schichtende: keine neuen Lauftaschen, nicht verteilte zählen als verspätet.
        this.schichtBeendet = true;
        for (const a of this.offen.splice(0)) this.werte({ auftrag: a, maschine: null, fertigUm: null, puenktlich: false, prognose: null });
      } else if (!this.schichtBeendet && this.zeit >= this.naechsterTakt - EPS) {
        this.naechsterTakt += this.einstellungen.takt;
        // Sind schon genug Lauftaschen offen, fällt dieser Takt aus.
        if (this.offen.length < this.einstellungen.maxOffeneLauftaschen) this.lauftascheAuflegen(this.neuerAuftrag());
      }
      if (this.abschnitt === 'fertig') break;
    }
  }
}
