import Phaser from 'phaser';
import { anzeigeSekunden, tausender } from '../logik/dauer';
import { SCHNEIDEN } from '../logik/daten';
import { Schneiden, nutzen, type Linie, type SchneidenAuswertung, type Stapel } from '../logik/schneiden';
import { MF } from '../grafik/zeichnen.ts';
import { BREITE, FARBEN, HOEHE, Maler, bild, minSek, richteAus, schrift, setze, setzeBild, trifft, type Rechteck } from './hilfen';
import { meldeErgebnis } from './speicher';
import { spiele } from './ton';

// Bereich Schneiden: links die Paletten, der Rüttler und die Schneidemaschine,
// rechts der Monitor mit dem Druckbogen, den Nutzen und den Linien.

type Text = Phaser.GameObjects.Text;
type Bildobjekt = Phaser.GameObjects.Image;

// Prüfhilfe wie in den anderen Bereichen: ?tempo=10 lässt die Schicht schneller laufen.
const TEMPO = Math.max(1, Number(new URLSearchParams(window.location.search).get('tempo')) || 1);

// Beim Schneiden wird der Bogen an den gewählten Linien wirklich geteilt. Mit ?schnitt=alt in der Adresse gilt die frühere Fassung ohne Teilen.
const TEILEN = new URLSearchParams(window.location.search).get('schnitt') !== 'alt';
/** Abstand zwischen den Teilen nach dem Schnitt (Spielpixel) und Zeiten der Schnittanimation in Sekunden */
const SPALT = 2;
const TEIL_AUSEINANDER = 0.4;
const TEIL_MELDUNG = 0.9;
const TEIL_ENDE = 2.4;

type Zeichner = (x: number, y: number, b: number, h: number, farbe: string) => void;

/** Druckbogen auf dem Monitor */
const BOGEN: Rechteck = { x: 130, y: 48, b: 176, h: 90 };
/** Fläche, in der ein Tipp eine Linie wählt: Bogen samt Griffen oben und links */
const TIPPFELD: Rechteck = { x: 112, y: 34, b: 198, h: 108 };
/** So nah muss ein Tipp an einer Linie liegen (Spielpixel) */
const FANG = 9;
const K_SCHNEIDEN: Rechteck = { x: 196, y: 147, b: 120, h: 32 };
/** Unbedruckter Rand des Druckbogens, etwas dunkler als der weisse Rahmen der Nutzen */
const BOGEN_GRUND = '#d3d8dd';
const ROT = '#d94a3d';
const GRUEN = '#2f9e44';

function kartenFeld(i: number): Rechteck {
  return { x: 4, y: 19 + i * 33, b: 98, h: 31 };
}

function linieX(l: Linie): number {
  return Math.round(BOGEN.x + l.lage * BOGEN.b);
}

function linieY(l: Linie): number {
  return Math.round(BOGEN.y + l.lage * BOGEN.h);
}

export class SchneidenSzene extends Phaser.Scene {
  private spiel!: Schneiden;
  private maler!: Maler;
  private tUhr!: Text;
  private tMitte!: Text;
  private tPunkte!: Text;
  private tAuftrag!: Text;
  private tStatus!: Text;
  private tMeldung!: Text;
  private tLeer!: Text;
  private kartenTexte: { name: Text; nutzen: Text }[] = [];
  private bRuettler!: Bildobjekt;
  private bMaschine!: Bildobjekt;
  private meldungZeit = 0;
  private ablehnZeit = 0;
  private ablehnFeld: Rechteck | null = null;
  private endePause = 0;
  private lauf = 0;
  /** Laufende Schnittanimation: der geschnittene Stapel, die Zeit seit dem Schnitt und die Meldung danach */
  private schnitt: { stapel: Stapel; zeit: number; text: string; farbe: string; richtig: boolean; gemeldet: boolean } | null = null;

  constructor() {
    super('Schneiden');
  }

