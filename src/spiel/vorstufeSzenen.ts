import Phaser from 'phaser';
import { anzeigeSekunden, tausender } from '../logik/dauer';
import { VORSTUFE } from '../logik/daten';
import { Vorstufe, type VorstufeAuswertung } from '../logik/vorstufe';
import { MF } from '../grafik/zeichnen.ts';
import { BREITE, FARBEN, HOEHE, Maler, bild, minSek, richteAus, schrift, setze, setzeBild, trifft, type Rechteck } from './hilfen';
import { meldeErgebnis } from './speicher';
import { spiele } from './ton';

// Bereich Polygraf (Medienvorstufe): links die Lauftasche mit der Vorlage,
// rechts der Rechner, an dem die Seite nachgebaut wird.

type Text = Phaser.GameObjects.Text;
type Bildobjekt = Phaser.GameObjects.Image;

// Prüfhilfe wie in den anderen Bereichen: ?tempo=10 lässt die Schicht schneller laufen.
const TEMPO = Math.max(1, Number(new URLSearchParams(window.location.search).get('tempo')) || 1);

const NAMEN: Record<string, string> = { titel: 'Titel', text: 'Text', foto: 'Foto', grafik: 'Grafik' };
const ZELLE_B = 36;
const ZELLE_H = 30;
const SPALT = 2;
const SPALTEN = VORSTUFE.spalten;
const ZEILEN = VORSTUFE.zeilen;
const SEITE_B = SPALTEN * ZELLE_B + (SPALTEN + 1) * SPALT;
const SEITE_H = ZEILEN * ZELLE_H + (ZEILEN + 1) * SPALT;
/** Linke obere Ecke der Seite auf der Lauftasche und am Rechner */
const VORLAGE = { x: 18, y: 36 };
const ARBEIT = { x: 126, y: 25 };

function zelle(seite: { x: number; y: number }, feld: number): Rechteck {
  const spalte = feld % SPALTEN;
  const zeile = Math.floor(feld / SPALTEN);
  return { x: seite.x + SPALT + spalte * (ZELLE_B + SPALT), y: seite.y + SPALT + zeile * (ZELLE_H + SPALT), b: ZELLE_B, h: ZELLE_H };
}

/** Feld in der Auswahl der Elemente rechts neben der Seite */
function auswahlFeld(i: number): Rechteck {
  return { x: 212 + (i % 2) * 50, y: 25 + Math.floor(i / 2) * 48, b: 46, h: 44 };
}

interface Meldung {
  text: Text;
  alter: number;
  startY: number;
}

export class VorstufeSzene extends Phaser.Scene {
  private spiel!: Vorstufe;
  private maler!: Maler;
  private tUhr!: Text;
  private tMitte!: Text;
  private tPunkte!: Text;
  private tAuftrag!: Text;
  private tRest!: Text;
  private vorlageBilder: Bildobjekt[] = [];
  private arbeitBilder: Bildobjekt[] = [];
  private auswahlBilder: Bildobjekt[] = [];
  /** Gewähltes Element, das als Nächstes gesetzt wird */
  private auswahl: string | null = null;
  /** Felder, die nach einem Fehlversuch rot aufleuchten */
  private falsch: number[] = [];
  private falschZeit = 0;
  private meldungen: Meldung[] = [];
  private endePause = 0;

  constructor() {
    super('Vorstufe');
  }

