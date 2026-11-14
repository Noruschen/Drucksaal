import Phaser from 'phaser';
import { anzeigeSekunden, tausender } from '../logik/dauer';
import { AUSRUESTUNG_NEU } from '../logik/daten';
import { Ausruestung, type Palette, type Station, type StationArt } from '../logik/ausruestung';
import { MF } from '../grafik/zeichnen.ts';
import { BREITE, FARBEN, HOEHE, Maler, bild, minSek, richteAus, schrift, setze, setzeBild, trifft, type Rechteck } from './hilfen';
import { spiele } from './ton';

// Vorschau zum Ausrüster (Aufruf mit ?ausruester=neu): das bisherige Spiel, erweitert um eine Schneidemaschine,
// verschiedene Wege der Aufträge, mehr Aufträge und Arbeiter, die ab und zu Hilfe brauchen.
// Zählt nicht für die Bestleistung.

type Text = Phaser.GameObjects.Text;
type Bildobjekt = Phaser.GameObjects.Image;

const TEMPO = Math.max(1, Number(new URLSearchParams(window.location.search).get('tempo')) || 1);
// Prüfhilfe: Mit ?hilfe=1 braucht der Arbeiter bei jeder Bearbeitung Hilfe.
const IMMER_HILFE = new URLSearchParams(window.location.search).get('hilfe') === '1';
const E = IMMER_HILFE ? { ...AUSRUESTUNG_NEU, hilferufAnteil: 1 } : AUSRUESTUNG_NEU;
const BODEN = 104;
const GRUEN = '#2f9e44';
const ROT = '#d94a3d';

interface Platz {
  art: StationArt;
  /** Antippbare Fläche: Hier hilft man dem Arbeiter */
  feld: Rechteck;
  bildX: number;
  bildY: number;
  /** Bildname ohne Zustand, zum Beispiel «mbo» */
  bild: string;
  verb: string;
  /** Standort des Arbeiters (Füsse) */
  arbeiterX: number;
}

const PLAETZE: Platz[] = [
  { art: 'schneiden', feld: { x: 0, y: 16, b: 60, h: 92 }, bildX: 2, bildY: BODEN - 46, bild: 'schneidemaschine', verb: 'schneidet', arbeiterX: 52 },
  { art: 'falzen', feld: { x: 60, y: 16, b: 68, h: 92 }, bildX: 62, bildY: BODEN - 42, bild: 'mbo', verb: 'falzt', arbeiterX: 122 },
  { art: 'heften', feld: { x: 150, y: 16, b: 122, h: 92 }, bildX: 150, bildY: BODEN - 38, bild: 'hefter', verb: 'heftet', arbeiterX: 160 },
];
const FELD_LASTWAGEN: Rechteck = { x: 272, y: 16, b: 48, h: 92 };
const K_ABFAHRT: Rechteck = { x: 288, y: 118, b: 30, h: 61 };

function kartenFeld(i: number): Rechteck {
  return { x: 3 + i * 47, y: 111, b: 45, h: 67 };
}

function lagerFeld(i: number): Rechteck {
  return { x: 194 + (i % 3) * 31, y: 118 + Math.floor(i / 3) * 31, b: 30, h: 30 };
}

/** Weg eines Auftrags in Worten, eine Zeile pro Arbeitsgang. */
function wegZeilen(p: Palette): string[] {
  const gaenge = [p.schneiden ? 'schneiden' : '', p.falzen ? 'falzen' : '', p.heften ? 'heften' : ''].filter((x) => x !== '');
  return gaenge.map((g, i) => (i === 0 ? g : `+ ${g}`));
}

function maschinenBild(platz: Platz, s: Station, bewegung: number): string {
  const laeuft = s.laufend !== null && !s.gestoert && !s.blockiert;
  if (platz.art === 'schneiden') {
    if (!s.laufend && !s.blockiert) return 'schneidemaschine_steht';
    return laeuft && s.laufend?.phase === 'laufen' && bewegung === 0 ? 'schneidemaschine_schneidet' : 'schneidemaschine_bereit';
  }
  if (!laeuft || !s.laufend) return `${platz.bild}_steht_1`;
  return `${platz.bild}_${s.laufend.phase === 'ruesten' ? 'ruestet' : 'laeuft'}_${bewegung + 1}`;
}

