import Phaser from 'phaser';
import { anzeigeSekunden, tausender } from '../logik/dauer';
import { EINSTELLUNGEN, ZAHLENMODELL } from '../logik/daten';
import { maschinenName, werteAus, type Auswertung } from '../logik/auswertung';
import { Schicht } from '../logik/schicht';
import type { Auftrag, Farbigkeit } from '../logik/typen';
import { BILDER, MASCHINE_H } from '../grafik/bilder.ts';
import { BREITE, FARBEN, HOEHE, Maler, bild, minSek, richteAus, schrift, setze, setzeBild, trifft, type Rechteck } from './hilfen';

// Meilenstein M2: Pixelart im Design «Werkhalle». Alle Bilder kommen als PNG aus public/grafik/.

type Text = Phaser.GameObjects.Text;
type Bildobjekt = Phaser.GameObjects.Image;

// Prüfhilfe: Mit ?tempo=10 in der Adresse läuft die Schicht zehnmal so schnell. Ohne Angabe gilt 1.
const TEMPO = Math.max(1, Number(new URLSearchParams(window.location.search).get('tempo')) || 1);

function punkteText(punkte: number): string {
  return `Punkte ${tausender(punkte).replace('-', 'minus ')}`;
}

function farbSymbol(f: Farbigkeit): string {
  return f === '4/4' ? 'symbol_4-4' : 'symbol_4-0';
}

// ---------------------------------------------------------------- Laden

export class LadeSzene extends Phaser.Scene {
  constructor() {
    super('Laden');
  }

  preload(): void {
    for (const b of BILDER) this.load.image(b.name, `${import.meta.env.BASE_URL}grafik/${b.name}.png`);
  }

  create(): void {
    this.scene.start('Start');
  }
}

// ---------------------------------------------------------------- Startbild

export class StartSzene extends Phaser.Scene {
  private knopf: Rechteck = { x: 100, y: 138, b: 120, h: 32 };

  constructor() {
    super('Start');
  }

  create(): void {
    const m = new Maler(this.add.graphics());
    m.r(0, 0, BREITE, HOEHE, FARBEN.leiste);
    bild(this, 0, 16, 'drucksaal');
    ZAHLENMODELL.maschinen.forEach((ma, i) => bild(this, 5 + i * 104, 74, `${ma.id}_steht_1`));
    bild(this, this.knopf.x, this.knopf.y, 'schaltflaeche_start');
    schrift(this, 160, 2, 'Druckerei', FARBEN.text, 'mitte', 10);
    const hell = new Maler(this.add.graphics().setDepth(2));
    hell.r(30, 20, 260, 48, FARBEN.papier, 0.92);
    schrift(this, 160, 22, `Du bist Produktionsleiter. Verteile die Lauftaschen auf die ${ZAHLENMODELL.maschinen.length} Maschinen:`, FARBEN.textAufPapier, 'mitte');
    schrift(this, 160, 33, 'Lauftasche antippen, dann Maschine antippen. Oder ziehen.', FARBEN.textAufPapier, 'mitte');
    schrift(
      this,
      160,
      44,
      `Fertig bis zum Liefertermin: plus ${EINSTELLUNGEN.punktePuenktlich}. Zu spät: minus ${Math.abs(EINSTELLUNGEN.punkteVerspaetet)}.`,
      FARBEN.textAufPapier,
      'mitte',
    );
    schrift(this, 160, 55, `Eine Schicht dauert ${EINSTELLUNGEN.schichtDauer % 60 === 0 ? EINSTELLUNGEN.schichtDauer / 60 : minSek(EINSTELLUNGEN.schichtDauer)} Minuten.`, FARBEN.textAufPapier, 'mitte');
    schrift(this, 160, 147, 'Schicht starten', FARBEN.knopfText, 'mitte', 10);
    richteAus(this);
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (trifft(this.knopf, p.worldX, p.worldY)) this.scene.start('Schicht');
    });
  }
}

// ---------------------------------------------------------------- Schicht

const SPALTE = 104;
const FELD_OBEN = 17;
const FELD_HOEHE = 107;
const BODEN_Y = 90;
const TASCHE_Y = 129;

