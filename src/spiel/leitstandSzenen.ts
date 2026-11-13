import Phaser from 'phaser';
import { anzeigeSekunden, tausender } from '../logik/dauer';
import { LEITSTAND } from '../logik/daten';
import { FARBNAMEN, Leitstand, type LeitstandAuswertung } from '../logik/leitstand';
import { MF } from '../grafik/zeichnen.ts';
import { BREITE, FARBEN, HOEHE, Maler, bild, minSek, richteAus, schrift, setze, trifft, type Rechteck } from './hilfen';
import { meldeErgebnis } from './speicher';
import { spiele } from './ton';

// Bereich Medientechnologe: Leitstand der RA 76 im Fortdruck.
// Links die vier Farben mit Tasten für mehr und weniger Farbe, rechts das Passerkreuz
// unter dem Fadenzähler mit Steuerkreuz.

type Text = Phaser.GameObjects.Text;

// Prüfhilfe wie im Bereich Produktionsleiter: ?tempo=10 lässt den Fortdruck schneller laufen.
const TEMPO = Math.max(1, Number(new URLSearchParams(window.location.search).get('tempo')) || 1);

const KANALFARBEN = [MF.c, MF.m, MF.y, MF.k];
const SPALTE = 47;
const ANZEIGE_OBEN = 52;
const ANZEIGE_HOEHE = 72;
const LUPE = { x: 258, y: 57, r: 27 };
/** Länge eines Arms des Passerkreuzes */
const ARM = 13;
/** Ein Schritt des Passers in Spielpixeln: so gewählt, dass das Kreuz auch bei der grössten Verschiebung im Fadenzähler bleibt */
const PASSER_PIXEL = Math.max(1, Math.floor((LUPE.r - ARM - 1) / LEITSTAND.passerMax));

function spaltenMitte(i: number): number {
  return 28 + i * SPALTE;
}

function tasteMehr(i: number): Rechteck {
  return { x: spaltenMitte(i) - 20, y: 19, b: 40, h: 30 };
}

function tasteWeniger(i: number): Rechteck {
  return { x: spaltenMitte(i) - 20, y: 127, b: 40, h: 30 };
}

const STEUERKREUZ: { name: string; feld: Rechteck; dx: number; dy: number }[] = [
  { name: 'hoch', feld: { x: 243, y: 88, b: 30, h: 30 }, dx: 0, dy: -1 },
  { name: 'links', feld: { x: 212, y: 118, b: 30, h: 30 }, dx: -1, dy: 0 },
  { name: 'rechts', feld: { x: 274, y: 118, b: 30, h: 30 }, dx: 1, dy: 0 },
  { name: 'runter', feld: { x: 243, y: 148, b: 30, h: 30 }, dx: 0, dy: 1 },
];

export class LeitstandSzene extends Phaser.Scene {
  private leitstand!: Leitstand;
  private maler!: Maler;
  private tUhr!: Text;
  private tZaehler!: Text;
  private tStatus!: Text;
  private warGut = true;
  private endePause = 0;
  private uhrzeit = 0;

  constructor() {
    super('Leitstand');
  }