  create(): void {
    this.spiel = new Vorstufe(VORSTUFE, Math.random);
    this.auswahl = null;
    this.falsch = [];
    this.falschZeit = 0;
    this.meldungen = [];
    this.endePause = 0;

    const grund = new Maler(this.add.graphics());
    grund.r(0, 0, BREITE, HOEHE, '#b9a98c');
    grund.r(0, 0, BREITE, 16, FARBEN.leiste);
    // Lauftasche mit der Vorlage
    grund.r(8, 16, 34, 6, FARBEN.umriss);
    grund.r(9, 17, 32, 5, FARBEN.papierSchatten);
    grund.r(4, 20, 110, 157, FARBEN.umriss);
    grund.r(5, 21, 108, 155, FARBEN.papier);
    grund.r(VORLAGE.x, VORLAGE.y, SEITE_B, SEITE_H, MF.silberDunkel);
    grund.r(VORLAGE.x + 1, VORLAGE.y + 1, SEITE_B - 2, SEITE_H - 2, MF.weiss);
    // Rechner: Bildschirm auf Ständer, davor der Tisch
    grund.r(118, 164, 202, 16, MF.silberHell);
    grund.r(118, 164, 202, 2, MF.silberDunkel);
    grund.r(205, 157, 24, 8, MF.anthrazitDunkel);
    grund.r(190, 164, 54, 3, MF.anthrazit);
    grund.r(118, 19, 198, 139, MF.anthrazitDunkel);
    grund.r(120, 21, 194, 135, '#eef0f2');
    grund.r(ARBEIT.x, ARBEIT.y, SEITE_B, SEITE_H, MF.silberDunkel);
    grund.r(ARBEIT.x + 1, ARBEIT.y + 1, SEITE_B - 2, SEITE_H - 2, MF.weiss);
    bild(this, 4, 3, 'uhr_hell');
    bild(this, 10, 140, 'uhr_dunkel', 3);
    this.maler = new Maler(this.add.graphics().setDepth(2));

    this.tUhr = schrift(this, 16, 2, '', FARBEN.text);
    this.tMitte = schrift(this, 192, 2, '', FARBEN.text, 'mitte');
    this.tPunkte = schrift(this, BREITE - 4, 2, '', FARBEN.text, 'rechts');
    this.tAuftrag = schrift(this, 10, 22, '', FARBEN.textAufPapier, 'links', 10);
    this.tRest = schrift(this, 23, 138, '', FARBEN.textAufPapier);
    schrift(this, ARBEIT.x, 127, 'Element antippen, dann das Feld antippen.', FARBEN.textAufPapier, 'links', 8);
    schrift(this, ARBEIT.x, 138, 'Ein gesetztes Element antippen nimmt es wieder auf.', FARBEN.textAufPapier, 'links', 8);

    this.vorlageBilder = [];
    this.arbeitBilder = [];
    for (let feld = 0; feld < this.spiel.felder; feld++) {
      const v = zelle(VORLAGE, feld);
      const a = zelle(ARBEIT, feld);
      this.vorlageBilder.push(bild(this, v.x, v.y, 'seite_titel', 3).setVisible(false));
      this.arbeitBilder.push(bild(this, a.x, a.y, 'seite_titel', 3).setVisible(false));
    }
    this.auswahlBilder = VORSTUFE.elemente.map((element, i) => {
      const f = auswahlFeld(i);
      schrift(this, f.x + f.b / 2, f.y + 33, NAMEN[element] ?? element, FARBEN.textAufPapier, 'mitte', 8);
      return bild(this, f.x + 5, f.y + 3, `seite_${element}`, 3);
    });
    richteAus(this);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.tippe(p.worldX, p.worldY));
  }

  private tippe(x: number, y: number): void {
    const s = this.spiel;
    if (s.fertig) return;
    // Auswahl der Elemente
    for (let i = 0; i < VORSTUFE.elemente.length; i++) {
      if (trifft(auswahlFeld(i), x, y)) {
        const element = VORSTUFE.elemente[i];
        this.auswahl = this.auswahl === element ? null : element;
        spiele('zuteilen');
        return;
      }
    }
    // Felder der Seite am Rechner
    for (let feld = 0; feld < s.felder; feld++) {
      if (!trifft(zelle(ARBEIT, feld), x, y)) continue;
      if (this.auswahl === null) {
        // Gesetztes Element wieder aufnehmen
        const liegt = s.arbeit[feld];
        if (liegt) {
          s.entferne(feld);
          this.auswahl = liegt;
          spiele('zuteilen');
        }
        return;
      }
      const antwort = s.setze(this.auswahl, feld);
      this.auswahl = null;
      if (antwort.art === 'fertig') {
        spiele(antwort.puenktlich ? 'puenktlich' : 'verspaetet');
        this.melde(antwort.puenktlich);
      } else if (antwort.art === 'falsch') {
        this.falsch = antwort.felder;
        this.falschZeit = 0.6;
        spiele('abgelehnt');
      } else {
        spiele('zuteilen');
      }
      return;
    }
  }

  private melde(puenktlich: boolean): void {
    const e = VORSTUFE;
    const inhalt = puenktlich ? `plus ${e.punktePuenktlich}` : `minus ${Math.abs(e.punkteVerspaetet)}`;
    const text = schrift(this, ARBEIT.x + SEITE_B / 2, 60, inhalt, puenktlich ? '#1f7a30' : FARBEN.schlecht, 'mitte', 14).setDepth(7);
    this.meldungen.push({ text, alter: 0, startY: 60 });
  }

  update(_zeit: number, delta: number): void {
    const s = this.spiel;
    const echt = delta / 1000;
    if (!s.fertig) {
      s.schritt((Math.min(delta, 100) / 1000) * TEMPO);
      if (s.fertig) spiele('schichtende');
    } else {
      this.endePause += echt;
      if (this.endePause > 0.8) {
        this.scene.start('VorstufeAuswertung', { auswertung: s.auswertung() });
        return;
      }
    }
    this.falschZeit = Math.max(0, this.falschZeit - echt);
    for (const m of this.meldungen) {
      m.alter += echt;
      m.text.setY(Math.round(m.startY - m.alter * 8));
      m.text.setAlpha(Math.max(0, Math.min(1, 2.4 - m.alter * 1.6)));
    }
    for (const m of this.meldungen.filter((x) => x.alter > 1.5)) m.text.destroy();
    this.meldungen = this.meldungen.filter((x) => x.alter <= 1.5);
    this.zeichne();
  }

  private zeichne(): void {
    const s = this.spiel;
    const e = VORSTUFE;
    const m = this.maler;
    m.leeren();

    // Kopfleiste
    const schichtRest = Math.max(0, e.dauer - s.zeit);
    setze(this.tUhr, `Schicht ${minSek(schichtRest)}`);
    m.balken(66, 5, 60, 6, schichtRest / e.dauer, FARBEN.akzent);
    setze(this.tMitte, `pünktlich ${s.puenktlich}    verspätet ${s.verspaetet}`);
    setze(this.tPunkte, `Punkte ${tausender(s.punkte).replace('-', 'minus ')}`);

    // Lauftasche: Vorlage und Zeitlimit
    setze(this.tAuftrag, `Lauftasche ${s.vorlage.nummer}`);
    const rest = s.restzeit;
    const zuSpaet = rest <= 0;
    setze(this.tRest, zuSpaet ? `zu spät seit ${anzeigeSekunden(-rest)} s` : `noch ${anzeigeSekunden(rest)} s`, zuSpaet ? FARBEN.schlecht : FARBEN.textAufPapier);
    const anteil = rest / e.zeitlimit;
    m.balken(10, 153, 98, 6, zuSpaet ? 1 : anteil, zuSpaet ? FARBEN.schlecht : anteil > 0.5 ? FARBEN.gut : anteil > 0.25 ? FARBEN.warnung : FARBEN.schlecht);

    const blinkt = this.falschZeit > 0 && Math.floor(this.falschZeit * 10) % 2 === 0;
    for (let feld = 0; feld < s.felder; feld++) {
      const v = s.vorlage.seite[feld];
      this.vorlageBilder[feld].setVisible(v !== null);
      if (v) setzeBild(this.vorlageBilder[feld], `seite_${v}`);
      const a = s.arbeit[feld];
      const z = zelle(ARBEIT, feld);
      this.arbeitBilder[feld].setVisible(a !== null);
      if (a) setzeBild(this.arbeitBilder[feld], `seite_${a}`);
      else {
        // Leeres Feld am Rechner: als Ziel erkennbar, sobald ein Element gewählt ist
        m.r(z.x, z.y, z.b, z.h, this.auswahl ? '#d6ecf7' : '#eef0f2');
        if (this.auswahl) m.rahmen(z.x, z.y, z.b, z.h, FARBEN.akzent);
      }
      if (blinkt && this.falsch.includes(feld)) m.r(z.x, z.y, z.b, z.h, FARBEN.schlecht, 0.6);
    }

    // Auswahl der Elemente
    e.elemente.forEach((element, i) => {
      const f = auswahlFeld(i);
      const gewaehlt = this.auswahl === element;
      const gesetzt = s.platzVon(element) >= 0;
      m.rahmen(f.x, f.y, f.b, f.h, gewaehlt ? FARBEN.akzent : MF.silberDunkel, gewaehlt ? 2 : 1);
      this.auswahlBilder[i].setAlpha(gesetzt && !gewaehlt ? 0.35 : 1);
    });
  }
}