  create(): void {
    this.spiel = new Schneiden(SCHNEIDEN, Math.random);
    // Prüfhilfe: Im Prüflauf (?tempo grösser als 1) ist der Spielstand von aussen lesbar. Zählt nicht für die Bestleistung.
    if (TEMPO > 1) (window as unknown as { druckereiPruefung?: Schneiden }).druckereiPruefung = this.spiel;
    this.meldungZeit = 0;
    this.ablehnZeit = 0;
    this.ablehnFeld = null;
    this.endePause = 0;
    this.lauf = 0;
    this.schnitt = null;

    const grund = new Maler(this.add.graphics());
    grund.r(0, 0, BREITE, HOEHE, FARBEN.wand);
    grund.r(0, 120, BREITE, 60, FARBEN.boden);
    grund.r(0, 0, BREITE, 16, FARBEN.leiste);
    // Monitor
    grund.r(108, 19, 208, 126, MF.anthrazitDunkel);
    grund.r(110, 21, 204, 122, '#eef0f2');
    bild(this, 4, 3, 'uhr_hell');
    this.bRuettler = bild(this, 4, 138, 'ruettler_leer');
    this.bMaschine = bild(this, 46, 132, 'schneidemaschine_steht');
    schrift(this, 24, 127, 'Rüttler', FARBEN.textAufBoden, 'mitte', 8);
    schrift(this, 74, 121, 'Schneidemaschine', FARBEN.textAufBoden, 'mitte', 8);
    this.maler = new Maler(this.add.graphics().setDepth(2));

    this.tUhr = schrift(this, 16, 2, '', FARBEN.text);
    this.tMitte = schrift(this, 192, 2, '', FARBEN.text, 'mitte');
    this.tPunkte = schrift(this, BREITE - 4, 2, '', FARBEN.text, 'rechts');
    this.tAuftrag = schrift(this, 114, 22, '', FARBEN.textAufPapier, 'links', 10);
    this.tStatus = schrift(this, 310, 23, '', FARBEN.textAufPapier, 'rechts');
    this.tLeer = schrift(this, 212, 80, 'Palette antippen:\nDer Stapel kommt auf den Rüttler.', FARBEN.textAufPapier, 'mitte', 10).setAlign('center');
    this.tMeldung = schrift(this, 212, 82, '', GRUEN, 'mitte', 14).setDepth(9).setVisible(false);
    schrift(this, 108, 150, 'Rote Linien antippen:', FARBEN.textAufBoden, 'links', 8);
    schrift(this, 108, 161, 'grün = Schnitt', FARBEN.textAufBoden, 'links', 8);
    bild(this, K_SCHNEIDEN.x, K_SCHNEIDEN.y, 'schaltflaeche_start');
    schrift(this, K_SCHNEIDEN.x + K_SCHNEIDEN.b / 2, 156, 'Schneiden', FARBEN.knopfText, 'mitte', 10);

    this.kartenTexte = [];
    for (let i = 0; i < SCHNEIDEN.wartend; i++) {
      const f = kartenFeld(i);
      bild(this, f.x + 3, f.y + 6, 'palette_2', 3);
      this.kartenTexte.push({
        name: schrift(this, f.x + 33, f.y + 4, '', FARBEN.textAufPapier, 'links', 10),
        nutzen: schrift(this, f.x + 33, f.y + 17, '', FARBEN.textAufPapier),
      });
    }
    richteAus(this);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.tippe(p.worldX, p.worldY));
  }

  private lehneAb(feld: Rechteck): void {
    this.ablehnFeld = feld;
    this.ablehnZeit = 0.5;
    spiele('abgelehnt');
  }

  private melde(text: string, farbe: string): void {
    setze(this.tMeldung, text, farbe);
    this.meldungZeit = 1.4;
  }

  private tippe(x: number, y: number): void {
    const s = this.spiel;
    if (s.fertig) return;
    // Paletten
    for (let i = 0; i < s.eingang.length; i++) {
      const f = kartenFeld(i);
      if (!trifft(f, x, y)) continue;
      // Solange der geteilte Bogen noch auf dem Monitor liegt, kommt keine neue Palette.
      if (!this.schnitt && s.nimm(s.eingang[i].nummer)) spiele('zuteilen');
      else this.lehneAb(f);
      return;
    }
    // Schneiden
    if (trifft(K_SCHNEIDEN, x, y)) {
      const vorher = s.aktiv;
      const antwort = this.schnitt ? 'nichts' : s.schneide();
      if (TEILEN && vorher && (antwort === 'richtig' || antwort === 'fehlschnitt')) {
        // Zuerst teilt sich der Bogen an den gewählten Linien, erst danach kommt die Meldung.
        const richtig = antwort === 'richtig';
        const text = richtig ? `plus ${SCHNEIDEN.punkteRichtig}` : `Fehlschnitt: Makulatur, minus ${Math.abs(SCHNEIDEN.punkteFehlschnitt)}`;
        this.schnitt = { stapel: vorher, zeit: 0, text, farbe: richtig ? GRUEN : ROT, richtig, gemeldet: false };
        spiele('zuteilen');
      } else if (antwort === 'richtig') {
        spiele('puenktlich');
        this.melde(`plus ${SCHNEIDEN.punkteRichtig}`, GRUEN);
      } else if (antwort === 'fehlschnitt') {
        spiele('verspaetet');
        this.melde(`Fehlschnitt: Makulatur, minus ${Math.abs(SCHNEIDEN.punkteFehlschnitt)}`, ROT);
      } else if (vorher) {
        this.lehneAb(K_SCHNEIDEN);
      }
      return;
    }
    // Linien auf dem Monitor
    if (this.schnitt || !s.aktiv || !trifft(TIPPFELD, x, y)) return;
    const nurSenkrecht = y < BOGEN.y;
    const nurWaagrecht = x < BOGEN.x;
    let beste = -1;
    let abstand = FANG + 0.5;
    s.aktiv.linien.forEach((l, i) => {
      if (l.richtung === 'senkrecht' && nurWaagrecht) return;
      if (l.richtung === 'waagrecht' && nurSenkrecht) return;
      const d = l.richtung === 'senkrecht' ? Math.abs(x - linieX(l)) : Math.abs(y - linieY(l));
      if (d < abstand) {
        abstand = d;
        beste = i;
      }
    });
    if (beste >= 0 && s.waehle(beste)) spiele('zuteilen');
  }

  update(_zeit: number, delta: number): void {
    const s = this.spiel;
    const echt = delta / 1000;
    this.lauf += echt;
    if (!s.fertig) {
      s.schritt((Math.min(delta, 100) / 1000) * TEMPO);
      if (s.fertig) spiele('schichtende');
    } else {
      this.endePause += echt;
      if (this.endePause > 0.8) {
        this.scene.start('SchneidenAuswertung', { auswertung: s.auswertung() });
        return;
      }
    }
    this.meldungZeit = Math.max(0, this.meldungZeit - echt);
    const t = this.schnitt;
    if (t) {
      t.zeit += echt;
      if (!t.gemeldet && t.zeit >= TEIL_MELDUNG) {
        t.gemeldet = true;
        spiele(t.richtig ? 'puenktlich' : 'verspaetet');
        this.melde(t.text, t.farbe);
      }
      // Der geteilte Bogen bleibt liegen, bis die Meldung weg ist und die Schneidemaschine fertig ist.
      if (t.zeit >= TEIL_ENDE && !(s.phase === 'schneiden' && s.aktiv === t.stapel)) this.schnitt = null;
    }
    this.ablehnZeit = Math.max(0, this.ablehnZeit - echt);
    this.zeichne();
  }

  /** Ein Nutzen: Bild eines Hauses mit weissem Rahmen. Geschnitten wird aussen am weissen Rahmen. */
  private zeichneNutzen(r: Zeichner, x: number, y: number, b: number, h: number): void {
    r(x, y, b, h, '#ffffff');
    const rahmen = 3; // Breite des weissen Rahmens
    const bx = x + rahmen;
    const by = y + rahmen;
    const bb = b - 2 * rahmen;
    const bh = h - 2 * rahmen;
    const boden = Math.max(3, Math.round(bh * 0.22));
    r(bx, by, bb, bh - boden, '#8ecbf0'); // Himmel
    r(bx, by + bh - boden, bb, boden, '#5dae4f'); // Wiese
    // Haus in der Mitte: Wand, Dach als Treppe, Tür und Fenster
    const hausB = Math.max(8, Math.min(Math.round(bb * 0.55), Math.round(bh * 0.9)));
    const wandH = Math.max(5, Math.round(bh * 0.34));
    const hx = bx + Math.round((bb - hausB) / 2);
    const wy = by + bh - boden - wandH + 1;
    r(hx, wy, hausB, wandH, '#f1e3c4');
    const stufen = Math.max(2, Math.min(Math.floor(hausB / 4), Math.floor((wy - by - 2) / 2)));
    for (let i = 0; i < stufen; i++) {
      const einzug = Math.round(((i + 1) * (hausB / 2 - 1)) / stufen) - 1;
      r(hx - 1 + einzug, wy - 2 * (i + 1), hausB + 2 - 2 * einzug, 2, '#4a4f57'); // dunkles Dach, damit rote Linien sichtbar bleiben
    }
    const tuerB = Math.max(2, Math.round(hausB * 0.2));
    r(hx + Math.round(hausB * 0.6), wy + wandH - Math.round(wandH * 0.7), tuerB, Math.round(wandH * 0.7), '#7a4a2a');
    r(hx + Math.round(hausB * 0.15), wy + 2, Math.max(2, Math.round(hausB * 0.22)), Math.max(2, Math.round(wandH * 0.4)), '#3f7fbd');
  }

  /** Druckbogen mit den Nutzen, ohne Linien. */
  private zeichneBogen(a: Stapel, r: Zeichner): void {
    const e = SCHNEIDEN;
    r(BOGEN.x - 1, BOGEN.y - 1, BOGEN.b + 2, BOGEN.h + 2, MF.silberDunkel);
    r(BOGEN.x, BOGEN.y, BOGEN.b, BOGEN.h, BOGEN_GRUND);
    const innenX = BOGEN.x + e.rand * BOGEN.b;
    const innenY = BOGEN.y + e.rand * BOGEN.h;
    const nb = ((1 - 2 * e.rand) * BOGEN.b) / a.auftrag.spalten;
    const nh = ((1 - 2 * e.rand) * BOGEN.h) / a.auftrag.zeilen;
    for (let zeile = 0; zeile < a.auftrag.zeilen; zeile++) {
      for (let spalte = 0; spalte < a.auftrag.spalten; spalte++) {
        const x = Math.round(innenX + spalte * nb);
        const y = Math.round(innenY + zeile * nh);
        const b = Math.round(innenX + (spalte + 1) * nb) - x;
        const h = Math.round(innenY + (zeile + 1) * nh) - y;
        this.zeichneNutzen(r, x, y, b, h);
      }
    }
  }

  /** Der Bogen ist an den gewählten Linien geteilt, die Teile rücken auseinander. */
  private zeichneGeteilt(a: Stapel, zeit: number): void {
    const m = this.maler;
    const teile: [number, number, number, number, string][] = [];
    this.zeichneBogen(a, (x, y, b, h, farbe) => teile.push([x, y, b, h, farbe]));
    const grenzen = (richtung: Linie['richtung'], von: number, bis: number, lage: (l: Linie) => number): number[] => {
      const schnitte = a.linien.filter((l) => l.gewaehlt && l.richtung === richtung).map(lage);
      return [...new Set([von, ...schnitte, bis])].sort((p, q) => p - q);
    };
    const xs = grenzen('senkrecht', BOGEN.x - 1, BOGEN.x + BOGEN.b + 1, linieX);
    const ys = grenzen('waagrecht', BOGEN.y - 1, BOGEN.y + BOGEN.h + 1, linieY);
    const anteil = Math.min(1, zeit / TEIL_AUSEINANDER);
    const spalt = SPALT * anteil * (2 - anteil);
    for (let i = 0; i < xs.length - 1; i++) {
      for (let j = 0; j < ys.length - 1; j++) {
        const dx = Math.round((i - (xs.length - 2) / 2) * spalt);
        const dy = Math.round((j - (ys.length - 2) / 2) * spalt);
        for (const [x, y, b, h, farbe] of teile) {
          // Jedes Rechteck auf das Teil zuschneiden und mit dem Teil verschieben
          const links = Math.max(x, xs[i]);
          const oben = Math.max(y, ys[j]);
          const rechts = Math.min(x + b, xs[i + 1]);
          const unten = Math.min(y + h, ys[j + 1]);
          if (rechts > links && unten > oben) m.r(links + dx, oben + dy, rechts - links, unten - oben, farbe);
        }
      }
    }
  }

  private zeichne(): void {
    const s = this.spiel;
    const e = SCHNEIDEN;
    const m = this.maler;
    m.leeren();

    // Kopfleiste
    const rest = Math.max(0, e.dauer - s.zeit);
    setze(this.tUhr, `Schicht ${minSek(rest)}`);
    m.balken(66, 5, 60, 6, rest / e.dauer, FARBEN.akzent);
    setze(this.tMitte, `richtig ${s.richtig}    Fehlschnitte ${s.fehlschnitte}`);
    setze(this.tPunkte, `Punkte ${tausender(s.punkte).replace('-', 'minus ')}`);

    // Paletten
    const frei = s.phase === 'leer';
    s.eingang.forEach((stapel, i) => {
      const f = kartenFeld(i);
      m.r(f.x, f.y, f.b, f.h, frei ? FARBEN.akzent : FARBEN.umriss);
      m.r(f.x + 1, f.y + 1, f.b - 2, f.h - 2, FARBEN.papier);
      const n = nutzen(stapel.auftrag);
      setze(this.kartenTexte[i].name, stapel.auftrag.name);
      setze(this.kartenTexte[i].nutzen, `${n} Nutzen`);
    });

    // Rüttler und Schneidemaschine
    const bewegung = Math.floor(this.lauf * 8) % 2;
    setzeBild(this.bRuettler, s.phase === 'ruetteln' ? `ruettler_${bewegung + 1}` : 'ruettler_leer');
    setzeBild(this.bMaschine, s.phase === 'bereit' ? 'schneidemaschine_bereit' : s.phase === 'schneiden' ? (bewegung === 0 ? 'schneidemaschine_schneidet' : 'schneidemaschine_bereit') : 'schneidemaschine_steht');

    // Monitor
    const a = this.schnitt?.stapel ?? s.aktiv;
    this.tLeer.setVisible(!a && this.meldungZeit <= 0);
    setze(this.tAuftrag, a ? `${a.auftrag.name}: ${nutzen(a.auftrag)} Nutzen` : 'Monitor');
    const status =
      s.phase === 'ruetteln'
        ? `rüttelt ${anzeigeSekunden(s.phaseRest)} s`
        : s.phase === 'bereit'
          ? 'bereit zum Schneiden'
          : s.phase === 'schneiden'
            ? `schneidet ${anzeigeSekunden(s.phaseRest)} s`
            : '';
    setze(this.tStatus, this.schnitt && !this.schnitt.gemeldet ? 'schneidet' : status);
    if (a && this.schnitt) {
      this.zeichneGeteilt(a, this.schnitt.zeit);
    } else if (a) {
      this.zeichneBogen(a, (x, y, b, h, farbe) => m.r(x, y, b, h, farbe));
      // Linien mit Griff oben oder links
      const waehlbar = s.phase === 'ruetteln' || s.phase === 'bereit';
      for (const l of a.linien) {
        if (!waehlbar && !l.gewaehlt) continue;
        const farbe = l.gewaehlt ? GRUEN : ROT;
        const dicke = l.gewaehlt ? 2 : 1;
        if (l.richtung === 'senkrecht') {
          const x = linieX(l);
          m.r(x - (dicke - 1), BOGEN.y - 4, dicke, BOGEN.h + 8, farbe);
          m.r(x - 3, BOGEN.y - 11, 7, 7, farbe);
        } else {
          const y = linieY(l);
          m.r(BOGEN.x - 4, y - (dicke - 1), BOGEN.b + 8, dicke, farbe);
          m.r(BOGEN.x - 11, y - 3, 7, 7, farbe);
        }
      }
    }

    // Meldung nach dem Schnitt
    const zeigt = this.meldungZeit > 0;
    this.tMeldung.setVisible(zeigt);
    // Liegt der geteilte Bogen auf dem Monitor, steht die Meldung darüber, damit man den Schnitt sieht.
    const oben = this.schnitt !== null;
    const my = oben ? 23 : 79;
    this.tMeldung.setY(my + 3);
    this.tAuftrag.setVisible(!(zeigt && oben));
    this.tStatus.setVisible(!(zeigt && oben));
    if (zeigt) {
      const b = Math.ceil(this.tMeldung.width) + 12;
      m.r(Math.round(212 - b / 2), my, b, 22, FARBEN.umriss);
      m.r(Math.round(212 - b / 2) + 1, my + 1, b - 2, 20, FARBEN.papier);
    }

    // Abgelehnt: Feld blinkt rot
    if (this.ablehnZeit > 0 && this.ablehnFeld && Math.floor(this.ablehnZeit * 10) % 2 === 0) {
      const f = this.ablehnFeld;
      m.r(f.x, f.y, f.b, f.h, FARBEN.schlecht, 0.5);
    }
  }
}

