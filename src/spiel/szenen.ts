import Phaser from 'phaser';
import { anzeigeSekunden, tausender } from '../logik/dauer';
import { EINSTELLUNGEN, LEITSTAND, ZAHLENMODELL } from '../logik/daten';
import { maschinenName, werteAus, type Auswertung } from '../logik/auswertung';
import { Schicht } from '../logik/schicht';
import type { Auftrag, Farbigkeit } from '../logik/typen';
import { BILDER, MASCHINE_H } from '../grafik/bilder.ts';
import { ladeBestleistung, meldeErgebnis, setzeTon, tonAn, type Bereich } from './speicher';
import { spiele } from './ton';
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
    for (const b of BILDER) if (b.imSpiel !== false) this.load.image(b.name, `${import.meta.env.BASE_URL}grafik/${b.name}.png`);
  }

  create(): void {
    this.scene.start('Start');
  }
}

// ---------------------------------------------------------------- Auswahl des Bereichs

export class StartSzene extends Phaser.Scene {
  // Antippbare Bereiche: links der Arbeitsplatz des Produktionsleiters, rechts der Medientechnologe an der RA 76.
  private kProduktion: Rechteck = { x: 0, y: 16, b: 104, h: 164 };
  private kLeitstand: Rechteck = { x: 216, y: 16, b: 104, h: 164 };
  private kTon: Rechteck = { x: 125, y: 142, b: 70, h: 30 };

  constructor() {
    super('Start');
  }

  create(): void {
    const m = new Maler(this.add.graphics());
    m.r(0, 0, BREITE, HOEHE, FARBEN.leiste);
    bild(this, 0, 16, 'drucksaal');
    schrift(this, 160, 2, 'Wähle deinen Bereich: Person antippen', FARBEN.text, 'mitte', 10);

    // Drucksaal: Arbeitsplatz, Digitaldruck, SM 52, RA 76 (die Maschinenbilder sind 102 breit, die Maschine steht in der Mitte)
    bild(this, 6, 92, 'arbeitsplatz');
    bild(this, 44 - 15, 74, 'digital_steht_1');
    bild(this, 124 - 13, 74, 'sm52_steht_1');
    bild(this, 208 - 2, 74, 'ra76_steht_1');

    // Firmenschild an der Wand
    const schild = new Maler(this.add.graphics().setDepth(2));
    schild.r(101, 20, 118, 29, FARBEN.umriss);
    schild.r(102, 21, 116, 27, FARBEN.papier);
    bild(this, 108, 26, 'logo_wallimann', 3);

    // Personen: gerahmtes Porträt mit Namensschild
    const person = (x: number, portrait: string, name: string): void => {
      schild.r(x - 2, 21, 44, 50, FARBEN.akzent);
      bild(this, x, 23, portrait, 3);
      // Das Schild richtet sich nach der echten Breite des Textes, damit nichts übersteht.
      const text = schrift(this, 0, 73, name, FARBEN.knopfText, 'mitte', 10);
      const breite = Math.ceil(text.width) + 12;
      const links = Math.round(Math.max(2, Math.min(BREITE - breite - 2, x + 20 - breite / 2)));
      schild.r(links, 72, breite, 14, FARBEN.umriss);
      schild.r(links + 1, 73, breite - 2, 12, FARBEN.akzent);
      text.setX(links + breite / 2);
    };
    person(18, 'portrait_produktionsleiter', 'Produktionsleiter');
    person(262, 'portrait_medientechnologe', 'Medientechnologe');

    // Fussleiste: Aufgabe und Bestleistung je Bereich, in der Mitte der Ton
    const bestP = ladeBestleistung('produktion');
    const bestL = ladeBestleistung('leitstand');
    schrift(this, 6, 130, 'Lauftaschen verteilen', FARBEN.text);
    if (bestP) schrift(this, 6, 142, `Bestleistung: ${tausender(bestP.punkte).replace('-', 'minus ')} Punkte`, FARBEN.text, 'links', 8);
    schrift(this, BREITE - 6, 130, 'Farbe und Passer am Leitstand', FARBEN.text, 'rechts');
    if (bestL) schrift(this, BREITE - 6, 142, `Bestleistung: ${tausender(bestL.punkte)} Gutbogen`, FARBEN.text, 'rechts', 8);
    bild(this, this.kTon.x, this.kTon.y, 'schaltflaeche_blaettern');
    const tTon = schrift(this, this.kTon.x + 35, this.kTon.y + 9, tonAn() ? 'Ton: an' : 'Ton: aus', FARBEN.knopfText, 'mitte');
    richteAus(this);
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (trifft(this.kTon, p.worldX, p.worldY)) {
        setzeTon(!tonAn());
        setze(tTon, tonAn() ? 'Ton: an' : 'Ton: aus');
        spiele('zuteilen');
      } else if (trifft(this.kProduktion, p.worldX, p.worldY)) {
        spiele('zuteilen');
        this.scene.start('Einfuehrung', { bereich: 'produktion' });
      } else if (trifft(this.kLeitstand, p.worldX, p.worldY)) {
        spiele('zuteilen');
        this.scene.start('Einfuehrung', { bereich: 'leitstand' });
      }
    });
  }
}

