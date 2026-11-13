import Phaser from 'phaser';
import { anzeigeSekunden, tausender } from '../logik/dauer';
import { AUSRUESTUNG } from '../logik/daten';
import { Ausruestung, type AusruestungAuswertung, type Palette, type Station } from '../logik/ausruestung';
import { MF } from '../grafik/zeichnen.ts';
import { BREITE, FARBEN, HOEHE, Maler, bild, minSek, richteAus, schrift, setze, setzeBild, trifft, type Rechteck } from './hilfen';
import { meldeErgebnis } from './speicher';
import { spiele } from './ton';

// Bereich Ausrüster (Weiterverarbeitung), Aufbau nach Entwurf B:
// oben der Drucksaal mit MBO, Ablage, Martini Hefter und dem Heck des Lastwagens,
// unten alles zum Antippen: Paletten, Lager und «Abfahrt».

type Text = Phaser.GameObjects.Text;
type Bildobjekt = Phaser.GameObjects.Image;

// Prüfhilfe wie in den anderen Bereichen: ?tempo=10 lässt die Schicht schneller laufen.
const TEMPO = Math.max(1, Number(new URLSearchParams(window.location.search).get('tempo')) || 1);

const E = AUSRUESTUNG;
const BODEN = 102;
const FELD_MBO: Rechteck = { x: 0, y: 16, b: 113, h: 92 };
const FELD_LASTWAGEN: Rechteck = { x: 268, y: 16, b: 52, h: 92 };
const K_ABFAHRT: Rechteck = { x: 288, y: 118, b: 30, h: 61 };

function kartenFeld(i: number): Rechteck {
  return { x: 3 + i * 47, y: 112, b: 45, h: 66 };
}

function lagerFeld(i: number): Rechteck {
  return { x: 194 + (i % 3) * 31, y: 118 + Math.floor(i / 3) * 31, b: 30, h: 30 };
}

interface KartenTeile {
  bild: Bildobjekt;
  auflage: Text;
  was1: Text;
  was2: Text;
  rest: Text;
}

/** Männchen im Drucksaal. Reine Darstellung, ohne Einfluss auf die Zeiten. */
interface Figur {
  bild: Bildobjekt;
  x: number;
  y: number;
  heimX: number;
  heimY: number;
  traegt: boolean;
  nachLinks: boolean;
  strecke: number;
  wege: { x: number; y: number; traegtDanach: boolean }[];
}

function terminFarbe(anteil: number): string {
  return anteil > 0.5 ? FARBEN.gut : anteil > 0.25 ? FARBEN.warnung : FARBEN.schlecht;
}

export class AusruestungSzene extends Phaser.Scene {
  private spiel!: Ausruestung;
  private maler!: Maler;
  private vorn!: Maler;
  private tUhr!: Text;
  private tMitte!: Text;
  private tPunkte!: Text;
  private tFalz!: Text;
  private tHeft!: Text;
  private tWagen1!: Text;
  private tWagen2!: Text;
  private tWagen3!: Text;
  private tLager!: Text;
  private tWartet!: Text;
  private tAblage: Text[] = [];
  private tLagerZelle: Text[] = [];
  private tMeldung!: Text;
  private bMbo!: Bildobjekt;
  private bHefter!: Bildobjekt;
  private bWagen!: Bildobjekt;
  private bLast!: Bildobjekt;
  private karten: KartenTeile[] = [];
  /** Feste Plätze der Paletten im Wareneingang: Nummer oder null */
  private plaetze: (number | null)[] = [];
  private auswahl: number | null = null;
  private ziehen: { startX: number; startY: number; x: number; y: number; aktiv: boolean } | null = null;
  private zeiger: number | null = null;
  private bediener: Figur[] = [];
  private logistiker!: Figur;
  /** Rotes Aufleuchten nach einer abgelehnten Aktion: Stelle und Restzeit */
  private abgelehnt: { feld: Rechteck; zeit: number } | null = null;
  private meldungZeit = 0;
  private uhrzeit = 0;
  private endePause = 0;

  constructor() {
    super('Ausruestung');
  }

