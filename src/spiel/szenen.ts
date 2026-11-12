import Phaser from 'phaser';
import { anzeigeSekunden, tausender } from '../logik/dauer';
import { EINSTELLUNGEN, ZAHLENMODELL } from '../logik/daten';
import { maschinenName, werteAus, type Auswertung } from '../logik/auswertung';
import { Schicht } from '../logik/schicht';
import type { Auftrag } from '../logik/typen';
import { BREITE, FARBEN, HOEHE, Maler, minSek, schrift, setze, trifft, type Rechteck } from './hilfen';

// Meilenstein M1: spielbare Schicht mit einfachen Platzhaltern (Rechtecke statt Pixelart).

type Text = Phaser.GameObjects.Text;

// Prüfhilfe: Mit ?tempo=10 in der Adresse läuft die Schicht zehnmal so schnell. Ohne Angabe gilt 1.
const TEMPO = Math.max(1, Number(new URLSearchParams(window.location.search).get('tempo')) || 1);

// ---------------------------------------------------------------- Startbild

export class StartSzene extends Phaser.Scene {
  private knopf: Rechteck = { x: 100, y: 112, b: 120, h: 32 };

  constructor() {
    super('Start');
  }

  create(): void {
    const m = new Maler(this.add.graphics());
    m.r(0, 0, BREITE, HOEHE, FARBEN.wand);
    m.r(0, 0, BREITE, 16, FARBEN.leiste);
    m.r(0, 150, BREITE, 30, FARBEN.boden);
    m.knopf(this.knopf, FARBEN.knopf, FARBEN.knopfDunkel);
    schrift(this, 160, 4, 'Druckerei', FARBEN.text, 'mitte');
    schrift(this, 160, 34, 'Du bist Produktionsleiter im Drucksaal.', FARBEN.textAufBoden, 'mitte');
    schrift(this, 160, 50, `Verteile die Lauftaschen auf die ${ZAHLENMODELL.maschinen.length} Maschinen:`, FARBEN.textAufBoden, 'mitte');
    schrift(this, 160, 62, 'Lauftasche antippen, dann Maschine antippen. Oder ziehen.', FARBEN.textAufBoden, 'mitte');
    schrift(this, 160, 78, `Fertig bis zum Liefertermin: plus ${EINSTELLUNGEN.punktePuenktlich}. Zu spät: minus ${Math.abs(EINSTELLUNGEN.punkteVerspaetet)}.`, FARBEN.textAufBoden, 'mitte');
    schrift(this, 160, 90, `Eine Schicht dauert ${minSek(EINSTELLUNGEN.schichtDauer)} Minuten.`, FARBEN.textAufBoden, 'mitte');
    schrift(this, 160, 123, 'Schicht starten', FARBEN.knopfText, 'mitte');
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (trifft(this.knopf, p.x, p.y)) this.scene.start('Schicht');
    });
  }
}

// ---------------------------------------------------------------- Schicht

const SPALTE = 104;
const FELD_OBEN = 18;
const FELD_HOEHE = 104;
const TASCHE_B = 76;
const TASCHE_H = 48;
const TASCHE_Y = 129;

function maschinenFeld(i: number): Rechteck {
  return { x: 4 + i * SPALTE + 1, y: FELD_OBEN, b: SPALTE - 2, h: FELD_HOEHE };
}

/** Warteplatz k einer Maschine. Anzahl aus der Einstelldatei. */
function wartePlatz(f: Rechteck, k: number): Rechteck {
  const n = EINSTELLUNGEN.maxWartendProMaschine;
  const b = Math.floor((f.b - 8 - (n - 1)) / n);
  return { x: f.x + 4 + k * (b + 1), y: f.y + 64, b, h: 22 };
}

function taschenFeld(j: number): Rechteck {
  return { x: 3 + j * 79, y: TASCHE_Y, b: TASCHE_B, h: TASCHE_H };
}

interface MaschinenTexte {
  name: Text;
  zustand: Text;
  auftrag: Text;
  besetzt: Text;
  warte: Text[];
}

interface TaschenTexte {
  auflage: Text;
  farbe: Text;
  rest: Text;
}