/** Fläche einer Maschine: Ziel für Tippen und Ziehen. */
function maschinenFeld(i: number): Rechteck {
  return { x: 4 + i * SPALTE + 1, y: FELD_OBEN, b: SPALTE - 2, h: FELD_HOEHE };
}

function taschenFeld(j: number): Rechteck {
  return { x: 3 + j * 79, y: TASCHE_Y, b: 76, h: 48 };
}

/** Plättchen k in der Reihe unter der Maschine: 0 = läuft, danach die Wartenden. */
function plaettchen(f: Rechteck, k: number): Rechteck {
  const n = EINSTELLUNGEN.maxWartendProMaschine + 1;
  const b = Math.floor((f.b - 4 - (n - 1)) / n);
  return { x: f.x + 2 + k * (b + 1), y: 110, b, h: 13 };
}

interface MaschinenTeile {
  bild: Bildobjekt;
  besetzt: Text;
  zustand: Text;
  plaettchen: Text[];
}

interface TaschenTeile {
  bild: Bildobjekt;
  auflage: Text;
  farbe: Text;
  rest: Text;
  symbol: Bildobjekt;
  uhr: Bildobjekt;
}

export class SchichtSzene extends Phaser.Scene {
  private schicht!: Schicht;
  private maler!: Maler;
  private geistMaler!: Maler;
  private tUhr!: Text;
  private tMitte!: Text;
  private tPunkte!: Text;
  private tGeist!: Text;
  private mTeile: MaschinenTeile[] = [];
  private lTeile: TaschenTeile[] = [];
  /** Feste Plätze der Lauftaschen: Auftragsnummer oder null */
  private plaetze: (number | null)[] = [];
  private auswahl: number | null = null;
  private ziehen: { startX: number; startY: number; x: number; y: number; aktiv: boolean } | null = null;
  /** Nur ein Finger bedient: Kennung des Zeigers, der gerade gedrückt ist */
  private zeiger: number | null = null;
  /** Restzeit des roten Blinkens pro Maschine (Zuteilung abgelehnt) */
  private blinken: number[] = [];
  private endePause = 0;
  private uhrzeit = 0;

  constructor() {
    super('Schicht');
  }