export class AusruestungNeuSzene extends Phaser.Scene {
  private spiel!: Ausruestung;
  private maler!: Maler;
  private vorn!: Maler;
  private tUhr!: Text;
  private tMitte!: Text;
  private tPunkte!: Text;
  private tWagen!: Text;
  private tLager!: Text;
  private tMeldung!: Text;
  private stationTeile: { bild: Bildobjekt; status: Text; wartet: Text; hilfe: Text }[] = [];
  private tAblage: Text[] = [];
  private karten: { bild: Bildobjekt; auflage: Text; weg: Text[]; rest: Text }[] = [];
  private tLagerZelle: Text[] = [];
  private bWagen!: Bildobjekt;
  /** Feste Plätze der Paletten im Wareneingang: Nummer oder null */
  private plaetze: (number | null)[] = [];
  private abgelehnt: { feld: Rechteck; zeit: number } | null = null;
  private meldungZeit = 0;
  private lauf = 0;
  private endePause = 0;

  constructor() {
    super('AusruestungNeu');
  }

  private station(art: StationArt): Station {
    const s = this.spiel;
    return art === 'schneiden' ? s.schneiden! : art === 'falzen' ? s.falzen : s.heften;
  }

  create(): void {
    this.spiel = new Ausruestung(E, Math.random);
    if (TEMPO > 1) (window as unknown as { druckereiPruefung?: Ausruestung }).druckereiPruefung = this.spiel;
    this.plaetze = Array.from({ length: E.maxWartend }, () => null);
    this.abgelehnt = null;
    this.meldungZeit = 0;
    this.lauf = 0;
    this.endePause = 0;
    this.ordnePlaetze();

    const grund = new Maler(this.add.graphics());
    grund.r(0, 0, BREITE, HOEHE, FARBEN.leiste);
    bild(this, 0, 16, 'drucksaal', 0);
    const boden = new Maler(this.add.graphics().setDepth(1));
    boden.r(0, 108, BREITE, 72, FARBEN.leiste);
    bild(this, 4, 3, 'uhr_hell');
    this.bWagen = bild(this, 274, BODEN - 44, 'lastwagen_heck', 2);
    this.maler = new Maler(this.add.graphics().setDepth(3));
    this.vorn = new Maler(this.add.graphics().setDepth(8));

    this.tUhr = schrift(this, 16, 2, '', FARBEN.text);
    this.tMitte = schrift(this, 192, 2, '', FARBEN.text, 'mitte');
    this.tPunkte = schrift(this, BREITE - 4, 2, '', FARBEN.text, 'rechts');
    this.stationTeile = PLAETZE.map((platz) => {
      const mitte = platz.feld.x + platz.feld.b / 2;
      const name = this.station(platz.art).werte.name;
      schrift(this, mitte, name.length > 12 ? 19 : 18, name, FARBEN.textAufBoden, 'mitte', name.length > 12 ? 7 : 9);
      bild(this, platz.arbeiterX - 5, BODEN + 2 - 16, 'drucker_steht', 4);
      return {
        bild: bild(this, platz.bildX, platz.bildY, `${platz.bild}_steht${platz.art === 'schneiden' ? '' : '_1'}`, 2),
        status: schrift(this, mitte, 29, '', FARBEN.textAufBoden, 'mitte', 8),
        wartet: schrift(this, mitte, 45, '', FARBEN.textAufBoden, 'mitte', 8),
        hilfe: schrift(this, platz.arbeiterX, BODEN - 30, 'Hilfe!', ROT, 'mitte', 9).setDepth(9).setVisible(false),
      };
    });
    schrift(this, 139, 56, 'Ablage', FARBEN.textAufBoden, 'mitte', 8);
    this.tAblage = [];
    for (let k = 0; k < E.ablagePlaetze; k++) this.tAblage.push(schrift(this, 139, 69 + k * 17, '', FARBEN.textAufPapier, 'mitte', 8).setDepth(6));
    this.tWagen = schrift(this, 297, 18, '', FARBEN.textAufBoden, 'mitte', 8).setAlign('center');
    this.tMeldung = schrift(this, 297, 42, '', GRUEN, 'mitte', 10).setDepth(9).setVisible(false);
    this.tLager = schrift(this, 194, 108, '', FARBEN.text, 'links', 8);
    schrift(this, K_ABFAHRT.x + 15, K_ABFAHRT.y + 19, 'Ab-\nfahrt', FARBEN.knopfText, 'mitte', 8).setAlign('center').setDepth(6);

    this.karten = [];
    for (let i = 0; i < this.plaetze.length; i++) {
      const f = kartenFeld(i);
      const mitte = f.x + Math.floor(f.b / 2);
      this.karten.push({
        bild: bild(this, f.x + 10, f.y + 1, 'palette_1', 4).setVisible(false),
        auflage: schrift(this, mitte, f.y + 19, '', FARBEN.textAufPapier, 'mitte'),
        weg: [0, 1, 2].map((k) => schrift(this, mitte, f.y + 29 + k * 8, '', FARBEN.textAufPapier, 'mitte', 8)),
        rest: schrift(this, mitte, f.y + 53, '', FARBEN.textAufPapier, 'mitte', 8),
      });
    }
    this.tLagerZelle = [];
    for (let i = 0; i < E.lagerPlaetze; i++) {
      const f = lagerFeld(i);
      this.tLagerZelle.push(schrift(this, f.x + 15, f.y + 2, '', FARBEN.textAufPapier, 'mitte', 8).setDepth(6));
    }
    richteAus(this);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.tippe(p.worldX, p.worldY));
  }

  /** Hält die festen Plätze im Wareneingang aktuell. */
  private ordnePlaetze(): void {
    const da = new Set(this.spiel.eingang.map((p) => p.nummer));
    this.plaetze = this.plaetze.map((n) => (n !== null && da.has(n) ? n : null));
    for (const p of this.spiel.eingang) {
      if (this.plaetze.includes(p.nummer)) continue;
      const frei = this.plaetze.indexOf(null);
      if (frei >= 0) this.plaetze[frei] = p.nummer;
    }
  }

  private lehneAb(feld: Rechteck): void {
    this.abgelehnt = { feld, zeit: 0.5 };
    spiele('abgelehnt');
  }

  private tippe(x: number, y: number): void {
    const s = this.spiel;
    if (s.fertig) return;
    // Palette im Wareneingang: geht zu ihrer ersten Maschine
    for (let i = 0; i < this.plaetze.length; i++) {
      const f = kartenFeld(i);
      const nummer = this.plaetze[i];
      if (nummer === null || !trifft(f, x, y)) continue;
      if (s.zurErstenMaschine(nummer)) spiele('zuteilen');
      else this.lehneAb(f);
      this.ordnePlaetze();
      return;
    }
    // Maschine antippen: dem Arbeiter helfen
    for (const platz of PLAETZE) {
      if (!trifft(platz.feld, x, y)) continue;
      if (s.hilf(platz.art)) spiele('puenktlich');
      return;
    }
    // Lager: in den Lastwagen laden
    for (let i = 0; i < s.lager.length; i++) {
      const f = lagerFeld(i);
      if (!trifft(f, x, y)) continue;
      if (s.lade(s.lager[i].nummer)) spiele('zuteilen');
      else this.lehneAb(s.lastwagenDa ? FELD_LASTWAGEN : f);
      return;
    }
    if (trifft(K_ABFAHRT, x, y)) {
      const vorher = s.punkte;
      if (s.abfahrt()) {
        const plus = s.punkte - vorher;
        spiele(plus >= 0 ? 'puenktlich' : 'verspaetet');
        setze(this.tMeldung, plus >= 0 ? `plus ${plus}` : `minus ${Math.abs(plus)}`, plus >= 0 ? GRUEN : ROT);
        this.meldungZeit = 1.4;
      } else {
        this.lehneAb(K_ABFAHRT);
      }
      return;
    }
    if (trifft(FELD_LASTWAGEN, x, y)) {
      // Lastwagen antippen nimmt den zuletzt geladenen Auftrag wieder heraus.
      const letzter = s.geladen[s.geladen.length - 1];
      if (letzter && s.entlade(letzter.nummer)) spiele('zuteilen');
      else if (letzter) this.lehneAb(FELD_LASTWAGEN);
    }
  }

  update(_zeit: number, delta: number): void {
    const s = this.spiel;
    const echt = delta / 1000;
    this.lauf += echt;
    if (!s.fertig) {
      const vorher = s.hilferufe;
      s.schritt((Math.min(delta, 100) / 1000) * TEMPO);
      if (s.hilferufe > vorher) spiele('abgelehnt');
      this.ordnePlaetze();
      if (s.fertig) spiele('schichtende');
    } else {
      this.endePause += echt;
      if (this.endePause > 0.8) {
        const w = s.auswertung();
        this.scene.start('VorschauAuswertung', {
          titel: 'Ausrüster (Vorschau)',
          punkte: w.punkte,
          kopf: `pünktlich: ${w.puenktlich}      verspätet: ${w.verspaetet}`,
          zeilen: [
            `Pünktlich geliefert: ${w.puenktlich} ${w.puenktlich === 1 ? 'Auftrag' : 'Aufträge'}`,
            `Zu spät abgefahren: ${w.verspaetet - w.nichtGeliefert}, am Schichtende nicht abgefahren: ${w.nichtGeliefert}`,
            `Fahrten des Lastwagens: ${w.fahrten}`,
            `Hilferufe: ${w.hilferufe}, Maschinen warteten ${anzeigeSekunden(w.hilfeStillstand)} s auf Hilfe`,
            `Stillstand wegen vollem Lager oder voller Ablage: ${anzeigeSekunden(w.stillstand)} s`,
          ],
          tipp:
            w.hilferufe > 0 && w.hilfeStillstand / w.hilferufe > 4
              ? 'Tipp: Ruft ein Arbeiter «Hilfe!», tippe sofort seine Maschine an.'
              : w.stillstand > 15
                ? 'Tipp: Verlade laufend, damit die Maschinen nicht wegen vollem Lager stehen.'
                : w.nichtGeliefert > w.puenktlich
                  ? 'Tipp: Fertiges früher verladen und den Lastwagen eher losschicken.'
                  : w.verspaetet > w.puenktlich
                    ? 'Tipp: Paletten mit wenig Restzeit zuerst losschicken.'
                    : 'Sauber gearbeitet: geliefert, bevor der Liefertermin ablief.',
          nochmals: 'AusruestungNeu',
        });
        return;
      }
    }
    this.meldungZeit = Math.max(0, this.meldungZeit - echt);
    if (this.abgelehnt) {
      this.abgelehnt.zeit -= echt;
      if (this.abgelehnt.zeit <= 0) this.abgelehnt = null;
    }
    this.zeichne();
  }

  private terminBalken(p: Palette, x: number, y: number, b: number, h: number): void {
    const rest = p.termin - this.spiel.zeit;
    const anteil = rest / (p.termin - p.erschienen);
    this.maler.balken(x, y, b, h, rest <= 0 ? 1 : anteil, rest <= 0 ? FARBEN.schlecht : anteil > 0.5 ? FARBEN.gut : anteil > 0.25 ? FARBEN.warnung : FARBEN.schlecht);
  }

  private zeichne(): void {
    const s = this.spiel;
    const m = this.maler;
    m.leeren();
    this.vorn.leeren();
    const schichtRest = Math.max(0, E.dauer - s.zeit);
    setze(this.tUhr, `Schicht ${minSek(schichtRest)}`);
    m.balken(66, 5, 60, 6, schichtRest / E.dauer, FARBEN.akzent);
    setze(this.tMitte, `pünktlich ${s.puenktlich}    verspätet ${s.verspaetet}`);
    setze(this.tPunkte, `Punkte ${tausender(s.punkte).replace('-', 'minus ')}`);
    const bewegung = Math.floor(this.lauf * 6) % 2;
    const blinkt = Math.floor(this.lauf * 4) % 2 === 0;

    // Maschinen
    PLAETZE.forEach((platz, i) => {
      const st = this.station(platz.art);
      const t = this.stationTeile[i];
      const f = platz.feld;
      setzeBild(t.bild, maschinenBild(platz, st, bewegung));
      const l = st.laufend;
      const status = st.gestoert ? 'braucht Hilfe' : st.blockiert ? 'voll: steht' : l ? `${l.phase === 'ruesten' ? 'rüstet' : platz.verb} ${anzeigeSekunden(l.rest)} s` : 'steht';
      setze(t.status, status, st.gestoert || st.blockiert ? ROT : FARBEN.textAufBoden);
      const anteil = l ? 1 - l.rest / l.dauer : 0;
      m.balken(f.x + 4, 40, f.b - 8, 4, anteil, st.gestoert ? FARBEN.schlecht : l?.phase === 'ruesten' ? FARBEN.warnung : FARBEN.gut);
      const wartet = platz.art === 'heften' ? undefined : st.wartend[0];
      setze(t.wartet, wartet ? `wartet: ${tausender(wartet.auflage)}` : '');
      // Hilferuf: Sprechblase über dem Arbeiter, die Maschine ist rot umrandet
      t.hilfe.setVisible(st.gestoert);
      if (st.gestoert) {
        const bx = platz.arbeiterX - 17;
        const by = BODEN - 33;
        this.vorn.r(bx, by, 34, 15, FARBEN.umriss);
        this.vorn.r(bx + 1, by + 1, 32, 13, '#ffffff');
        this.vorn.r(platz.arbeiterX - 2, by + 15, 4, 3, FARBEN.umriss);
        m.rahmen(f.x, f.y, f.b, f.h, FARBEN.schlecht, blinkt ? 2 : 1);
      }
    });

    // Ablage vor dem Sammelhefter
    for (let k = 0; k < E.ablagePlaetze; k++) {
      const p = s.ablage[k];
      m.r(129, 66 + k * 17, 20, 16, FARBEN.warnung);
      m.r(130, 67 + k * 17, 18, 14, p ? FARBEN.papier : FARBEN.maschine);
      setze(this.tAblage[k], p ? tausender(p.auflage) : '');
    }

    // Lastwagen
    const da = s.lastwagenDa;
    this.bWagen.setVisible(da);
    setze(this.tWagen, da ? `${s.belegt(s.geladen)} von ${E.lastwagenPlaetze}\nPlätzen` : `unterwegs\n${anzeigeSekunden((s.unterwegsBis ?? s.zeit) - s.zeit)} s`);

    // Wareneingang
    for (let i = 0; i < this.plaetze.length; i++) {
      const f = kartenFeld(i);
      const t = this.karten[i];
      const p = s.eingang.find((x) => x.nummer === this.plaetze[i]);
      const sichtbar = p !== undefined;
      t.bild.setVisible(sichtbar);
      t.auflage.setVisible(sichtbar);
      t.rest.setVisible(sichtbar);
      t.weg.forEach((x) => x.setVisible(false));
      if (!p) {
        m.rahmen(f.x, f.y, f.b, f.h, FARBEN.maschineDunkel);
        continue;
      }
      m.r(f.x, f.y, f.b, f.h, FARBEN.maschineDunkel);
      m.r(f.x + 1, f.y + 1, f.b - 2, f.h - 2, FARBEN.papier);
      setzeBild(t.bild, `palette_${p.plaetze}`);
      setze(t.auflage, `${tausender(p.auflage)} Ex`);
      wegZeilen(p).forEach((zeile, k) => {
        t.weg[k].setVisible(true);
        setze(t.weg[k], zeile);
      });
      const rest = p.termin - s.zeit;
      setze(t.rest, rest <= 0 ? 'zu spät' : `${anzeigeSekunden(rest)} s`, rest <= 0 ? ROT : FARBEN.textAufPapier);
      this.terminBalken(p, f.x + 3, f.y + 62, f.b - 6, 4);
    }

    // Lager
    setze(this.tLager, `Lager: ${s.belegt(s.lager)} von ${E.lagerPlaetze} Plätzen`);
    for (let i = 0; i < E.lagerPlaetze; i++) {
      const f = lagerFeld(i);
      const p = s.lager[i];
      m.r(f.x, f.y, f.b, f.h, FARBEN.warnung);
      m.r(f.x + 1, f.y + 1, f.b - 2, f.h - 2, p ? FARBEN.papier : FARBEN.maschine);
      setze(this.tLagerZelle[i], p ? tausender(p.auflage) : '');
      if (!p) continue;
      for (let k = 0; k < p.plaetze; k++) m.r(f.x + 4 + k * 8, f.y + 14, 6, 5, MF.anthrazit);
      this.terminBalken(p, f.x + 3, f.y + 22, 24, 4);
    }

    // Abfahrt
    const bereit = da && s.geladen.length > 0;
    m.r(K_ABFAHRT.x, K_ABFAHRT.y, K_ABFAHRT.b, K_ABFAHRT.h, FARBEN.umriss);
    m.r(K_ABFAHRT.x + 1, K_ABFAHRT.y + 1, K_ABFAHRT.b - 2, K_ABFAHRT.h - 2, bereit ? FARBEN.gut : FARBEN.maschineDunkel);

    this.tMeldung.setVisible(this.meldungZeit > 0);
    if (this.abgelehnt && Math.floor(this.abgelehnt.zeit * 10) % 2 === 0) {
      const f = this.abgelehnt.feld;
      this.vorn.r(f.x, f.y, f.b, f.h, FARBEN.schlecht, 0.45);
    }
  }
}