export class SchichtSzene extends Phaser.Scene {
  private schicht!: Schicht;
  private maler!: Maler;
  private geistMaler!: Maler;
  private tUhr!: Text;
  private tMitte!: Text;
  private tPunkte!: Text;
  private tGeist!: Text;
  private mTexte: MaschinenTexte[] = [];
  private lTexte: TaschenTexte[] = [];
  /** Feste Plätze der Lauftaschen: Auftragsnummer oder null */
  private plaetze: (number | null)[] = [];
  private auswahl: number | null = null;
  private ziehen: { startX: number; startY: number; x: number; y: number; aktiv: boolean } | null = null;
  /** Nur ein Finger bedient: Kennung des Zeigers, der gerade gedrückt ist */
  private zeiger: number | null = null;
  /** Restzeit des roten Blinkens pro Maschine (Zuteilung abgelehnt) */
  private blinken: number[] = [];
  private endePause = 0;

  constructor() {
    super('Schicht');
  }

  create(): void {
    this.schicht = new Schicht(ZAHLENMODELL, EINSTELLUNGEN, Math.random);
    this.plaetze = Array.from({ length: EINSTELLUNGEN.maxOffeneLauftaschen }, () => null);
    this.auswahl = null;
    this.ziehen = null;
    this.blinken = this.schicht.maschinen.map(() => 0);
    this.endePause = 0;
    this.mTexte = [];
    this.lTexte = [];

    this.maler = new Maler(this.add.graphics());
    this.geistMaler = new Maler(this.add.graphics().setDepth(8));

    this.tUhr = schrift(this, 4, 4, '', FARBEN.text);
    this.tMitte = schrift(this, 192, 4, '', FARBEN.text, 'mitte');
    this.tPunkte = schrift(this, BREITE - 4, 4, '', FARBEN.text, 'rechts');
    this.tGeist = schrift(this, 0, 0, '', FARBEN.textAufPapier, 'mitte').setDepth(9);

    this.schicht.maschinen.forEach((_, i) => {
      const f = maschinenFeld(i);
      const mitte = f.x + f.b / 2;
      this.mTexte.push({
        name: schrift(this, mitte, f.y + 3, '', FARBEN.text, 'mitte'),
        zustand: schrift(this, mitte, f.y + 22, '', FARBEN.textAufPapier, 'mitte'),
        auftrag: schrift(this, mitte, f.y + 42, '', FARBEN.textAufBoden, 'mitte'),
        besetzt: schrift(this, mitte, f.y + 92, '', FARBEN.textAufBoden, 'mitte'),
        warte: Array.from({ length: EINSTELLUNGEN.maxWartendProMaschine }, (_, k) => {
          const w = wartePlatz(f, k);
          return schrift(this, w.x + Math.floor(w.b / 2), w.y + 4, '', FARBEN.textAufPapier, 'mitte');
        }),
      });
    });
    for (let j = 0; j < this.plaetze.length; j++) {
      const f = taschenFeld(j);
      this.lTexte.push({
        auflage: schrift(this, f.x + 5, f.y + 5, '', FARBEN.textAufPapier),
        farbe: schrift(this, f.x + 5, f.y + 17, '', FARBEN.textAufPapier),
        rest: schrift(this, f.x + 5, f.y + 29, '', FARBEN.textAufPapier),
      });
    }

    this.zeiger = null;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.zeiger !== null && this.zeiger !== p.id) return;
      this.zeiger = p.id;
      this.runter(p.x, p.y);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.zeiger === p.id) this.bewegt(p.x, p.y);
    });
    const loslassen = (p: Phaser.Input.Pointer, zuteilen: boolean): void => {
      if (this.zeiger !== p.id) return;
      this.zeiger = null;
      if (zuteilen) this.hoch(p.x, p.y);
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
    m.r(0, 0, BREITE, HOEHE, FARBEN.boden);
    m.r(0, 0, BREITE, 16, FARBEN.leiste);
    m.r(0, 125, BREITE, 55, FARBEN.leiste);

    // Kopfleiste
    const rest = Math.max(0, EINSTELLUNGEN.schichtDauer - s.zeit);
    if (s.abschnitt === 'schicht') {
      setze(this.tUhr, `Schicht ${minSek(rest)}`);
      m.balken(58, 5, 60, 6, rest / EINSTELLUNGEN.schichtDauer, FARBEN.akzent);
    } else {
      setze(this.tUhr, 'Schichtende: Zeitraffer');
    }
    setze(this.tMitte, `pünktlich ${s.puenktlich}   verspätet ${s.verspaetet}`);
    setze(this.tPunkte, `Punkte ${tausender(s.punkte).replace('-', 'minus ')}`);

    // Maschinen
    s.maschinen.forEach((ma, i) => {
      const f = maschinenFeld(i);
      const t = this.mTexte[i];
      const laufend = ma.laufend;
      const phase = laufend ? laufend.phasen[laufend.phasenIndex] : null;
      const ziel = this.auswahl !== null && !s.istVoll(ma);
      const blinkt = this.blinken[i] > 0 && Math.floor(this.blinken[i] * 10) % 2 === 0;

      m.r(f.x, f.y, f.b, f.h, blinkt ? FARBEN.schlecht : FARBEN.wand);
      m.rahmen(f.x, f.y, f.b, f.h, ziel ? FARBEN.akzent : FARBEN.wandDunkel, ziel ? 2 : 1);
      m.r(f.x + 2, f.y + 2, f.b - 4, 12, FARBEN.leiste);
      setze(t.name, ma.daten.name);

      // Platzhalter der Maschine: Farbe zeigt den Zustand
      const zustandsfarbe = !phase ? FARBEN.maschine : phase.art === 'ruesten' ? FARBEN.warnung : FARBEN.gut;
      m.r(f.x + 14, f.y + 17, f.b - 28, 20, FARBEN.umriss);
      m.r(f.x + 15, f.y + 18, f.b - 30, 18, zustandsfarbe);
      if (laufend && phase) {
        const phasenRest = phase.dauer - laufend.phasenZeit;
        const a = laufend.zuteilung.auftrag;
        setze(t.zustand, `${phase.bezeichnung} ${anzeigeSekunden(phasenRest)} s`);
        setze(t.auftrag, `${tausender(a.auflage)} Ex  ${a.farbigkeit}`);
        m.balken(f.x + 11, f.y + 54, f.b - 22, 6, laufend.phasenZeit / phase.dauer, zustandsfarbe);
      } else {
        setze(t.zustand, 'steht');
        setze(t.auftrag, 'kein Auftrag');
        m.balken(f.x + 11, f.y + 54, f.b - 22, 6, 0, FARBEN.maschine);
      }

      // Warteschlange
      for (let k = 0; k < t.warte.length; k++) {
        const z = ma.wartend[k];
        const w = wartePlatz(f, k);
        m.r(w.x, w.y, w.b, w.h, FARBEN.wandDunkel);
        if (z) {
          m.r(w.x + 1, w.y + 1, w.b - 2, w.h - 2, FARBEN.papier);
          setze(t.warte[k], `${tausender(z.auftrag.auflage)}\n${z.auftrag.farbigkeit}`);
        } else {
          setze(t.warte[k], '');
        }
      }
      const besetzt = s.besetztNoch(ma);
      setze(t.besetzt, besetzt > 0 ? `besetzt noch ${anzeigeSekunden(besetzt)} s` : 'frei');
    });

    // Lauftaschen
    for (let j = 0; j < this.plaetze.length; j++) {
      const f = taschenFeld(j);
      const t = this.lTexte[j];
      const a: Auftrag | undefined = s.offen.find((x) => x.nummer === this.plaetze[j]);
      if (!a) {
        m.rahmen(f.x, f.y, f.b, f.h, FARBEN.maschineDunkel);
        setze(t.auflage, '');
        setze(t.farbe, '');
        setze(t.rest, '');
        continue;
      }
      const restzeit = a.termin - s.zeit;
      const zuSpaet = restzeit <= 0;
      const gewaehlt = this.auswahl === a.nummer;
      m.r(f.x, f.y, f.b, f.h, gewaehlt ? FARBEN.akzent : FARBEN.umriss);
      const rand = gewaehlt ? 2 : 1;
      m.r(f.x + rand, f.y + rand, f.b - 2 * rand, f.h - 2 * rand, zuSpaet ? '#f3b8b0' : FARBEN.papier);
      setze(t.auflage, `${tausender(a.auflage)} Ex`);
      setze(t.farbe, a.farbigkeit);
      setze(t.rest, zuSpaet ? `zu spät seit ${anzeigeSekunden(-restzeit)} s` : `noch ${anzeigeSekunden(restzeit)} s`, zuSpaet ? FARBEN.schlecht : FARBEN.textAufPapier);
      // Farbigkeit als Symbol: bedruckte Seiten
      this.farbsymbol(m, f.x + 26, f.y + 17, a.farbigkeit === '4/4');
      const anteil = restzeit / (a.termin - a.erschienen);
      m.balken(f.x + 5, f.y + 40, f.b - 10, 5, anteil, anteil > 0.5 ? FARBEN.gut : anteil > 0.25 ? FARBEN.warnung : FARBEN.schlecht);
    }

    // Gezogene Lauftasche
    const g = this.geistMaler;
    g.leeren();
    const gezogen = this.ziehen?.aktiv ? s.offen.find((x) => x.nummer === this.auswahl) : undefined;
    if (gezogen && this.ziehen) {
      const gx = Math.round(this.ziehen.x - 30);
      const gy = Math.round(this.ziehen.y - 26);
      g.r(gx, gy, 60, 20, FARBEN.akzent);
      g.r(gx + 2, gy + 2, 56, 16, FARBEN.papier);
      this.tGeist.setPosition(gx + 30, gy + 6);
      setze(this.tGeist, `${tausender(gezogen.auflage)} Ex  ${gezogen.farbigkeit}`);
      this.tGeist.setVisible(true);
    } else {
      this.tGeist.setVisible(false);
    }
  }

  private farbsymbol(m: Maler, x: number, y: number, beidseitig: boolean): void {
    const bogen = (bx: number, bedruckt: boolean): void => {
      m.r(bx, y, 8, 9, FARBEN.umriss);
      m.r(bx + 1, y + 1, 6, 7, FARBEN.papier);
      if (bedruckt) {
        m.r(bx + 2, y + 2, 2, 2, FARBEN.c);
        m.r(bx + 4, y + 2, 2, 2, FARBEN.m);
        m.r(bx + 2, y + 5, 2, 2, FARBEN.y);
        m.r(bx + 4, y + 5, 2, 2, FARBEN.k);
      }
    };
    bogen(x, true);
    bogen(x + 9, beidseitig);
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
    this.maler = new Maler(this.add.graphics());
    this.zeilen = [];
    schrift(this, 4, 4, 'Auswertung der Schicht', FARBEN.text);
    schrift(this, BREITE - 4, 4, `Punkte ${tausender(w.punkte).replace('-', 'minus ')}`, FARBEN.text, 'rechts');
    schrift(this, 4, 20, `pünktlich: ${w.puenktlich}     verspätet: ${w.verspaetet}`, FARBEN.textAufBoden);
    for (let i = 0; i < PRO_SEITE * 2; i++) this.zeilen.push(schrift(this, 8, 34 + Math.floor(i / 2) * 22 + (i % 2) * 9, '', FARBEN.textAufPapier));
    this.tSeite = schrift(this, 177, 157, '', FARBEN.text, 'mitte');
    schrift(this, this.kZurueck.x + 35, 157, 'Zurück', FARBEN.knopfText, 'mitte');
    schrift(this, this.kWeiter.x + 35, 157, 'Weiter', FARBEN.knopfText, 'mitte');
    schrift(this, this.kNochmals.x + 55, 157, 'Nochmals', FARBEN.knopfText, 'mitte');
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (trifft(this.kNochmals, p.x, p.y)) this.scene.start('Schicht');
      else if (trifft(this.kWeiter, p.x, p.y) && this.seite < this.seiten - 1) this.seite++;
      else if (trifft(this.kZurueck, p.x, p.y) && this.seite > 0) this.seite--;
      this.zeichne();
    });
    this.zeichne();
  }

  private zeichne(): void {
    const m = this.maler;
    const liste = this.auswertung.verspaeteteAuftraege;
    m.leeren();
    m.r(0, 0, BREITE, HOEHE, FARBEN.wand);
    m.r(0, 0, BREITE, 16, FARBEN.leiste);
    m.r(0, 142, BREITE, 38, FARBEN.leiste);
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
      m.r(4, 32 + k * 22, BREITE - 8, 21, FARBEN.papier);
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
    m.knopf(this.kZurueck, mehrere && this.seite > 0 ? FARBEN.knopf : FARBEN.maschineDunkel, FARBEN.knopfDunkel);
    m.knopf(this.kWeiter, mehrere && this.seite < this.seiten - 1 ? FARBEN.knopf : FARBEN.maschineDunkel, FARBEN.knopfDunkel);
    m.knopf(this.kNochmals, FARBEN.gut, FARBEN.knopfDunkel);
    setze(this.tSeite, `Seite ${this.seite + 1}/${this.seiten}`);
  }
}