  create(): void {
    this.leitstand = new Leitstand(LEITSTAND, Math.random);
    this.warGut = true;
    this.endePause = 0;
    this.uhrzeit = 0;

    const grund = new Maler(this.add.graphics());
    grund.r(0, 0, BREITE, HOEHE, MF.anthrazitDunkel);
    grund.r(0, 0, BREITE, 16, FARBEN.leiste);
    grund.r(2, 17, 198, 161, MF.anthrazit);
    grund.r(202, 17, 116, 161, MF.anthrazit);
    bild(this, 4, 3, 'uhr_hell');
    this.maler = new Maler(this.add.graphics().setDepth(2));

    this.tUhr = schrift(this, 16, 2, '', FARBEN.text);
    this.tStatus = schrift(this, 150, 2, '', FARBEN.text, 'mitte');
    this.tZaehler = schrift(this, BREITE - 4, 2, '', FARBEN.text, 'rechts');

    FARBNAMEN.forEach((name, i) => {
      const mehr = tasteMehr(i);
      const weniger = tasteWeniger(i);
      bild(this, mehr.x, mehr.y, 'taste_farbe_hoch');
      bild(this, weniger.x, weniger.y, 'taste_farbe_runter');
      schrift(this, spaltenMitte(i), 160, name, FARBEN.text, 'mitte');
    });
    schrift(this, LUPE.x, 18, 'Fadenzähler: Passer Magenta', FARBEN.text, 'mitte');
    for (const k of STEUERKREUZ) bild(this, k.feld.x, k.feld.y, `taste_passer_${k.name}`);
    richteAus(this);

    // Tasten reagieren sofort beim Antippen, auch mit zwei Fingern gleichzeitig.
    this.input.addPointer(1);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.tippe(p.worldX, p.worldY));
  }

  private tippe(x: number, y: number): void {
    const l = this.leitstand;
    if (l.fertig) return;
    for (let i = 0; i < FARBNAMEN.length; i++) {
      if (trifft(tasteMehr(i), x, y)) {
        l.stelleFarbe(i, 1);
        spiele('zuteilen');
        return;
      }
      if (trifft(tasteWeniger(i), x, y)) {
        l.stelleFarbe(i, -1);
        spiele('zuteilen');
        return;
      }
    }
    for (const k of STEUERKREUZ) {
      if (trifft(k.feld, x, y)) {
        l.stellePasser(k.dx, k.dy);
        spiele('zuteilen');
        return;
      }
    }
  }

  update(_zeit: number, delta: number): void {
    const l = this.leitstand;
    this.uhrzeit += delta / 1000;
    if (!l.fertig) {
      l.schritt((Math.min(delta, 100) / 1000) * TEMPO);
      if (l.fertig) spiele('schichtende');
    } else {
      this.endePause += delta / 1000;
      if (this.endePause > 0.8) {
        this.scene.start('LeitstandAuswertung', { auswertung: l.auswertung() });
        return;
      }
    }
    const gut = l.allesGut;
    if (this.warGut && !gut && !l.fertig) spiele('abgelehnt');
    this.warGut = gut;
    this.zeichne();
  }

  private zeichne(): void {
    const l = this.leitstand;
    const m = this.maler;
    const e = l.einstellungen;
    m.leeren();
    const blinkt = Math.floor(this.uhrzeit / 0.25) % 2 === 0;

    // Kopfleiste
    const rest = Math.max(0, e.dauer - l.zeit);
    setze(this.tUhr, `Fortdruck ${minSek(rest)}`);
    m.balken(72, 5, 40, 6, rest / e.dauer, FARBEN.akzent);
    setze(this.tStatus, l.allesGut ? 'Gutbogen' : 'Makulatur!', l.allesGut ? '#7fe08f' : '#ff8f84');
    setze(this.tZaehler, `Gutbogen ${tausender(l.gutbogen)}   Makulatur ${tausender(l.makulatur)}`);

    // Vier Farben: Papierstreifen mit Toleranzband, die Farbe steigt und fällt
    const halb = ANZEIGE_HOEHE / 2;
    const mitte = ANZEIGE_OBEN + halb;
    FARBNAMEN.forEach((_, i) => {
      const cx = spaltenMitte(i);
      const f = l.farben[i];
      const gut = l.inToleranz(i);
      m.r(cx - 10, ANZEIGE_OBEN - 2, 20, ANZEIGE_HOEHE + 4, gut ? MF.anthrazitDunkel : blinkt ? MF.schlecht : MF.anthrazitDunkel);
      m.r(cx - 8, ANZEIGE_OBEN, 16, ANZEIGE_HOEHE, MF.papier);
      const band = Math.round(e.toleranz * (halb - 2));
      m.r(cx - 8, mitte - band, 16, band * 2, '#cdebd2');
      const hoehe = Math.round(halb + f.wert * (halb - 2));
      m.r(cx - 5, ANZEIGE_OBEN + ANZEIGE_HOEHE - hoehe, 10, hoehe, KANALFARBEN[i]);
      // Sollwert und Grenzen der Toleranz
      m.r(cx - 10, mitte, 20, 1, MF.anthrazitDunkel);
      m.r(cx - 8, mitte - band, 16, 1, MF.gut);
      m.r(cx - 8, mitte + band - 1, 16, 1, MF.gut);
      // Hinweis, welche Taste hilft
      if (!gut && blinkt) {
        const taste = f.wert < 0 ? tasteMehr(i) : tasteWeniger(i);
        m.rahmen(taste.x, taste.y, taste.b, taste.h, MF.warnung, 2);
      }
    });

    // Passerkreuz unter dem Fadenzähler
    const stimmt = l.passerStimmt;
    m.g.fillStyle(parseInt((stimmt ? MF.silberDunkel : blinkt ? MF.schlecht : MF.silberDunkel).slice(1), 16), 1);
    m.g.fillCircle(LUPE.x, LUPE.y, LUPE.r + 2);
    m.g.fillStyle(parseInt(MF.papier.slice(1), 16), 1);
    m.g.fillCircle(LUPE.x, LUPE.y, LUPE.r);
    const px = LUPE.x + l.passer.x * PASSER_PIXEL;
    const py = LUPE.y + l.passer.y * PASSER_PIXEL;
    // Magenta zuerst, Schwarz darüber: Stimmt der Passer, deckt Schwarz das Magenta.
    m.r(px - ARM, py - 1, ARM * 2, 2, MF.m);
    m.r(px - 1, py - ARM, 2, ARM * 2, MF.m);
    m.r(LUPE.x - ARM, LUPE.y - 1, ARM * 2, 2, MF.k);
    m.r(LUPE.x - 1, LUPE.y - ARM, 2, ARM * 2, MF.k);
    // Mitte des Steuerkreuzes zeigt, ob der Passer stimmt
    m.r(246, 121, 24, 24, MF.anthrazitDunkel);
    m.r(252, 127, 12, 12, stimmt ? MF.gut : MF.schlecht);
  }
}

