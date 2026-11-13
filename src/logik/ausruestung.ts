// Bereich Ausrüster (Weiterverarbeitung): Paletten kommen an, werden an der Falzmaschine gefalzt,
// ein Teil danach am Sammelhefter geheftet. Fertiges kommt ins Lager, der Lastwagen liefert aus.
// Kein Bezug zu Phaser oder zum Browser.

import type { Zufall } from './zufall';

export interface Maschinenwerte {
  name: string;
  /** Rüstzeit in Sekunden */
  ruestzeit: number;
  /** Exemplare pro Sekunde */
  leistung: number;
}

export interface AusruestungEinstellungen {
  dauer: number;
  /** Alle so viele Sekunden kommt eine neue Palette */
  takt: number;
  /** Nach dieser Sekunde kommen keine neuen Paletten mehr (Annahmeschluss), damit alles noch fertig werden kann */
  annahmeBis?: number;
  startPaletten: number;
  /** Höchstens so viele Paletten warten im Wareneingang */
  maxWartend: number;
  falzen: Maschinenwerte;
  heften: Maschinenwerte;
  /** So viele Paletten können an der Falzmaschine zusätzlich zum laufenden Auftrag warten */
  wartePlaetzeFalzen: number;
  /** Plätze der Ablage vor dem Sammelhefter */
  ablagePlaetze: number;
  auflageVon: number;
  auflageBis: number;
  auflageSchritt: number;
  /** Anteil der Paletten, die nach dem Falzen geheftet werden */
  anteilHeften: number;
  /** Grösse nach Auflage: Plätze im Lager und im Lastwagen */
  groessen: { bis: number; plaetze: number }[];
  lagerPlaetze: number;
  lastwagenPlaetze: number;
  /** So lange ist der Lastwagen unterwegs */
  fahrzeit: number;
  /** Liefertermin = Bearbeitungszeit mal Faktor plus Zuschlag, ab Ankunft der Palette */
  terminFaktor: number;
  terminZuschlag: number;
  /** Anteil Eilaufträge und ihr kürzerer Termin */
  eilAnteil: number;
  eilFaktor: number;
  eilZuschlag: number;
  punktePuenktlich: number;
  punkteVerspaetet: number;
}

export interface Palette {
  nummer: number;
  auflage: number;
  /** true = falzen und heften, false = nur falzen */
  heften: boolean;
  /** Plätze im Lager und im Lastwagen */
  plaetze: number;
  erschienen: number;
  /** Liefertermin als Spielzeit: Bis dann muss der Lastwagen mit ihr abgefahren sein */
  termin: number;
  eil: boolean;
}

export type Arbeitsphase = 'ruesten' | 'laufen';

export interface Station {
  werte: Maschinenwerte;
  laufend: { palette: Palette; phase: Arbeitsphase; rest: number; dauer: number } | null;
  wartend: Palette[];
  /** Fertig bearbeitet, aber Ablage oder Lager ist voll: Die Maschine steht. */
  blockiert: Palette | null;
  /** Sekunden, die die Maschine wegen vollem Lager oder voller Ablage stand */
  stillstand: number;
}

export interface Lieferung {
  palette: Palette;
  /** null = am Schichtende nicht geliefert */
  geliefertUm: number | null;
  puenktlich: boolean;
}

export interface AusruestungAuswertung {
  punkte: number;
  puenktlich: number;
  verspaetet: number;
  /** Davon am Schichtende gar nicht geliefert */
  nichtGeliefert: number;
  fahrten: number;
  /** Summe der leeren Plätze bei allen Abfahrten */
  leerePlaetze: number;
  /** Stillstand von Falzmaschine und Sammelhefter wegen vollem Lager oder voller Ablage */
  stillstand: number;
}

const SCHRITT = 0.05;