// ---------------------------------------------------------------- Einführung in den Bereich

export class EinfuehrungSzene extends Phaser.Scene {
  private bereich: Bereich = 'produktion';
  private kStart: Rechteck = { x: 100, y: 138, b: 120, h: 32 };
  private kZurueck: Rechteck = { x: 6, y: 139, b: 70, h: 30 };

  constructor() {
    super('Einfuehrung');
  }

  init(daten: { bereich: Bereich }): void {
    this.bereich = daten.bereich;
  }

  create(): void {
    const produktion = this.bereich === 'produktion';
    const m = new Maler(this.add.graphics());
    m.r(0, 0, BREITE, HOEHE, FARBEN.leiste);
    bild(this, 0, 16, 'drucksaal');
    ZAHLENMODELL.maschinen.forEach((ma, i) => bild(this, 5 + i * 104, 74, `${ma.id}_steht_1`));
    schrift(this, 160, 2, produktion ? 'Produktionsleiter' : 'Medientechnologe', FARBEN.text, 'mitte', 10);
    const e = EINSTELLUNGEN;
    const minuten = (sekunden: number): string => (sekunden % 60 === 0 ? String(sekunden / 60) : minSek(sekunden));
    const zeilen = produktion
      ? [
          `Du verteilst die Lauftaschen auf die ${ZAHLENMODELL.maschinen.length} Maschinen:`,
          'Lauftasche antippen, dann Maschine antippen. Oder ziehen.',
          `Fertig bis zum Liefertermin: plus ${e.punktePuenktlich}. Zu spät: minus ${Math.abs(e.punkteVerspaetet)}.`,
          `Eine Schicht dauert ${minuten(e.schichtDauer)} Minuten.`,
        ]
      : [
          'Du überwachst den Fortdruck am Leitstand der RA 76.',
          'Läuft eine Farbe weg: mit den Pfeilen mehr oder weniger Farbe geben.',
          'Passt Magenta nicht: Passer mit dem Steuerkreuz zurückstellen.',
          `Nur wenn alles stimmt, entstehen Gutbogen. Dauer: ${minuten(LEITSTAND.dauer)} Minuten.`,
        ];
    const hell = new Maler(this.add.graphics().setDepth(2));
    // Das Textfeld richtet sich nach der breitesten Zeile, damit kein Text übersteht.
    const texte = zeilen.map((z, i) => schrift(this, 160, 22 + i * 11, z, FARBEN.textAufPapier, 'mitte'));
    const feldBreite = Math.min(BREITE - 8, Math.ceil(Math.max(...texte.map((t) => t.width))) + 16);
    hell.r(Math.round(160 - feldBreite / 2), 20, feldBreite, 48, FARBEN.papier, 0.92);
    bild(this, this.kStart.x, this.kStart.y, 'schaltflaeche_start');
    bild(this, this.kZurueck.x, this.kZurueck.y, 'schaltflaeche_blaettern');
    schrift(this, 160, 147, produktion ? 'Schicht starten' : 'Fortdruck starten', FARBEN.knopfText, 'mitte', 10);
    schrift(this, this.kZurueck.x + 35, 148, 'Zurück', FARBEN.knopfText, 'mitte');
    richteAus(this);
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (trifft(this.kStart, p.worldX, p.worldY)) {
        spiele('start');
        this.scene.start(produktion ? 'Schicht' : 'Leitstand');
      } else if (trifft(this.kZurueck, p.worldX, p.worldY)) {
        this.scene.start('Start');
      }
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

/** Drucker an der Maschine: holt die Lauftasche und trägt sie zur Maschine. Reine Darstellung, ohne Einfluss auf die Zeiten. */
interface Figur {
  bild: Bildobjekt;
  x: number;
  y: number;
  heimX: number;
  heimY: number;
  traegt: boolean;
  nachLinks: boolean;
  strecke: number;
  /** Wegpunkte: Beim Ankommen nimmt die Figur die Lauftasche auf oder legt sie ab. */
  wege: { x: number; y: number; traegtDanach: boolean }[];
}

/** Standplatz des Druckers je Maschine, gemessen ab dem linken Rand der Maschinenfläche. */
const STANDPLATZ: Record<string, number> = { digital: 8, sm52: 18, ra76: 8 };
const SCHRITT_TEMPO = 85;

interface Meldung {
  text: Text;
  alter: number;
  startY: number;
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
  private figuren: Figur[] = [];
  private meldungen: Meldung[] = [];
  /** Nummer des laufenden Auftrags je Maschine, um den Wechsel zum nächsten zu erkennen */
  private laufendNummer: (number | null)[] = [];
  private gewertet = 0;
  private endeGemeldet = false;

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
    this.figuren = [];
    this.meldungen = [];
    this.laufendNummer = this.schicht.maschinen.map(() => null);
    this.gewertet = 0;
    this.endeGemeldet = false;

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
      const heimX = f.x + (STANDPLATZ[ma.daten.id] ?? 6);
      const heimY = BODEN_Y + 1;
      this.figuren.push({ bild: bild(this, heimX - 5, heimY - 16, 'drucker_steht', 4), x: heimX, y: heimY, heimX, heimY, traegt: false, nachLinks: false, strecke: 0, wege: [] });
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
    const platz = this.plaetze.indexOf(this.auswahl);
    const nummer = this.auswahl;
    const antwort = this.schicht.zuteilen(nummer, m.daten.id);
    if (antwort.ok) {
      this.auswahl = null;
      spiele('zuteilen');
      // Der Drucker holt die Lauftasche am unteren Rand des Drucksaals ab.
      const t = taschenFeld(Math.max(0, platz));
      this.hole(maschinenIndex, t.x + t.b / 2, 122);
      // Startet der Auftrag sofort, ist das kein Wechsel aus der Warteschlange.
      if (m.laufend?.zuteilung.auftrag.nummer === nummer) this.laufendNummer[maschinenIndex] = nummer;
    } else if (antwort.grund === 'voll') {
      this.blinken[maschinenIndex] = 0.6;
      spiele('abgelehnt');
    }
  }

  /** Schickt den Drucker einer Maschine los: hin zum Abholort, mit der Lauftasche zurück an seinen Platz. */
  private hole(maschinenIndex: number, x: number, y: number): void {
    const fig = this.figuren[maschinenIndex];
    // Staut es sich, lässt er ältere Gänge aus und holt nur noch die neueste Lauftasche.
    if (fig.wege.length >= 4) fig.wege.length = 0;
    fig.wege.push({ x: Math.max(8, Math.min(BREITE - 8, x)), y, traegtDanach: true }, { x: fig.heimX, y: fig.heimY, traegtDanach: false });
  }

  private bewegeFiguren(dt: number): void {
    for (const fig of this.figuren) {
      let rest = SCHRITT_TEMPO * dt * (1 + fig.wege.length / 3);
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
      const geht = fig.wege.length > 0;
      if (!geht) fig.nachLinks = false;
      const name = `drucker_${geht ? `geht_${1 + (Math.floor(fig.strecke / 5) % 2)}` : 'steht'}${fig.traegt ? '_tasche' : ''}`;
      setzeBild(fig.bild, name);
      fig.bild.setFlipX(fig.nachLinks);
      fig.bild.setPosition(Math.round(fig.x) - 5, Math.round(fig.y) - 16);
    }
  }

  /** Kurze Meldung über der Maschine, wenn ein Auftrag fertig ist. */
  private melde(maschinenIndex: number, puenktlich: boolean): void {
    const f = maschinenFeld(maschinenIndex);
    const e = EINSTELLUNGEN;
    const inhalt = puenktlich ? `plus ${e.punktePuenktlich}` : `minus ${Math.abs(e.punkteVerspaetet)}`;
    const text = schrift(this, f.x + f.b / 2, 52, inhalt, puenktlich ? '#1f7a30' : FARBEN.schlecht, 'mitte', 11).setDepth(7);
    this.meldungen.push({ text, alter: 0, startY: 52 });
  }

  private pflegeMeldungen(dt: number): void {
    for (const m of this.meldungen) {
      m.alter += dt;
      m.text.setY(Math.round(m.startY - m.alter * 6));
      m.text.setAlpha(Math.max(0, Math.min(1, 2.4 - m.alter * 1.6)));
    }
    for (const m of this.meldungen.filter((x) => x.alter > 1.5)) m.text.destroy();
    this.meldungen = this.meldungen.filter((x) => x.alter <= 1.5);
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

    // Fertige Aufträge melden (Ton und kurze Anzeige über der Maschine).
    for (; this.gewertet < s.ergebnisse.length; this.gewertet++) {
      const e = s.ergebnisse[this.gewertet];
      if (e.maschine === null) continue;
      this.melde(s.maschinen.findIndex((x) => x.daten.id === e.maschine), e.puenktlich);
      spiele(e.puenktlich ? 'puenktlich' : 'verspaetet');
    }
    if (s.abschnitt !== 'schicht' && !this.endeGemeldet) {
      this.endeGemeldet = true;
      spiele('schichtende');
    }
    // Startet der nächste wartende Auftrag, holt der Drucker dessen Lauftasche aus der Reihe unter der Maschine.
    s.maschinen.forEach((ma, i) => {
      const nummer = ma.laufend?.zuteilung.auftrag.nummer ?? null;
      if (nummer !== this.laufendNummer[i]) {
        if (nummer !== null) {
          const p = plaettchen(maschinenFeld(i), 1);
          this.hole(i, p.x + p.b / 2, 112);
        }
        this.laufendNummer[i] = nummer;
      }
    });
    const echt = delta / 1000;
    this.bewegeFiguren(echt * (s.abschnitt === 'zeitraffer' ? 3 : 1));
    this.pflegeMeldungen(echt);

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
  private kZurueck: Rechteck = { x: 2, y: 146, b: 70, h: 30 };
  private kWeiter: Rechteck = { x: 74, y: 146, b: 70, h: 30 };
  private kAuswahl: Rechteck = { x: 176, y: 146, b: 70, h: 30 };
  private kNochmals: Rechteck = { x: 248, y: 146, b: 70, h: 30 };
  private bestText = '';

  constructor() {
    super('Auswertung');
  }

  init(daten: { auswertung: Auswertung }): void {
    this.auswertung = daten.auswertung;
    this.seite = 0;
    const w = daten.auswertung;
    if (TEMPO > 1) {
      // Mit der Prüfhilfe ?tempo= zählt die Schicht nicht für die Bestleistung.
      this.bestText = 'Prüflauf: zählt nicht für die Bestleistung';
      return;
    }
    const meldung = meldeErgebnis('produktion', w.punkte, w.puenktlich, w.verspaetet);
    this.bestText = meldung.neu ? 'Neue Bestleistung!' : `Bestleistung: ${tausender(meldung.best.punkte).replace('-', 'minus ')} Punkte`;
    if (meldung.neu) spiele('bestleistung');
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
    schrift(this, BREITE - 4, 18, this.bestText, FARBEN.textAufBoden, 'rechts');
    for (let i = 0; i < PRO_SEITE * 2; i++) this.zeilen.push(schrift(this, 8, 30 + Math.floor(i / 2) * 22 + (i % 2) * 9, '', FARBEN.textAufPapier));
    this.bZurueck = bild(this, this.kZurueck.x, this.kZurueck.y, 'schaltflaeche_blaettern_aus');
    this.bWeiter = bild(this, this.kWeiter.x, this.kWeiter.y, 'schaltflaeche_blaettern_aus');
    bild(this, this.kNochmals.x, this.kNochmals.y, 'schaltflaeche_nochmals_klein');
    bild(this, this.kAuswahl.x, this.kAuswahl.y, 'schaltflaeche_blaettern');
    schrift(this, this.kAuswahl.x + 35, 155, 'Auswahl', FARBEN.knopfText, 'mitte');
    this.tSeite = schrift(this, 160, 155, '', FARBEN.text, 'mitte', 8);
    schrift(this, this.kZurueck.x + 35, 155, 'Zurück', FARBEN.knopfText, 'mitte');
    schrift(this, this.kWeiter.x + 35, 155, 'Weiter', FARBEN.knopfText, 'mitte');
    schrift(this, this.kNochmals.x + 35, 155, 'Nochmals', FARBEN.knopfText, 'mitte');
    richteAus(this);
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (trifft(this.kNochmals, p.worldX, p.worldY)) {
        this.scene.start('Schicht');
        return;
      }
      if (trifft(this.kAuswahl, p.worldX, p.worldY)) {
        this.scene.start('Start');
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
    setze(this.tSeite, `${this.seite + 1}/${this.seiten}`);
  }
}