// ---------------------------------------------------------------- Auswertung

export class LeitstandAuswertungSzene extends Phaser.Scene {
  private auswertung!: LeitstandAuswertung;
  private bestText = '';
  private kAuswahl: Rechteck = { x: 176, y: 146, b: 70, h: 30 };
  private kNochmals: Rechteck = { x: 248, y: 146, b: 70, h: 30 };

  constructor() {
    super('LeitstandAuswertung');
  }

  init(daten: { auswertung: LeitstandAuswertung }): void {
    this.auswertung = daten.auswertung;
    const w = daten.auswertung;
    if (TEMPO > 1) {
      this.bestText = 'Prüflauf: zählt nicht für die Bestleistung';
      return;
    }
    const meldung = meldeErgebnis('leitstand', w.gutbogen, 0, w.makulatur);
    this.bestText = meldung.neu ? 'Neue Bestleistung!' : `Bestleistung: ${tausender(meldung.best.punkte)} Gutbogen`;
    if (meldung.neu) spiele('bestleistung');
  }

  create(): void {
    const w = this.auswertung;
    const grund = new Maler(this.add.graphics());
    grund.r(0, 0, BREITE, HOEHE, FARBEN.wand);
    grund.r(0, 0, BREITE, 16, FARBEN.leiste);
    grund.r(0, 142, BREITE, 38, FARBEN.leiste);
    grund.r(4, 30, BREITE - 8, 108, FARBEN.papier);
    schrift(this, 4, 2, 'Auswertung des Fortdrucks', FARBEN.text);
    schrift(this, BREITE - 4, 2, `Gutbogen ${tausender(w.gutbogen)}`, FARBEN.text, 'rechts');
    schrift(this, 4, 18, `Makulatur: ${tausender(w.makulatur)} Bogen`, FARBEN.textAufBoden);
    schrift(this, BREITE - 4, 18, this.bestText, FARBEN.textAufBoden, 'rechts');
    schrift(this, 10, 34, `Anteil Gutbogen: ${Math.round(w.anteil)} Prozent`, FARBEN.textAufPapier, 'links', 10);
    schrift(this, 10, 52, 'So lange lag etwas ausserhalb der Toleranz:', FARBEN.textAufPapier);
    const farben = [MF.c, MF.m, MF.y, MF.k];
    const maler = new Maler(this.add.graphics().setDepth(2));
    w.farbeAusserhalb.forEach((f, i) => {
      const y = 65 + i * 12;
      maler.r(10, y + 2, 8, 8, farben[i]);
      schrift(this, 22, y, `${f.name}: ${anzeigeSekunden(f.sekunden)} s`, FARBEN.textAufPapier);
    });
    schrift(this, 22, 113, `Passer Magenta: ${anzeigeSekunden(w.passerDaneben)} s`, FARBEN.textAufPapier);
    const schlimmste = [...w.farbeAusserhalb].sort((a, b) => b.sekunden - a.sekunden)[0];
    const tipp =
      w.makulatur === 0
        ? 'Sauberer Fortdruck, keine Makulatur!'
        : w.passerDaneben > (schlimmste?.sekunden ?? 0)
          ? 'Am meisten Makulatur kam vom Passer.'
          : `Am meisten Makulatur kam von ${schlimmste?.name ?? 'den Farben'}.`;
    schrift(this, 150, 65, tipp, FARBEN.textAufPapier);

    bild(this, this.kAuswahl.x, this.kAuswahl.y, 'schaltflaeche_blaettern');
    bild(this, this.kNochmals.x, this.kNochmals.y, 'schaltflaeche_nochmals_klein');
    schrift(this, this.kAuswahl.x + 35, 155, 'Auswahl', FARBEN.knopfText, 'mitte');
    schrift(this, this.kNochmals.x + 35, 155, 'Nochmals', FARBEN.knopfText, 'mitte');
    richteAus(this);
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (trifft(this.kNochmals, p.worldX, p.worldY)) this.scene.start('Leitstand');
      else if (trifft(this.kAuswahl, p.worldX, p.worldY)) this.scene.start('Start');
    });
  }
}