  create(): void {
    this.spiel = new Ausruestung(E, Math.random);
    this.plaetze = Array.from({ length: E.maxWartend }, () => null);
    this.auswahl = null;
    this.ziehen = null;
    this.zeiger = null;
    this.abgelehnt = null;
    this.meldungZeit = 0;
    this.uhrzeit = 0;
    this.endePause = 0;
    this.karten = [];
    this.tAblage = [];
    this.tLagerZelle = [];

    const grund = new Maler(this.add.graphics());
    grund.r(0, 0, BREITE, HOEHE, FARBEN.leiste);
    bild(this, 0, 16, 'drucksaal', 0);
    const boden = new Maler(this.add.graphics().setDepth(1));
    boden.r(0, 108, BREITE, 72, FARBEN.leiste);
    // Schilder der Maschinen
    boden.r(18, 20, 46, 11, FARBEN.umriss);
    boden.r(142, 20, 70, 11, FARBEN.umriss);
    bild(this, 4, 3, 'uhr_hell');
    this.bMbo = bild(this, 16, BODEN + 2 - 42, 'mbo_steht_1', 2);
    this.bHefter = bild(this, 116, BODEN + 2 - 38, 'hefter_steht_1', 2);
    this.bWagen = bild(this, 274, BODEN + 2 - 44, 'lastwagen_heck', 2);
    this.maler = new Maler(this.add.graphics().setDepth(3));
    this.vorn = new Maler(this.add.graphics().setDepth(8));

    this.tUhr = schrift(this, 16, 2, '', FARBEN.text);
    this.tMitte = schrift(this, 192, 2, '', FARBEN.text, 'mitte');
    this.tPunkte = schrift(this, BREITE - 4, 2, '', FARBEN.text, 'rechts');
    schrift(this, 41, 20, E.falzen.name, FARBEN.text, 'mitte');
    schrift(this, 177, 20, E.heften.name, FARBEN.text, 'mitte');
    this.tFalz = schrift(this, 41, 33, '', FARBEN.textAufBoden, 'mitte');
    this.tHeft = schrift(this, 177, 33, '', FARBEN.textAufBoden, 'mitte');
    schrift(this, 79, 20, 'wartet', FARBEN.textAufBoden, 'mitte', 8);
    this.tWartet = schrift(this, 79, 32, '', FARBEN.textAufPapier, 'mitte', 8);
    schrift(this, 98, 58, 'Ablage', FARBEN.textAufBoden, 'mitte', 8);
    for (let k = 0; k < E.ablagePlaetze; k++) this.tAblage.push(schrift(this, 98, 71 + k * 16, '', FARBEN.textAufPapier, 'mitte', 8));
    this.tWagen1 = schrift(this, 296, 19, '', FARBEN.textAufBoden, 'mitte');
    this.tWagen2 = schrift(this, 296, 30, '', FARBEN.textAufBoden, 'mitte');
    this.tWagen3 = schrift(this, 296, 42, '', FARBEN.textAufBoden, 'mitte', 8);
    this.tLager = schrift(this, 194, 108, '', FARBEN.text, 'links', 8);
    this.tMeldung = schrift(this, 250, 50, '', FARBEN.gut, 'mitte', 12).setDepth(9).setVisible(false);
    schrift(this, K_ABFAHRT.x + 15, K_ABFAHRT.y + 19, 'Ab-', FARBEN.knopfText, 'mitte', 8).setDepth(6);
    schrift(this, K_ABFAHRT.x + 15, K_ABFAHRT.y + 29, 'fahrt', FARBEN.knopfText, 'mitte', 8).setDepth(6);

    for (let i = 0; i < this.plaetze.length; i++) {
      const f = kartenFeld(i);
      const mitte = f.x + Math.floor(f.b / 2);
      this.karten.push({
        bild: bild(this, f.x + 10, f.y + 2, 'palette_1', 4).setVisible(false),
        auflage: schrift(this, mitte, f.y + 21, '', FARBEN.textAufPapier, 'mitte'),
        was1: schrift(this, mitte, f.y + 32, '', FARBEN.textAufPapier, 'mitte', 8),
        was2: schrift(this, mitte, f.y + 41, '', FARBEN.textAufPapier, 'mitte', 8),
        rest: schrift(this, mitte, f.y + 51, '', FARBEN.textAufPapier, 'mitte', 8),
      });
    }
    for (let i = 0; i < E.lagerPlaetze; i++) {
      const f = lagerFeld(i);
      this.tLagerZelle.push(schrift(this, f.x + 15, f.y + 2, '', FARBEN.textAufPapier, 'mitte', 8).setDepth(6));
    }

    // Männchen: je eines bedient MBO und Martini Hefter, ein drittes schiebt die Paletten.
    const figur = (x: number, y: number): Figur => ({ bild: bild(this, x - 5, y - 16, 'drucker_steht', 4), x, y, heimX: x, heimY: y, traegt: false, nachLinks: false, strecke: 0, wege: [] });
    this.bediener = [figur(9, BODEN + 1), figur(191, BODEN + 2)];
    this.logistiker = figur(256, BODEN + 3);
    this.bLast = bild(this, 0, 0, 'palette_1', 4).setVisible(false);
    richteAus(this);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.zeiger !== null && this.zeiger !== p.id) return;
      this.zeiger = p.id;
      this.runter(p.worldX, p.worldY);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.zeiger === p.id && this.ziehen) {
        this.ziehen.x = p.worldX;
        this.ziehen.y = p.worldY;
        if (!this.ziehen.aktiv && Math.hypot(p.worldX - this.ziehen.startX, p.worldY - this.ziehen.startY) > 5) this.ziehen.aktiv = true;
      }
    });
    const loslassen = (p: Phaser.Input.Pointer, gueltig: boolean): void => {
      if (this.zeiger !== p.id) return;
      this.zeiger = null;
      if (gueltig && this.ziehen?.aktiv && trifft(FELD_MBO, p.worldX, p.worldY)) this.falze();
      this.ziehen = null;
    };
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => loslassen(p, true));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => loslassen(p, false));
  }

  // ------------------------------------------------------------ Bedienung

  private lehneAb(feld: Rechteck): void {
    this.abgelehnt = { feld, zeit: 0.5 };
    spiele('abgelehnt');
  }

  /** Schickt die gewählte Palette zur Falzmaschine. */
  private falze(karte?: Rechteck): void {
    if (this.auswahl === null) return;
    const platz = this.plaetze.indexOf(this.auswahl);
    if (this.spiel.zurFalzmaschine(this.auswahl)) {
      this.auswahl = null;
      spiele('zuteilen');
      const f = kartenFeld(Math.max(0, platz));
      this.hole(f.x + f.b / 2, 106, 66, BODEN + 3);
    } else {
      // Falzmaschine und Warteplatz besetzt: Die Palette bleibt im Wareneingang.
      this.auswahl = null;
      this.lehneAb(karte ?? FELD_MBO);
    }
  }

  private runter(x: number, y: number): void {
    const s = this.spiel;
    if (s.fertig) return;
    this.ziehen = null;
    for (let i = 0; i < this.plaetze.length; i++) {
      if (this.plaetze[i] !== null && trifft(kartenFeld(i), x, y)) {
        // Ein Tipp genügt: Die Palette geht direkt zur Falzmaschine (kein Ziehen).
        this.auswahl = this.plaetze[i];
        this.falze(kartenFeld(i));
        return;
      }
    }
    if (trifft(FELD_MBO, x, y)) {
      if (this.auswahl !== null) this.falze();
      return;
    }
    for (let i = 0; i < s.lager.length; i++) {
      const f = lagerFeld(i);
      if (trifft(f, x, y)) {
        if (s.lade(s.lager[i].nummer)) {
          spiele('zuteilen');
          this.hole(f.x + 15, 106, 272, BODEN + 3);
        } else {
          this.lehneAb(s.lastwagenDa ? FELD_LASTWAGEN : f);
        }
        return;
      }
    }
    if (trifft(K_ABFAHRT, x, y)) {
      const vorher = s.punkte;
      if (s.abfahrt()) {
        const plus = s.punkte - vorher;
        spiele(plus >= 0 ? 'puenktlich' : 'verspaetet');
        setze(this.tMeldung, plus >= 0 ? `plus ${plus}` : `minus ${Math.abs(plus)}`, plus >= 0 ? '#1f7a30' : FARBEN.schlecht);
        this.meldungZeit = 1.6;
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
      return;
    }
    this.auswahl = null;
  }

  /** Der Logistiker holt etwas ab und bringt es an sein Ziel. Reine Darstellung. */
  private hole(vonX: number, vonY: number, nachX: number, nachY: number): void {
    const fig = this.logistiker;
    if (fig.wege.length >= 6) fig.wege.length = 0;
    fig.wege.push({ x: Math.max(8, Math.min(BREITE - 8, vonX)), y: vonY, traegtDanach: true }, { x: nachX, y: nachY, traegtDanach: false }, { x: fig.heimX, y: fig.heimY, traegtDanach: false });
  }

  private bewege(fig: Figur, dt: number): void {
    let rest = 95 * dt * (1 + fig.wege.length / 3);
    while (rest > 0 && fig.wege.length > 0) {
      const ziel = fig.wege[0];
      const dx = ziel.x - fig.x;
      const dy = ziel.y - fig.y;
      const weit = Math.hypot(dx, dy);
      if (Math.abs(dx) > 0.5) fig.nachLinks = dx < 0;
      if (weit <= rest) {
        fig.x = ziel.x;
        fig.y = ziel.y;
        fig.traegt = ziel.traegtDanach;
        fig.strecke += weit;
        rest -= weit;
        fig.wege.shift();
      } else {
        fig.x += (dx / weit) * rest;
        fig.y += (dy / weit) * rest;
        fig.strecke += rest;
        rest = 0;
      }
    }
  }

  // ------------------------------------------------------------ Ablauf

  update(_zeit: number, delta: number): void {
    const s = this.spiel;
    const echt = delta / 1000;
    this.uhrzeit += echt;
    if (!s.fertig) {
      s.schritt((Math.min(delta, 100) / 1000) * TEMPO);
      if (s.fertig) spiele('schichtende');
    } else {
      this.endePause += echt;
      if (this.endePause > 0.8) {
        this.scene.start('AusruestungAuswertung', { auswertung: s.auswertung() });
        return;
      }
    }
    if (this.abgelehnt) {
      this.abgelehnt.zeit -= echt;
      if (this.abgelehnt.zeit <= 0) this.abgelehnt = null;
    }
    this.meldungZeit = Math.max(0, this.meldungZeit - echt);

    // Paletten behalten ihren Platz im Wareneingang.
    const da = new Set(s.eingang.map((p) => p.nummer));
    for (let i = 0; i < this.plaetze.length; i++) if (this.plaetze[i] !== null && !da.has(this.plaetze[i]!)) this.plaetze[i] = null;
    for (const p of s.eingang) {
      if (!this.plaetze.includes(p.nummer)) {
        const frei = this.plaetze.indexOf(null);
        if (frei >= 0) this.plaetze[frei] = p.nummer;
      }
    }
    if (this.auswahl !== null && !da.has(this.auswahl)) {
      this.auswahl = null;
      this.ziehen = null;
    }
    this.bewege(this.logistiker, echt);
    this.zeichne();
  }

  // ------------------------------------------------------------ Darstellung

  private zeichneStation(station: Station, text: Text, name: string, bildobjekt: Bildobjekt, x: number, b: number, laufWort: string): void {
    const m = this.maler;
    const bewegung = 1 + (Math.floor(this.uhrzeit / 0.35) % 2);
    if (station.blockiert) {
      setzeBild(bildobjekt, `${name}_steht_1`);
      setze(text, 'voll: steht', FARBEN.schlecht);
      m.balken(x, 46, b, 5, 1, FARBEN.schlecht);
    } else if (station.laufend) {
      const l = station.laufend;
      const ruesten = l.phase === 'ruesten';
      setzeBild(bildobjekt, `${name}_${ruesten ? 'ruestet' : 'laeuft'}_${bewegung}`);
      setze(text, `${ruesten ? 'rüstet' : laufWort} ${anzeigeSekunden(l.rest)} s`, FARBEN.textAufBoden);
      m.balken(x, 46, b, 5, 1 - l.rest / l.dauer, ruesten ? FARBEN.warnung : FARBEN.gut);
    } else {
      setzeBild(bildobjekt, `${name}_steht_1`);
      setze(text, 'steht', FARBEN.textAufBoden);
      m.balken(x, 46, b, 5, 0, FARBEN.maschine);
    }
  }

  private zelle(feld: Rechteck, palette: Palette | undefined, text: Text): void {
    const m = this.maler;
    m.r(feld.x, feld.y, feld.b, feld.h, FARBEN.bodenFuge);
    m.rahmen(feld.x, feld.y, feld.b, feld.h, FARBEN.markierung);
    if (!palette) {
      setze(text, '');
      return;
    }
    m.r(feld.x + 2, feld.y + 2, feld.b - 4, feld.h - 4, FARBEN.papier);
    setze(text, tausender(palette.auflage), palette.eil ? FARBEN.schlecht : FARBEN.textAufPapier);
  }

  private zeichne(): void {
    const s = this.spiel;
    const m = this.maler;
    m.leeren();
    this.vorn.leeren();
    const bewegung = 1 + (Math.floor(this.uhrzeit / 0.35) % 2);

    // Kopfleiste
    const rest = Math.max(0, E.dauer - s.zeit);
    setze(this.tUhr, `Schicht ${minSek(rest)}`);
    m.balken(66, 5, 60, 6, rest / E.dauer, FARBEN.akzent);
    setze(this.tMitte, `pünktlich ${s.puenktlich}    verspätet ${s.verspaetet}`);
    setze(this.tPunkte, `Punkte ${tausender(s.punkte).replace('-', 'minus ')}`);

    // Maschinen
    this.zeichneStation(s.falzen, this.tFalz, 'mbo', this.bMbo, 18, 46, 'falzt');
    this.zeichneStation(s.heften, this.tHeft, 'hefter', this.bHefter, 142, 70, 'heftet');
    this.zelle({ x: 66, y: 30, b: 26, h: 15 }, s.falzen.wartend[0], this.tWartet);
    for (let k = 0; k < this.tAblage.length; k++) this.zelle({ x: 85, y: 69 + k * 16, b: 26, h: 15 }, s.ablage[k], this.tAblage[k]);

    // Männchen an den Maschinen: Sie bewegen sich, solange ihre Maschine arbeitet.
    [s.falzen, s.heften].forEach((station, i) => {
      const fig = this.bediener[i];
      const arbeitet = station.laufend !== null && !station.blockiert;
      setzeBild(fig.bild, arbeitet ? `drucker_geht_${bewegung}` : 'drucker_steht');
    });
    const log = this.logistiker;
    const geht = log.wege.length > 0;
    setzeBild(log.bild, `drucker_${geht ? `geht_${1 + (Math.floor(log.strecke / 5) % 2)}` : 'steht'}`);
    log.bild.setFlipX(geht && log.nachLinks);
    log.bild.setPosition(Math.round(log.x) - 5, Math.round(log.y) - 16);
    this.bLast.setVisible(log.traegt);
    if (log.traegt) this.bLast.setPosition(Math.round(log.x) + (log.nachLinks ? -30 : 5), Math.round(log.y) - 20);

    // Lastwagen
    const geladen = s.belegt(s.geladen);
    this.bWagen.setVisible(s.lastwagenDa);
    if (s.lastwagenDa) {
      setze(this.tWagen1, `${geladen} von ${E.lastwagenPlaetze}`);
      setze(this.tWagen2, 'Plätzen');
      setze(this.tWagen3, s.geladen.map((p) => tausender(p.auflage)).join(' + '));
    } else {
      setze(this.tWagen1, 'unterwegs');
      setze(this.tWagen2, `${anzeigeSekunden((s.unterwegsBis ?? s.zeit) - s.zeit)} s`);
      setze(this.tWagen3, '');
    }
    this.tMeldung.setVisible(this.meldungZeit > 0);
    if (this.meldungZeit > 0) this.tMeldung.setY(Math.round(44 + this.meldungZeit * 6));

    // Paletten im Wareneingang
    for (let i = 0; i < this.plaetze.length; i++) {
      const f = kartenFeld(i);
      const t = this.karten[i];
      const p = s.eingang.find((x) => x.nummer === this.plaetze[i]);
      t.bild.setVisible(p !== undefined);
      if (!p) {
        m.rahmen(f.x, f.y, f.b, f.h, FARBEN.maschineDunkel);
        for (const text of [t.auflage, t.was1, t.was2, t.rest]) setze(text, '');
        continue;
      }
      const restzeit = p.termin - s.zeit;
      const zuSpaet = restzeit <= 0;
      const gewaehlt = this.auswahl === p.nummer;
      const rand = gewaehlt ? 2 : 1;
      m.r(f.x, f.y, f.b, f.h, gewaehlt ? FARBEN.akzent : p.eil ? FARBEN.schlecht : FARBEN.maschineDunkel);
      m.r(f.x + rand, f.y + rand, f.b - 2 * rand, f.h - 2 * rand, zuSpaet ? '#f6c9c2' : FARBEN.papier);
      setzeBild(t.bild, `palette_${p.plaetze}`);
      const farbe = p.eil ? FARBEN.schlecht : FARBEN.textAufPapier;
      setze(t.auflage, `${tausender(p.auflage)} Ex`);
      setze(t.was1, 'falzen', farbe);
      setze(t.was2, p.heften ? '+ heften' : '', farbe);
      setze(t.rest, zuSpaet ? 'zu spät' : `${p.eil ? 'Eil ' : ''}${anzeigeSekunden(restzeit)} s`, zuSpaet || p.eil ? FARBEN.schlecht : FARBEN.textAufPapier);
      const anteil = restzeit / (p.termin - p.erschienen);
      m.balken(f.x + 3, f.y + 60, f.b - 6, 4, zuSpaet ? 1 : anteil, zuSpaet ? FARBEN.schlecht : terminFarbe(anteil));
    }

    // Lager
    setze(this.tLager, `Lager: ${s.belegt(s.lager)} von ${E.lagerPlaetze} Plätzen`);
    for (let i = 0; i < this.tLagerZelle.length; i++) {
      const f = lagerFeld(i);
      const p = s.lager[i];
      this.zelle(f, p, this.tLagerZelle[i]);
      if (!p) continue;
      // Grösse als Plätze, darunter die Zeit bis zum Liefertermin
      for (let k = 0; k < p.plaetze; k++) m.r(f.x + 5 + k * 7, f.y + 14, 6, 5, MF.anthrazit);
      const restzeit = p.termin - s.zeit;
      const anteil = restzeit / (p.termin - p.erschienen);
      m.balken(f.x + 3, f.y + 22, 24, 4, restzeit <= 0 ? 1 : anteil, restzeit <= 0 ? FARBEN.schlecht : terminFarbe(anteil));
    }

    // Abfahrt
    const bereit = s.lastwagenDa && s.geladen.length > 0;
    m.r(K_ABFAHRT.x, K_ABFAHRT.y, K_ABFAHRT.b, K_ABFAHRT.h, FARBEN.umriss);
    m.r(K_ABFAHRT.x + 1, K_ABFAHRT.y + 1, K_ABFAHRT.b - 2, K_ABFAHRT.h - 2, bereit ? FARBEN.gut : FARBEN.maschineDunkel);
    m.r(K_ABFAHRT.x + 1, K_ABFAHRT.y + K_ABFAHRT.h - 4, K_ABFAHRT.b - 2, 3, bereit ? '#2f8540' : '#3d4a5e');

    // Ziel für die gewählte Palette und rotes Aufleuchten nach einer abgelehnten Aktion
    if (this.auswahl !== null && s.falzenFrei) m.rahmen(FELD_MBO.x + 1, FELD_MBO.y + 1, FELD_MBO.b - 2, FELD_MBO.h - 2, FARBEN.akzent, 2);
    if (this.abgelehnt && Math.floor(this.abgelehnt.zeit * 10) % 2 === 0) {
      const f = this.abgelehnt.feld;
      this.vorn.r(f.x, f.y, f.b, f.h, FARBEN.schlecht, 0.45);
    }

    // Gezogene Palette
    const gezogen = this.ziehen?.aktiv ? s.eingang.find((x) => x.nummer === this.auswahl) : undefined;
    if (gezogen && this.ziehen) {
      const gx = Math.round(this.ziehen.x - 22);
      const gy = Math.round(this.ziehen.y - 26);
      this.vorn.r(gx, gy, 44, 16, FARBEN.akzent);
      this.vorn.r(gx + 2, gy + 2, 40, 12, FARBEN.papier);
      for (let k = 0; k < gezogen.plaetze; k++) this.vorn.r(gx + 6 + k * 11, gy + 5, 9, 6, MF.anthrazit);
    }
  }
}