export class Ausruestung {
  zeit = 0;
  punkte = 0;
  fahrten = 0;
  leerePlaetze = 0;
  /** Paletten im Wareneingang */
  readonly eingang: Palette[] = [];
  readonly falzen: Station;
  readonly heften: Station;
  /** Gefalzte Aufträge, die auf den Sammelhefter warten */
  readonly ablage: Palette[] = [];
  readonly lager: Palette[] = [];
  /** Im Lastwagen geladen */
  readonly geladen: Palette[] = [];
  /** null = der Lastwagen steht an der Rampe, sonst die Spielzeit seiner Rückkehr */
  unterwegsBis: number | null = null;
  readonly lieferungen: Lieferung[] = [];
  private naechsteNummer = 1;
  private naechsterTakt: number;
  private beendet = false;

  constructor(
    readonly einstellungen: AusruestungEinstellungen,
    private readonly zufall: Zufall,
  ) {
    this.falzen = { werte: einstellungen.falzen, laufend: null, wartend: [], blockiert: null, stillstand: 0 };
    this.heften = { werte: einstellungen.heften, laufend: null, wartend: [], blockiert: null, stillstand: 0 };
    this.naechsterTakt = einstellungen.takt;
    for (let i = 0; i < Math.min(einstellungen.startPaletten, einstellungen.maxWartend); i++) this.eingang.push(this.neuePalette());
  }

  get fertig(): boolean {
    return this.beendet;
  }

  get puenktlich(): number {
    return this.lieferungen.filter((l) => l.puenktlich).length;
  }

  get verspaetet(): number {
    return this.lieferungen.filter((l) => !l.puenktlich).length;
  }

  /** Dauer an einer Maschine: Rüstzeit + Auflage geteilt durch Leistung. */
  dauerAn(werte: Maschinenwerte, auflage: number): number {
    return werte.ruestzeit + auflage / werte.leistung;
  }

  /** Reine Bearbeitungszeit eines Auftrags ohne Warten. */
  bearbeitungszeit(auflage: number, heften: boolean): number {
    const e = this.einstellungen;
    return this.dauerAn(e.falzen, auflage) + (heften ? this.dauerAn(e.heften, auflage) : 0);
  }

  plaetzeFuer(auflage: number): number {
    for (const g of this.einstellungen.groessen) if (auflage <= g.bis) return g.plaetze;
    return this.einstellungen.groessen[this.einstellungen.groessen.length - 1]?.plaetze ?? 1;
  }

  /** Legt eine Palette mit festen Werten an (auch für Tests). */
  paletteMit(auflage: number, heften: boolean, eil = false): Palette {
    const e = this.einstellungen;
    const arbeit = this.bearbeitungszeit(auflage, heften);
    const termin = this.zeit + (eil ? arbeit * e.eilFaktor + e.eilZuschlag : arbeit * e.terminFaktor + e.terminZuschlag);
    return { nummer: this.naechsteNummer++, auflage, heften, plaetze: this.plaetzeFuer(auflage), erschienen: this.zeit, termin, eil };
  }

  private neuePalette(): Palette {
    const e = this.einstellungen;
    const stufen = Math.floor((e.auflageBis - e.auflageVon) / e.auflageSchritt) + 1;
    const auflage = e.auflageVon + Math.floor(this.zufall() * stufen) * e.auflageSchritt;
    const heften = this.zufall() < e.anteilHeften;
    const eil = this.zufall() < e.eilAnteil;
    return this.paletteMit(auflage, heften, eil);
  }

  belegt(liste: Palette[]): number {
    return liste.reduce((summe, p) => summe + p.plaetze, 0);
  }

  get lastwagenDa(): boolean {
    return this.unterwegsBis === null;
  }

  /** Kann die Falzmaschine noch eine Palette annehmen? */
  get falzenFrei(): boolean {
    const f = this.falzen;
    return f.laufend === null && f.blockiert === null ? true : f.wartend.length < this.einstellungen.wartePlaetzeFalzen;
  }

  private starte(station: Station, palette: Palette): void {
    station.laufend = { palette, phase: 'ruesten', rest: station.werte.ruestzeit, dauer: station.werte.ruestzeit };
  }