  create(): void {
    this.schicht = new Schicht(ZAHLENMODELL, EINSTELLUNGEN, Math.random);
    this.plaetze = Array.from({ length: EINSTELLUNGEN.maxOffeneLauftaschen }, () => null);
    this.auswahl = null;
    this.ziehen = null;
    this.zeiger = null;
    this.blinken = this.schicht.maschinen.map(() => 0);
    this.endePause = 0;
    this.uhrzeit = 0;
    this.mTeile = [];
    this.lTeile = [];

    const grund = new Maler(this.add.graphics());
    grund.r(0, 0, BREITE, HOEHE, FARBEN.leiste);
    bild(this, 0, 16, 'drucksaal', 0);
    bild(this, 4, 3, 'uhr_hell');
    this.maler = new Maler(this.add.graphics().setDepth(2));
    this.geistMaler = new Maler(this.add.graphics().setDepth(8));

    this.tUhr = schrift(this, 16, 2, '', FARBEN.text);
    this.tMitte = schrift(this, 192, 2, '', FARBEN.text, 'mitte');
    this.tPunkte = schrift(this, BREITE - 4, 2, '', FARBEN.text, 'rechts');
    this.tGeist = schrift(this, 0, 0, '', FARBEN.textAufPapier, 'mitte').setDepth(9);

    this.schicht.maschinen.forEach((ma, i) => {
      const f = maschinenFeld(i);
      const mitte = f.x + f.b / 2;
      const anzahl = EINSTELLUNGEN.maxWartendProMaschine + 1;
      schrift(this, mitte, 19, ma.daten.name, FARBEN.text, 'mitte');
      this.mTeile.push({
        bild: bild(this, f.x, BODEN_Y + 2 - MASCHINE_H, `${ma.daten.id}_steht_1`),
        besetzt: schrift(this, mitte, 32, '', FARBEN.textAufBoden, 'mitte'),
        zustand: schrift(this, mitte, 92, '', FARBEN.textAufBoden, 'mitte'),
        plaettchen: Array.from({ length: anzahl }, (_, k) => {
          const p = plaettchen(f, k);
          return schrift(this, p.x + Math.floor(p.b / 2), p.y, '', FARBEN.textAufPapier, 'mitte', 8);
        }),
      });
    });
    for (let j = 0; j < this.plaetze.length; j++) {
      const f = taschenFeld(j);
      this.lTeile.push({
        bild: bild(this, f.x, f.y, 'lauftasche').setVisible(false),
        auflage: schrift(this, f.x + 5, f.y + 7, '', FARBEN.textAufPapier, 'links', 10),
        symbol: bild(this, f.x + 5, f.y + 22, 'symbol_4-0', 3).setVisible(false),
        farbe: schrift(this, f.x + 26, f.y + 20, '', FARBEN.textAufPapier),
        uhr: bild(this, f.x + 5, f.y + 34, 'uhr_dunkel', 3).setVisible(false),
        rest: schrift(this, f.x + 17, f.y + 32, '', FARBEN.textAufPapier),
      });
    }
    richteAus(this);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.zeiger !== null && this.zeiger !== p.id) return;
      this.zeiger = p.id;
      this.runter(p.worldX, p.worldY);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.zeiger === p.id) this.bewegt(p.worldX, p.worldY);
    });
    const loslassen = (p: Phaser.Input.Pointer, zuteilen: boolean): void => {
      if (this.zeiger !== p.id) return;
      this.zeiger = null;
      if (zuteilen) this.hoch(p.worldX, p.worldY);
      else this.ziehen = null;
    };
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => loslassen(p, true));
    // Loslassen ausserhalb des Spielfelds bricht das Ziehen ab, ohne zuzuteilen.
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => loslassen(p, false));
  }

  // ------------------------------------------------------------ Bedienung

  private platzBei(x: number, y: number): number {
    for (let j = 0; j < this.plaetze.length; j++) if (this.plaetze[j] !== null && trifft(taschenFeld(j), x, y)) return j;
    return -1;
  }

  private maschineBei(x: number, y: number): number {
    for (let i = 0; i < this.schicht.maschinen.length; i++) if (trifft(maschinenFeld(i), x, y)) return i;
    return -1;
  }

  private teileZu(maschinenIndex: number): void {
    if (this.auswahl === null) return;
    const m = this.schicht.maschinen[maschinenIndex];
    const antwort = this.schicht.zuteilen(this.auswahl, m.daten.id);
    if (antwort.ok) this.auswahl = null;
    else if (antwort.grund === 'voll') this.blinken[maschinenIndex] = 0.6;
  }

  private runter(x: number, y: number): void {
    this.ziehen = null;
    const j = this.platzBei(x, y);
    if (j >= 0) {
      this.auswahl = this.plaetze[j];
      this.ziehen = { startX: x, startY: y, x, y, aktiv: false };
      return;
    }
    const i = this.maschineBei(x, y);
    if (i >= 0 && this.auswahl !== null) this.teileZu(i);
    else if (i < 0) this.auswahl = null;
  }

  private bewegt(x: number, y: number): void {
    if (!this.ziehen) return;
    this.ziehen.x = x;
    this.ziehen.y = y;
    if (!this.ziehen.aktiv && Math.hypot(x - this.ziehen.startX, y - this.ziehen.startY) > 5) this.ziehen.aktiv = true;
  }

  private hoch(x: number, y: number): void {
    if (this.ziehen?.aktiv) {
      const i = this.maschineBei(x, y);
      if (i >= 0) this.teileZu(i);
    }
    this.ziehen = null;
  }

  // ------------------------------------------------------------ Ablauf

  update(_zeit: number, delta: number): void {
    const s = this.schicht;
    let dt = (Math.min(delta, 100) / 1000) * TEMPO;
    if (s.abschnitt === 'zeitraffer') dt *= EINSTELLUNGEN.zeitraffer;
    this.uhrzeit += delta / 1000;
    if (s.abschnitt !== 'fertig') s.schritt(dt);
    else {
      this.endePause += delta / 1000;
      if (this.endePause > 0.8) {
        this.scene.start('Auswertung', { auswertung: werteAus(s) });
        return;
      }
    }
    for (let i = 0; i < this.blinken.length; i++) this.blinken[i] = Math.max(0, this.blinken[i] - delta / 1000);

    // Lauftaschen behalten ihren Platz, damit man nicht daneben tippt.
    const offen = new Set(s.offen.map((a) => a.nummer));
    for (let j = 0; j < this.plaetze.length; j++) if (this.plaetze[j] !== null && !offen.has(this.plaetze[j]!)) this.plaetze[j] = null;
    for (const a of s.offen) {
      if (!this.plaetze.includes(a.nummer)) {
        const frei = this.plaetze.indexOf(null);
        if (frei >= 0) this.plaetze[frei] = a.nummer;
      }
    }
    if (this.auswahl !== null && !offen.has(this.auswahl)) {
      this.auswahl = null;
      this.ziehen = null;
    }
    this.zeichne();
  }

  // ------------------------------------------------------------ Darstellung

  private zeichne(): void {
    const s = this.schicht;
    const m = this.maler;
    m.leeren();
    // Die Maschinen bewegen sich: zwei Bilder im Wechsel.
    const bewegung = 1 + (Math.floor(this.uhrzeit / 0.35) % 2);

    // Kopfleiste
    const rest = Math.max(0, EINSTELLUNGEN.schichtDauer - s.zeit);
    if (s.abschnitt === 'schicht') {
      setze(this.tUhr, `Schicht ${minSek(rest)}`);
      m.balken(66, 5, 60, 6, rest / EINSTELLUNGEN.schichtDauer, FARBEN.akzent);
    } else {
      setze(this.tUhr, 'Schichtende: Zeitraffer');
    }
    setze(this.tMitte, `pünktlich ${s.puenktlich}    verspätet ${s.verspaetet}`);
    setze(this.tPunkte, punkteText(s.punkte));

    // Maschinen
    s.maschinen.forEach((ma, i) => {
      const f = maschinenFeld(i);
      const t = this.mTeile[i];
      const laufend = ma.laufend;
      const phase = laufend ? laufend.phasen[laufend.phasenIndex] : null;
      const ziel = this.auswahl !== null && !s.istVoll(ma);
      const blinkt = this.blinken[i] > 0 && Math.floor(this.blinken[i] * 10) % 2 === 0;
      const mitte = f.x + f.b / 2;

      const zustand = !phase ? 'steht' : phase.art === 'ruesten' ? 'ruestet' : 'druckt';
      setzeBild(t.bild, `${ma.daten.id}_${zustand}_${zustand === 'steht' ? 1 : bewegung}`);

      // Schild mit dem Namen an der Wand
      m.r(mitte - 34, 18, 68, 13, FARBEN.umriss);
      m.r(mitte - 33, 19, 66, 11, FARBEN.leiste);
      const besetzt = s.besetztNoch(ma);
      setze(t.besetzt, besetzt > 0 ? `besetzt noch ${anzeigeSekunden(besetzt)} s` : 'frei');

      // Zustand und Fortschritt am Boden
      const zustandsfarbe = !phase ? FARBEN.maschine : phase.art === 'ruesten' ? FARBEN.warnung : FARBEN.gut;
      if (laufend && phase) {
        setze(t.zustand, `${phase.bezeichnung} ${anzeigeSekunden(phase.dauer - laufend.phasenZeit)} s`);
        m.balken(mitte - 35, 103, 70, 5, laufend.phasenZeit / phase.dauer, zustandsfarbe);
      } else {
        setze(t.zustand, 'steht');
        m.balken(mitte - 35, 103, 70, 5, 0, zustandsfarbe);
      }

      // Plättchen: der laufende Auftrag (blauer Rand) und die Wartenden
      const reihe = [laufend?.zuteilung.auftrag, ...ma.wartend.map((z) => z.auftrag)];
      for (let k = 0; k < t.plaettchen.length; k++) {
        const p = plaettchen(f, k);
        const a = reihe[k];
        if (!a) {
          m.r(p.x, p.y, p.b, p.h, FARBEN.bodenFuge);
          setze(t.plaettchen[k], '');
          continue;
        }
        m.r(p.x, p.y, p.b, p.h, k === 0 ? FARBEN.akzent : FARBEN.umriss);
        m.r(p.x + 1, p.y + 1, p.b - 2, p.h - 2, FARBEN.papier);
        setze(t.plaettchen[k], tausender(a.auflage));
        // Farbigkeit: ein oder zwei bedruckte Seiten als kleine Marken unten
        m.r(p.x + 2, p.y + p.h - 3, 4, 2, FARBEN.c);
        m.r(p.x + 7, p.y + p.h - 3, 4, 2, a.farbigkeit === '4/4' ? FARBEN.m : FARBEN.papierSchatten);
      }

      if (ziel) m.rahmen(f.x, f.y, f.b, f.h, FARBEN.akzent, 2);
      if (blinkt) m.r(f.x, f.y, f.b, f.h, FARBEN.schlecht, 0.45);
    });

    // Lauftaschen
    for (let j = 0; j < this.plaetze.length; j++) {
      const f = taschenFeld(j);
      const t = this.lTeile[j];
      const a: Auftrag | undefined = s.offen.find((x) => x.nummer === this.plaetze[j]);
      const da = a !== undefined;
      t.bild.setVisible(da);
      t.symbol.setVisible(da);
      t.uhr.setVisible(da);
      if (!a) {
        m.rahmen(f.x, f.y + 5, f.b, f.h - 5, FARBEN.maschineDunkel);
        setze(t.auflage, '');
        setze(t.farbe, '');
        setze(t.rest, '');
        continue;
      }
      const restzeit = a.termin - s.zeit;
      const zuSpaet = restzeit <= 0;
      setzeBild(t.bild, this.auswahl === a.nummer ? 'lauftasche_gewaehlt' : zuSpaet ? 'lauftasche_spaet' : 'lauftasche');
      setzeBild(t.symbol, farbSymbol(a.farbigkeit));
      setze(t.auflage, `${tausender(a.auflage)} Ex`);
      setze(t.farbe, a.farbigkeit);
      setze(t.rest, zuSpaet ? `zu spät ${anzeigeSekunden(-restzeit)} s` : `${anzeigeSekunden(restzeit)} s`, zuSpaet ? FARBEN.schlecht : FARBEN.textAufPapier);
      const anteil = restzeit / (a.termin - a.erschienen);
      if (!zuSpaet) m.balken(f.x + 40, f.y + 36, 30, 5, anteil, anteil > 0.5 ? FARBEN.gut : anteil > 0.25 ? FARBEN.warnung : FARBEN.schlecht);
    }

    // Gezogene Lauftasche
    const g = this.geistMaler;
    g.leeren();
    const gezogen = this.ziehen?.aktiv ? s.offen.find((x) => x.nummer === this.auswahl) : undefined;
    if (gezogen && this.ziehen) {
      const gx = Math.round(this.ziehen.x - 30);
      const gy = Math.round(this.ziehen.y - 26);
      g.r(gx, gy, 60, 18, FARBEN.akzent);
      g.r(gx + 2, gy + 2, 56, 14, FARBEN.papier);
      this.tGeist.setPosition(gx + 30, gy + 3);
      setze(this.tGeist, `${tausender(gezogen.auflage)} Ex  ${gezogen.farbigkeit}`);
      this.tGeist.setVisible(true);
    } else {
      this.tGeist.setVisible(false);
    }
  }
}