// ---------------------------------------------------------------- Auswertung

export class VorstufeAuswertungSzene extends Phaser.Scene {
  private auswertung!: VorstufeAuswertung;
  private bestText = '';
  private kAuswahl: Rechteck = { x: 176, y: 146, b: 70, h: 30 };
  private kNochmals: Rechteck = { x: 248, y: 146, b: 70, h: 30 };

  constructor() {
    super('VorstufeAuswertung');
  }

  init(daten: { auswertung: VorstufeAuswertung }): void {
    this.auswertung = daten.auswertung;
    const w = daten.auswertung;
    if (TEMPO > 1) {
      this.bestText = 'Prüflauf: zählt nicht für die Bestleistung';
      return;
    }
    const meldung = meldeErgebnis('vorstufe', w.punkte, w.puenktlich, w.verspaetet);
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
    const seiten = w.fertigeSeiten;
    schrift(this, 10, 36, `Fertige Seiten: ${seiten}`, FARBEN.textAufPapier, 'links', 10);
    schrift(this, 10, 54, `Davon im Zeitlimit von ${VORSTUFE.zeitlimit} Sekunden: ${w.puenktlich}`, FARBEN.textAufPapier);
    schrift(this, 10, 66, `Fehlversuche (Seite stimmte nicht mit der Lauftasche überein): ${w.fehlversuche}`, FARBEN.textAufPapier);
    schrift(this, 10, 78, w.schnitt > 0 ? `Zeit pro Seite im Schnitt: ${anzeigeSekunden(w.schnitt)} Sekunden` : 'Noch keine Seite fertig gebaut.', FARBEN.textAufPapier);
    if (w.offenVerspaetet) schrift(this, 10, 90, 'Die letzte Lauftasche war am Schichtende über dem Zeitlimit: zählt als verspätet.', FARBEN.textAufPapier);
    const tipp =
      seiten === 0
        ? 'Tipp: Zuerst die Lauftasche ansehen, dann Element für Element setzen.'
        : w.fehlversuche > seiten / 2
          ? 'Tipp: Vor dem letzten Element die Seite mit der Lauftasche vergleichen.'
          : w.verspaetet > w.puenktlich
            ? 'Tipp: Mit dem Element beginnen, das du sofort wiedererkennst.'
            : 'Sauber gearbeitet: Die Seiten stimmen und sind rechtzeitig fertig.';
    schrift(this, 10, 108, tipp, FARBEN.textAufPapier);

    bild(this, this.kAuswahl.x, this.kAuswahl.y, 'schaltflaeche_blaettern');
    bild(this, this.kNochmals.x, this.kNochmals.y, 'schaltflaeche_nochmals_klein');
    schrift(this, this.kAuswahl.x + 35, 155, 'Auswahl', FARBEN.knopfText, 'mitte');
    schrift(this, this.kNochmals.x + 35, 155, 'Nochmals', FARBEN.knopfText, 'mitte');
    richteAus(this);
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (trifft(this.kNochmals, p.worldX, p.worldY)) this.scene.start('Vorstufe');
      else if (trifft(this.kAuswahl, p.worldX, p.worldY)) this.scene.start('Berufswahl', { bereich: 'vorstufe' });
    });
  }
}