  /** Schickt eine Palette aus dem Wareneingang zur Falzmaschine. */
  zurFalzmaschine(nummer: number): boolean {
    if (this.beendet) return false;
    const i = this.eingang.findIndex((p) => p.nummer === nummer);
    if (i < 0 || !this.falzenFrei) return false;
    const [palette] = this.eingang.splice(i, 1);
    const f = this.falzen;
    if (f.laufend === null && f.blockiert === null) this.starte(f, palette);
    else f.wartend.push(palette);
    return true;
  }

  /** Lädt einen fertigen Auftrag aus dem Lager in den Lastwagen. */
  lade(nummer: number): boolean {
    if (this.beendet || !this.lastwagenDa) return false;
    const i = this.lager.findIndex((p) => p.nummer === nummer);
    if (i < 0) return false;
    if (this.belegt(this.geladen) + this.lager[i].plaetze > this.einstellungen.lastwagenPlaetze) return false;
    this.geladen.push(...this.lager.splice(i, 1));
    return true;
  }

  /** Nimmt einen geladenen Auftrag wieder aus dem Lastwagen ins Lager zurück. */
  entlade(nummer: number): boolean {
    if (this.beendet || !this.lastwagenDa) return false;
    const i = this.geladen.findIndex((p) => p.nummer === nummer);
    if (i < 0) return false;
    if (this.belegt(this.lager) + this.geladen[i].plaetze > this.einstellungen.lagerPlaetze) return false;
    this.lager.push(...this.geladen.splice(i, 1));
    return true;
  }

  private werte(palette: Palette, geliefertUm: number | null): void {
    const e = this.einstellungen;
    const puenktlich = geliefertUm !== null && geliefertUm <= palette.termin + 1e-6;
    this.lieferungen.push({ palette, geliefertUm, puenktlich });
    this.punkte += puenktlich ? e.punktePuenktlich : e.punkteVerspaetet;
  }

  /** Der Lastwagen fährt los. Geliefert ist ein Auftrag im Moment der Abfahrt. */
  abfahrt(): boolean {
    if (this.beendet || !this.lastwagenDa || this.geladen.length === 0) return false;
    const e = this.einstellungen;
    this.leerePlaetze += e.lastwagenPlaetze - this.belegt(this.geladen);
    for (const p of this.geladen.splice(0)) this.werte(p, this.zeit);
    this.fahrten++;
    this.unterwegsBis = this.zeit + e.fahrzeit;
    return true;
  }

  /** Versucht, einen fertigen Auftrag von der Maschine wegzubringen. */
  private gibAb(station: Station, palette: Palette, istFalzen: boolean): boolean {
    const e = this.einstellungen;
    if (istFalzen && palette.heften) {
      if (this.ablage.length >= e.ablagePlaetze) return false;
      this.ablage.push(palette);
      return true;
    }
    if (this.belegt(this.lager) + palette.plaetze > e.lagerPlaetze) return false;
    this.lager.push(palette);
    void station;
    return true;
  }

  private arbeite(station: Station, dt: number, istFalzen: boolean): void {
    if (station.blockiert) {
      if (this.gibAb(station, station.blockiert, istFalzen)) station.blockiert = null;
      else {
        station.stillstand += dt;
        return;
      }
    }
    if (!station.laufend) {
      const naechste = istFalzen ? station.wartend.shift() : this.ablage.shift();
      if (naechste) this.starte(station, naechste);
      else return;
    }
    const l = station.laufend!;
    l.rest -= dt;
    if (l.rest > 1e-9) return;
    if (l.phase === 'ruesten') {
      const laufzeit = l.palette.auflage / station.werte.leistung;
      station.laufend = { palette: l.palette, phase: 'laufen', rest: laufzeit + l.rest, dauer: laufzeit };
      return;
    }
    station.laufend = null;
    if (!this.gibAb(station, l.palette, istFalzen)) station.blockiert = l.palette;
  }