// ---------------------------------------------------------------- Auswertung

export class AusruestungAuswertungSzene extends Phaser.Scene {
  private auswertung!: AusruestungAuswertung;
  private bestText = '';
  private kAuswahl: Rechteck = { x: 176, y: 146, b: 70, h: 30 };
  private kNochmals: Rechteck = { x: 248, y: 146, b: 70, h: 30 };

  constructor() {
    super('AusruestungAuswertung');
  }

  init(daten: { auswertung: AusruestungAuswertung }): void {
    this.auswertung = daten.auswertung;
    const w = daten.auswertung;
    if (TEMPO > 1) {
      this.bestText = 'Prüflauf: zählt nicht für die Bestleistung';
      return;
    }
    const meldung = meldeErgebnis('ausruestung', w.punkte, w.puenktlich, w.verspaetet);
    this.bestText = meldung.neu ? 'Neue Bestleistung!' : `Bestleistung: ${tausender(meldung.best.punkte).replace('-', 'minus ')} Punkte`;
    if (meldung.neu) spiele('bestleistung');
  }

  create(): void {
    const w = this.auswertung;
    const grund = new Maler(this.add.graphics());
    grund.r(0, 0, BREITE, HOEHE, FARBEN.wand);
    grund.r(0, 0, BREITE, 16, FARBEN.leiste);
    grund.r(0, 142, BREITE, 38, FARBEN.leiste);
    grund.r(4, 30, BREITE - 8, 108, FARBEN.papier);
    schrift(this, 4, 2, 'Auswertung der Schicht', FARBEN.text);
    schrift(this, BREITE - 4, 2, `Punkte ${tausender(w.punkte).replace('-', 'minus ')}`, FARBEN.text, 'rechts');
    schrift(this, 4, 18, `pünktlich: ${w.puenktlich}      verspätet: ${w.verspaetet}`, FARBEN.textAufBoden);
    schrift(this, BREITE - 4, 18, this.bestText, FARBEN.textAufBoden, 'rechts');
    schrift(this, 10, 36, `Pünktlich geliefert: ${w.puenktlich} ${w.puenktlich === 1 ? 'Auftrag' : 'Aufträge'}`, FARBEN.textAufPapier, 'links', 10);
    schrift(this, 10, 54, `Am Schichtende nicht geliefert: ${w.nichtGeliefert} (zählen als verspätet)`, FARBEN.textAufPapier);
    schrift(this, 10, 66, `Fahrten des Lastwagens: ${w.fahrten}, dabei leere Plätze: ${w.leerePlaetze}`, FARBEN.textAufPapier);
    schrift(this, 10, 78, `Stillstand der Maschinen wegen vollem Lager oder voller Ablage: ${anzeigeSekunden(w.stillstand)} s`, FARBEN.textAufPapier);
    const tipp =
      w.stillstand > 15
        ? 'Tipp: Verlade laufend und halte die Ablage frei, damit die Maschinen nicht stehen.'
        : w.nichtGeliefert > w.puenktlich
          ? 'Tipp: Fertiges früher verladen und den Lastwagen eher losschicken.'
          : w.verspaetet > w.puenktlich
            ? 'Tipp: Zuerst falzen, was den Martini Hefter füllt und früh fällig ist.'
            : w.fahrten > 0 && w.leerePlaetze > w.fahrten
              ? 'Tipp: Kleine Aufträge zusammen laden, wenn der Liefertermin es erlaubt.'
              : 'Sauber gearbeitet: geliefert, bevor der Liefertermin ablief.';
    schrift(this, 10, 100, tipp, FARBEN.textAufPapier);

    bild(this, this.kAuswahl.x, this.kAuswahl.y, 'schaltflaeche_blaettern');
    bild(this, this.kNochmals.x, this.kNochmals.y, 'schaltflaeche_nochmals_klein');
    schrift(this, this.kAuswahl.x + 35, 155, 'Auswahl', FARBEN.knopfText, 'mitte');
    schrift(this, this.kNochmals.x + 35, 155, 'Nochmals', FARBEN.knopfText, 'mitte');
    richteAus(this);
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (trifft(this.kNochmals, p.worldX, p.worldY)) this.scene.start('Ausruestung');
      else if (trifft(this.kAuswahl, p.worldX, p.worldY)) this.scene.start('Berufswahl', { bereich: 'ausruestung' });
    });
  }
}
