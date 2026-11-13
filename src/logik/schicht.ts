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
  /** Hilferuf des Druckers: in welcher Phase und nach wie vielen Sekunden dieser Phase. null = kein Hilferuf */
  hilferuf: { phase: number; nach: number } | null;
}

export interface Maschinenzustand {
  daten: Maschinendaten;
  laufend: LaufenderAuftrag | null;
  wartend: Zuteilung[];
  /** true = der Drucker ruft um Hilfe, der Fortdruck steht, bis der Produktionsleiter hilft */
  gestoert: boolean;
  /** Sekunden, die diese Maschine wegen Hilferufen gestanden ist */
  stillstand: number;
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
    this.maschinen = modell.maschinen.map((daten) => ({ daten, laufend: null, wartend: [], gestoert: false, stillstand: 0 }));
    this.naechsterTakt = einstellungen.ersteLauftascheNach;
    // Zum Schichtbeginn liegen schon Lauftaschen bereit: je eine aus den ersten Auflagenklassen (klein, mittel, gross).
    const anzahl = Math.min(einstellungen.startLauftaschen ?? 0, einstellungen.auflagenKlassen.length, einstellungen.maxOffeneLauftaschen);
    for (let i = 0; i < anzahl; i++) this.lauftascheAuflegen(this.auftragAusKlasse(einstellungen.auflagenKlassen[i]));
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
    return this.auftragAusKlasse(klasse);
  }

  /** Erzeugt einen Auftrag aus einer bestimmten Auflagenklasse (klein, mittel, gross). */
  private auftragAusKlasse(klasse: { von: number; bis: number }): Auftrag {
    const e = this.einstellungen;
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
    const liste = phasen(m.daten, z.auftrag.auflage, z.auftrag.farbigkeit);
    // Bei einem Teil der Aufträge ruft der Drucker mitten im Fortdruck um Hilfe.
    let hilferuf: LaufenderAuftrag['hilferuf'] = null;
    const anteil = this.einstellungen.hilferufAnteil ?? 0;
    if (anteil > 0 && this.zufall() < anteil) {
      const druck = liste.findIndex((p) => p.art === 'drucken');
      if (druck >= 0) hilferuf = { phase: druck, nach: liste[druck].dauer * (0.2 + 0.6 * this.zufall()) };
    }
    m.laufend = { zuteilung: z, phasen: liste, phasenIndex: 0, phasenZeit: 0, hilferuf };
  }

  /** Anzahl Hilferufe in dieser Schicht */
  hilferufe = 0;

  /** Der Produktionsleiter hilft dem Drucker: Der Fortdruck läuft weiter. */
  hilf(maschinenId: string): boolean {
    const m = this.maschinen.find((x) => x.daten.id === maschinenId);
    if (!m || !m.gestoert) return false;
    m.gestoert = false;
    return true;
  }

  private werte(e: Ergebnis): void {
    this.ergebnisse.push(e);
    this.punkte += e.puenktlich ? this.einstellungen.punktePuenktlich : this.einstellungen.punkteVerspaetet;
  }

  /** Lässt eine Maschine von this.zeit bis bis arbeiten. */
  private arbeite(m: Maschinenzustand, bis: number): void {
    let jetzt = this.zeit;
    while (m.laufend && jetzt < bis - EPS) {
      if (m.gestoert) {
        // Der Fortdruck steht, bis geholfen wird.
        m.stillstand += bis - jetzt;
        return;
      }
      const l = m.laufend;
      const phase = l.phasen[l.phasenIndex];
      const rest = phase.dauer - l.phasenZeit;
      let schritt = Math.min(rest, bis - jetzt);
      // Kommt in diesem Schritt der Hilferuf, läuft die Maschine nur bis dorthin.
      const ruf = l.hilferuf && l.hilferuf.phase === l.phasenIndex ? l.hilferuf.nach - l.phasenZeit : null;
      if (ruf !== null && ruf <= schritt + EPS) {
        schritt = Math.max(0, ruf);
        l.phasenZeit += schritt;
        jetzt += schritt;
        l.hilferuf = null;
        m.gestoert = true;
        this.hilferufe++;
        continue;
      }
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