  /** Lässt die Zeit um dt Sekunden laufen. */
  schritt(dt: number): void {
    const e = this.einstellungen;
    let rest = Math.max(0, dt);
    while (rest > 1e-9 && !this.beendet) {
      const stueck = Math.min(rest, SCHRITT, e.dauer - this.zeit);
      this.arbeite(this.falzen, stueck, true);
      this.arbeite(this.heften, stueck, false);
      this.zeit += stueck;
      rest -= stueck;
      if (this.unterwegsBis !== null && this.zeit >= this.unterwegsBis - 1e-9) this.unterwegsBis = null;
      if (this.zeit >= this.naechsterTakt - 1e-9) {
        this.naechsterTakt += e.takt;
        // Ist der Wareneingang voll, fällt dieser Takt aus.
        if (this.eingang.length < e.maxWartend && this.zeit <= (e.annahmeBis ?? e.dauer) + 1e-9) this.eingang.push(this.neuePalette());
      }
      if (this.zeit >= e.dauer - 1e-9) this.beende();
    }
  }

  /** Schichtende: Was nicht mit dem Lastwagen abgefahren ist, zählt als verspätet. */
  private beende(): void {
    this.beendet = true;
    const offen: Palette[] = [...this.eingang, ...this.falzen.wartend, ...this.ablage, ...this.lager, ...this.geladen];
    for (const s of [this.falzen, this.heften]) {
      if (s.laufend) offen.push(s.laufend.palette);
      if (s.blockiert) offen.push(s.blockiert);
    }
    offen.sort((a, b) => a.nummer - b.nummer);
    for (const p of offen) this.werte(p, null);
  }

  auswertung(): AusruestungAuswertung {
    return {
      punkte: this.punkte,
      puenktlich: this.puenktlich,
      verspaetet: this.verspaetet,
      nichtGeliefert: this.lieferungen.filter((l) => l.geliefertUm === null).length,
      fahrten: this.fahrten,
      leerePlaetze: this.leerePlaetze,
      stillstand: this.falzen.stillstand + this.heften.stillstand,
    };
  }
}

/**
 * Spielt viele Schichten automatisch durch, um die Startwerte zu prüfen.
 * Spielweise: Die Palette mit dem frühesten Liefertermin kommt zuerst an die Falzmaschine.
 * Geladen wird nach Liefertermin. Der Lastwagen fährt, wenn er voll ist oder ein Termin drängt.
 */
export function simuliereAusruestung(einstellungen: AusruestungEinstellungen, schichten: number, zufall: (s: number) => Zufall): { quote: number; fahrten: number; paletten: number } {
  let gesamt = 0;
  let puenktlich = 0;
  let fahrten = 0;
  for (let s = 0; s < schichten; s++) {
    const a = new Ausruestung(einstellungen, zufall(s));
    let ersteLadung = 0;
    while (!a.fertig) {
      a.schritt(0.25);
      const naechste = [...a.eingang].sort((x, y) => x.termin - y.termin)[0];
      if (naechste && a.falzenFrei) a.zurFalzmaschine(naechste.nummer);
      if (a.lastwagenDa) {
        for (const p of [...a.lager].sort((x, y) => x.termin - y.termin)) {
          if (a.lade(p.nummer) && a.geladen.length === 1) ersteLadung = a.zeit;
        }
        if (a.geladen.length > 0) {
          const voll = a.belegt(a.geladen) >= einstellungen.lastwagenPlaetze;
          const draengt = Math.min(...a.geladen.map((p) => p.termin)) - a.zeit < 10;
          const wartetLange = a.zeit - ersteLadung > 12;
          const schluss = einstellungen.dauer - a.zeit < 2;
          if (voll || draengt || wartetLange || schluss) a.abfahrt();
        }
      }
    }
    gesamt += a.lieferungen.length;
    puenktlich += a.puenktlich;
    fahrten += a.fahrten;
  }
  return { quote: gesamt ? (100 * puenktlich) / gesamt : 0, fahrten: fahrten / schichten, paletten: gesamt / schichten };
}