// ---------------------------------------------------------------- Auswertung

const PRO_SEITE = 5;

export class AuswertungSzene extends Phaser.Scene {
  private auswertung!: Auswertung;
  private seite = 0;
  private zeilen: Text[] = [];
  private tSeite!: Text;
  private maler!: Maler;
  private bZurueck!: Bildobjekt;
  private bWeiter!: Bildobjekt;
  private kZurueck: Rechteck = { x: 4, y: 146, b: 70, h: 30 };
  private kWeiter: Rechteck = { x: 78, y: 146, b: 70, h: 30 };
  private kNochmals: Rechteck = { x: 206, y: 146, b: 110, h: 30 };

  constructor() {
    super('Auswertung');
  }

  init(daten: { auswertung: Auswertung }): void {
    this.auswertung = daten.auswertung;
    this.seite = 0;
  }

  private get seiten(): number {
    return Math.max(1, Math.ceil(this.auswertung.verspaeteteAuftraege.length / PRO_SEITE));
  }

  create(): void {
    const w = this.auswertung;
    const grund = new Maler(this.add.graphics());
    grund.r(0, 0, BREITE, HOEHE, FARBEN.wand);
    grund.r(0, 0, BREITE, 16, FARBEN.leiste);
    grund.r(0, 142, BREITE, 38, FARBEN.leiste);
    this.maler = new Maler(this.add.graphics().setDepth(2));
    this.zeilen = [];
    schrift(this, 4, 2, 'Auswertung der Schicht', FARBEN.text);
    schrift(this, BREITE - 4, 2, punkteText(w.punkte), FARBEN.text, 'rechts');
    schrift(this, 4, 18, `pünktlich: ${w.puenktlich}      verspätet: ${w.verspaetet}`, FARBEN.textAufBoden);
    for (let i = 0; i < PRO_SEITE * 2; i++) this.zeilen.push(schrift(this, 8, 31 + Math.floor(i / 2) * 22 + (i % 2) * 10, '', FARBEN.textAufPapier));
    this.bZurueck = bild(this, this.kZurueck.x, this.kZurueck.y, 'schaltflaeche_blaettern_aus');
    this.bWeiter = bild(this, this.kWeiter.x, this.kWeiter.y, 'schaltflaeche_blaettern_aus');
    bild(this, this.kNochmals.x, this.kNochmals.y, 'schaltflaeche_nochmals');
    this.tSeite = schrift(this, 177, 155, '', FARBEN.text, 'mitte');
    schrift(this, this.kZurueck.x + 35, 155, 'Zurück', FARBEN.knopfText, 'mitte');
    schrift(this, this.kWeiter.x + 35, 155, 'Weiter', FARBEN.knopfText, 'mitte');
    schrift(this, this.kNochmals.x + 55, 154, 'Nochmals', FARBEN.knopfText, 'mitte', 10);
    richteAus(this);
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (trifft(this.kNochmals, p.worldX, p.worldY)) {
        this.scene.start('Schicht');
        return;
      }
      if (trifft(this.kWeiter, p.worldX, p.worldY) && this.seite < this.seiten - 1) this.seite++;
      else if (trifft(this.kZurueck, p.worldX, p.worldY) && this.seite > 0) this.seite--;
      this.zeichne();
    });
    this.zeichne();
  }

  private zeichne(): void {
    const m = this.maler;
    const liste = this.auswertung.verspaeteteAuftraege;
    m.leeren();
    for (let k = 0; k < PRO_SEITE; k++) {
      const eintrag = liste[this.seite * PRO_SEITE + k];
      const oben = this.zeilen[k * 2];
      const unten = this.zeilen[k * 2 + 1];
      if (!eintrag) {
        const leer = liste.length === 0 && k === 0;
        setze(oben, leer ? 'Kein Auftrag war verspätet. Saubere Schicht!' : '');
        setze(unten, '');
        continue;
      }
      m.r(4, 30 + k * 22, BREITE - 8, 21, FARBEN.papier);
      const a = eintrag.ergebnis.auftrag;
      const kopf = `Nr. ${a.nummer}: ${tausender(a.auflage)} Ex ${a.farbigkeit}`;
      if (eintrag.ergebnis.maschine === null || !eintrag.vergleich) {
        setze(oben, `${kopf}, nicht verteilt`);
        setze(unten, 'Zählt als verspätet.');
        continue;
      }
      const name = maschinenName(ZAHLENMODELL, eintrag.ergebnis.maschine);
      setze(oben, `${kopf} auf ${name}, ${anzeigeSekunden(eintrag.verspaetung ?? 0)} s zu spät`);
      const v = eintrag.vergleich;
      setze(
        unten,
        v.warBesteWahl
          ? 'Die gewählte Maschine war schon die früheste.'
          : `Auf ${maschinenName(ZAHLENMODELL, v.besteMaschine)} wäre er ${anzeigeSekunden(v.frueherUm)} s früher fertig gewesen.`,
      );
    }
    const mehrere = this.seiten > 1;
    setzeBild(this.bZurueck, mehrere && this.seite > 0 ? 'schaltflaeche_blaettern' : 'schaltflaeche_blaettern_aus');
    setzeBild(this.bWeiter, mehrere && this.seite < this.seiten - 1 ? 'schaltflaeche_blaettern' : 'schaltflaeche_blaettern_aus');
    setze(this.tSeite, `Seite ${this.seite + 1}/${this.seiten}`);
  }
}