// ---------------------------------------------------------------- Auswertung

export class SchneidenAuswertungSzene extends Phaser.Scene {
  private auswertung!: SchneidenAuswertung;
  private bestText = '';
  private kAuswahl: Rechteck = { x: 176, y: 146, b: 70, h: 30 };
  private kNochmals: Rechteck = { x: 248, y: 146, b: 70, h: 30 };

  constructor() {
    super('SchneidenAuswertung');
  }

  init(daten: { auswertung: SchneidenAuswertung }): void {
    this.auswertung = daten.auswertung;
    const w = daten.auswertung;
    if (TEMPO > 1) {
      this.bestText = 'Prüflauf: zählt nicht für die Bestleistung';
      return;
    }
    const meldung = meldeErgebnis('schneiden', w.punkte, w.richtig, w.fehlschnitte);
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
    schrift(this, 4, 18, `richtig: ${w.richtig}      Fehlschnitte: ${w.fehlschnitte}`, FARBEN.textAufBoden);
    schrift(this, BREITE - 4, 18, this.bestText, FARBEN.textAufBoden, 'rechts');
    schrift(this, 10, 36, `Richtig geschnittene Paletten: ${w.richtig}`, FARBEN.textAufPapier, 'links', 10);
    schrift(this, 10, 54, `Schnitte insgesamt: ${w.schnitte}`, FARBEN.textAufPapier);
    schrift(this, 10, 66, `Fehlschnitte (Stapel ist Makulatur): ${w.fehlschnitte}`, FARBEN.textAufPapier);
    const tipp =
      w.richtig + w.fehlschnitte === 0
        ? 'Tipp: Palette antippen, Linien wählen, dann «Schneiden».'
        : w.fehlschnitte > w.richtig
          ? 'Tipp: Geschnitten wird nur am Rand der Nutzen, nie mitten durch einen Nutzen.'
          : w.fehlschnitte > 0
            ? 'Tipp: Vor dem Schneiden die grünen Linien zählen: Kein Rand darf fehlen.'
            : 'Sauber gearbeitet: kein einziger Fehlschnitt.';
    schrift(this, 10, 108, tipp, FARBEN.textAufPapier);

    bild(this, this.kAuswahl.x, this.kAuswahl.y, 'schaltflaeche_blaettern');
    bild(this, this.kNochmals.x, this.kNochmals.y, 'schaltflaeche_nochmals_klein');
    schrift(this, this.kAuswahl.x + 35, 155, 'Auswahl', FARBEN.knopfText, 'mitte');
    schrift(this, this.kNochmals.x + 35, 155, 'Nochmals', FARBEN.knopfText, 'mitte');
    richteAus(this);
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (trifft(this.kNochmals, p.worldX, p.worldY)) this.scene.start('Schneiden');
      else if (trifft(this.kAuswahl, p.worldX, p.worldY)) this.scene.start('Berufswahl', { bereich: 'schneiden' });
    });
  }
}
