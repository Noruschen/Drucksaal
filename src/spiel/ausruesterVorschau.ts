import Phaser from 'phaser';
import { anzeigeSekunden, tausender } from '../logik/dauer';
import { HEFTEN, ZUSAMMENTRAGEN } from '../logik/daten';
import { HEFTKOPF, Heften, type Heftung } from '../logik/heften';
import { Zusammentragen } from '../logik/zusammentragen';
import { MF, WF } from '../grafik/zeichnen.ts';
import { BREITE, FARBEN, HOEHE, Maler, bild, minSek, richteAus, schrift, setze, trifft, type Rechteck } from './hilfen';
import { spiele } from './ton';

// Vorschau: zwei ganz andere Spiele für den Ausrüster. Aufruf mit ?ausruester=a oder ?ausruester=b.
// Sie ersetzen das veröffentlichte Ausrüster-Spiel nicht und zählen nicht für die Bestleistung.

type Text = Phaser.GameObjects.Text;

const TEMPO = Math.max(1, Number(new URLSearchParams(window.location.search).get('tempo')) || 1);
const GRUEN = '#2f9e44';
const ROT = '#d94a3d';

function punkteText(punkte: number): string {
  return `Punkte ${tausender(punkte).replace('-', 'minus ')}`;
}

interface AuswertungDaten {
  titel: string;
  punkte: number;
  kopf: string;
  zeilen: string[];
  tipp: string;
  nochmals: string;
}

// ---------------------------------------------------------------- Version A: Heften im Takt

/** Sammelkette: von hier bis dort laufen die Broschüren */
const KETTE = { x: 10, b: 300, y: 92 };
const K_HEFTEN: Rechteck = { x: 60, y: 132, b: 200, h: 42 };

export class HeftenTaktSzene extends Phaser.Scene {
  private spiel!: Heften;
  private maler!: Maler;
  private tUhr!: Text;
  private tMitte!: Text;
  private tPunkte!: Text;
  private tMeldung!: Text;
  private meldungZeit = 0;
  /** Restzeit, in der der Heftkopf unten ist */
  private kopfUnten = 0;
  private endePause = 0;

  constructor() {
    super('HeftenTakt');
  }

  create(): void {
    this.spiel = new Heften(HEFTEN, Math.random);
    // Prüfhilfe: Im Prüflauf (?tempo grösser als 1) ist der Spielstand von aussen lesbar.
    if (TEMPO > 1) (window as unknown as { druckereiPruefung?: Heften }).druckereiPruefung = this.spiel;
    this.meldungZeit = 0;
    this.kopfUnten = 0;
    this.endePause = 0;

    const grund = new Maler(this.add.graphics());
    grund.r(0, 0, BREITE, HOEHE, FARBEN.wand);
    grund.r(0, 104, BREITE, 76, FARBEN.boden);
    grund.r(0, 0, BREITE, 16, FARBEN.leiste);
    // Sammelhefter: Gestell, Kette, Heftstation
    grund.r(4, 96, 312, 22, WF.blau);
    grund.r(4, 96, 312, 2, WF.blauHell);
    grund.r(4, 114, 312, 4, WF.blauDunkel);
    grund.r(KETTE.x - 4, KETTE.y, KETTE.b + 8, 4, MF.anthrazitDunkel);
    const kopfX = KETTE.x + HEFTKOPF * KETTE.b;
    grund.r(kopfX - 14, 26, 28, 40, MF.anthrazit);
    grund.r(kopfX - 14, 26, 28, 2, MF.anthrazitHell);
    grund.r(kopfX - 9, 32, 18, 8, MF.glas);
    // Marken: Zwischen ihnen wird genau geheftet
    const halb = Math.round(HEFTEN.toleranz * KETTE.b);
    grund.r(kopfX - halb - 1, 98, 2, 8, FARBEN.warnung);
    grund.r(kopfX + halb - 1, 98, 2, 8, FARBEN.warnung);
    bild(this, 4, 3, 'uhr_hell');
    this.maler = new Maler(this.add.graphics().setDepth(2));

    this.tUhr = schrift(this, 16, 2, '', FARBEN.text);
    this.tMitte = schrift(this, 192, 2, '', FARBEN.text, 'mitte');
    this.tPunkte = schrift(this, BREITE - 4, 2, '', FARBEN.text, 'rechts');
    schrift(this, 12, 106, 'Martini Hefter', '#ffffff', 'links', 8);
    schrift(this, kopfX + 18, 30, 'Heftkopf', FARBEN.textAufBoden, 'links', 8);
    schrift(this, 160, 121, 'Rot markiert: Ein Bogen fehlt. Nicht heften.', FARBEN.textAufBoden, 'mitte', 8);
    schrift(this, 160, 144, 'Heften', FARBEN.knopfText, 'mitte', 14).setDepth(6);
    this.tMeldung = schrift(this, 244, 40, '', GRUEN, 'mitte', 12).setVisible(false);
    richteAus(this);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.spiel.fertig && trifft(K_HEFTEN, p.worldX, p.worldY)) this.hefte();
    });
  }

  private melde(text: string, farbe: string): void {
    setze(this.tMeldung, text, farbe);
    this.meldungZeit = 1;
  }

  private hefte(): void {
    const antwort: Heftung = this.spiel.hefte();
    this.kopfUnten = 0.12;
    const abzug = `minus ${Math.abs(HEFTEN.punkteFehler)}`;
    if (antwort === 'genau') {
      spiele('puenktlich');
      this.melde(`plus ${HEFTEN.punkteGeheftet}`, GRUEN);
    } else if (antwort === 'schief') {
      spiele('verspaetet');
      this.melde(`schief geheftet: ${abzug}`, ROT);
    } else if (antwort === 'fehlbogen') {
      spiele('verspaetet');
      this.melde(`Bogen fehlt: ${abzug}`, ROT);
    } else {
      spiele('zuteilen');
    }
  }

  update(_zeit: number, delta: number): void {
    const s = this.spiel;
    const echt = delta / 1000;
    if (!s.fertig) {
      const vorher = s.verpasst;
      s.schritt((Math.min(delta, 100) / 1000) * TEMPO);
      if (s.verpasst > vorher) {
        spiele('abgelehnt');
        this.melde(`ungeheftet: minus ${Math.abs(HEFTEN.punkteFehler)}`, ROT);
      }
      if (s.fertig) spiele('schichtende');
    } else {
      this.endePause += echt;
      if (this.endePause > 0.8) {
        const w = s.auswertung();
        const fehler = w.schief + w.verpasst + w.fehlbogenGeheftet;
        const daten: AuswertungDaten = {
          titel: 'Heften im Takt',
          punkte: w.punkte,
          kopf: `geheftet: ${w.geheftet}      Fehler: ${fehler}`,
          zeilen: [
            `Genau geheftete Broschüren: ${w.geheftet}`,
            `Schief geheftet: ${w.schief}`,
            `Ungeheftet durchgelaufen: ${w.verpasst}`,
            `Unvollständige Broschüren erkannt: ${w.fehlbogenErkannt}, trotzdem geheftet: ${w.fehlbogenGeheftet}`,
          ],
          tipp:
            w.schief > w.geheftet
              ? 'Tipp: Erst heften, wenn die Broschüre zwischen den gelben Marken liegt.'
              : w.geheftet === 0
                ? 'Tipp: «Heften» antippen, wenn die Broschüre unter dem Heftkopf liegt.'
                : w.verpasst > 2
                  ? 'Tipp: Gegen Ende läuft die Kette schneller. Früh bereit sein.'
                : w.fehlbogenGeheftet > 0
                  ? 'Tipp: Rot markierte Broschüren ungeheftet durchlaufen lassen.'
                  : 'Sauber gearbeitet: im Takt geheftet.',
          nochmals: 'HeftenTakt',
        };
        this.scene.start('VorschauAuswertung', daten);
        return;
      }
    }
    this.meldungZeit = Math.max(0, this.meldungZeit - echt);
    this.kopfUnten = Math.max(0, this.kopfUnten - echt);
    this.zeichne();
  }

  private zeichne(): void {
    const s = this.spiel;
    const e = HEFTEN;
    const m = this.maler;
    m.leeren();
    const rest = Math.max(0, e.dauer - s.zeit);
    setze(this.tUhr, `Schicht ${minSek(rest)}`);
    m.balken(66, 5, 60, 6, rest / e.dauer, FARBEN.akzent);
    const fehler = s.schief + s.verpasst + s.fehlbogenGeheftet;
    setze(this.tMitte, `geheftet ${s.geheftet}    Fehler ${fehler}`);
    setze(this.tPunkte, punkteText(s.punkte));

    // Broschüren auf der Kette
    for (const b of s.kette) {
      const x = Math.round(KETTE.x + b.lage * KETTE.b);
      const hoch = b.fehlbogen ? 7 : 12;
      m.r(x - 11, KETTE.y - hoch - 1, 22, hoch + 1, FARBEN.umriss);
      m.r(x - 10, KETTE.y - hoch, 20, hoch, b.zustand === 'schief' ? '#f1c5c0' : MF.papier);
      m.r(x - 10, KETTE.y - 3, 20, 1, MF.papierSchatten);
      if (!b.fehlbogen) m.r(x - 10, KETTE.y - 7, 20, 1, MF.papierSchatten);
      m.r(x - 10, KETTE.y - hoch, 20, 2, b.fehlbogen ? ROT : FARBEN.akzent);
      if (b.fehlbogen) {
        // Rote Marke über der unvollständigen Broschüre
        m.r(x - 1, KETTE.y - 22, 3, 7, ROT);
        m.r(x - 1, KETTE.y - 13, 3, 2, ROT);
      }
      if (b.zustand !== 'offen') {
        // Heftklammern
        const farbe = b.zustand === 'geheftet' ? GRUEN : ROT;
        m.r(x - 6, KETTE.y - hoch + 3, 3, 2, farbe);
        m.r(x + 3, KETTE.y - hoch + 3 + (b.zustand === 'schief' ? 3 : 0), 3, 2, farbe);
      }
    }

    // Heftkopf: fährt beim Heften kurz nach unten
    const kopfX = Math.round(KETTE.x + HEFTKOPF * KETTE.b);
    const unten = this.kopfUnten > 0 ? 12 : 0;
    m.r(kopfX - 4, 66, 8, 4 + unten, MF.silberDunkel);
    m.r(kopfX - 7, 70 + unten, 14, 4, MF.anthrazitDunkel);

    // Schaltfläche «Heften»
    m.r(K_HEFTEN.x, K_HEFTEN.y, K_HEFTEN.b, K_HEFTEN.h, FARBEN.umriss);
    m.r(K_HEFTEN.x + 1, K_HEFTEN.y + 1, K_HEFTEN.b - 2, K_HEFTEN.h - 2, this.kopfUnten > 0 ? '#2678a3' : FARBEN.akzent);
    m.r(K_HEFTEN.x + 1, K_HEFTEN.y + K_HEFTEN.h - 5, K_HEFTEN.b - 2, 4, '#2678a3');

    this.tMeldung.setVisible(this.meldungZeit > 0);
  }
}

// ---------------------------------------------------------------- Version B: Zusammentragen

const TEILFARBEN = ['#d20a11', '#3fa7d6', '#f2a530', '#49b35a', '#8e6bbf', '#8a6239'];
const HOECHSTENS = TEILFARBEN.length;

function teilName(teil: number): string {
  return teil === 0 ? 'Umschlag' : `Bogen ${teil}`;
}

function anlegerFeld(i: number, anzahl: number): Rechteck {
  const b = 40;
  const start = 108 + Math.round((208 - anzahl * (b + 2)) / 2);
  return { x: start + i * (b + 2), y: 22, b, h: 60 };
}

export class ZusammentragenSzene extends Phaser.Scene {
  private spiel!: Zusammentragen;
  private maler!: Maler;
  private tUhr!: Text;
  private tMitte!: Text;
  private tPunkte!: Text;
  private tAuftrag!: Text;
  private tRest!: Text;
  private tMeldung!: Text;
  private tReihe: Text[] = [];
  private tAnleger: Text[] = [];
  private meldungZeit = 0;
  private endePause = 0;

  constructor() {
    super('Zusammentragen');
  }

  create(): void {
    this.spiel = new Zusammentragen(ZUSAMMENTRAGEN, Math.random);
    if (TEMPO > 1) (window as unknown as { druckereiPruefung?: Zusammentragen }).druckereiPruefung = this.spiel;
    this.meldungZeit = 0;
    this.endePause = 0;

    const grund = new Maler(this.add.graphics());
    grund.r(0, 0, BREITE, HOEHE, FARBEN.wand);
    grund.r(0, 112, BREITE, 68, FARBEN.boden);
    grund.r(0, 0, BREITE, 16, FARBEN.leiste);
    // Lauftasche
    grund.r(4, 20, 98, 157, FARBEN.umriss);
    grund.r(5, 21, 96, 155, FARBEN.papier);
    // Sammelhefter mit Sammelkette
    grund.r(106, 90, 212, 20, WF.blau);
    grund.r(106, 90, 212, 2, WF.blauHell);
    grund.r(106, 106, 212, 4, WF.blauDunkel);
    grund.r(110, 86, 204, 4, MF.anthrazitDunkel);
    bild(this, 4, 3, 'uhr_hell');
    this.maler = new Maler(this.add.graphics().setDepth(2));

    this.tUhr = schrift(this, 16, 2, '', FARBEN.text);
    this.tMitte = schrift(this, 192, 2, '', FARBEN.text, 'mitte');
    this.tPunkte = schrift(this, BREITE - 4, 2, '', FARBEN.text, 'rechts');
    this.tAuftrag = schrift(this, 10, 23, '', FARBEN.textAufPapier, 'links', 10);
    schrift(this, 10, 37, 'In dieser Reihenfolge:', FARBEN.textAufPapier, 'links', 8);
    this.tRest = schrift(this, 10, 152, '', FARBEN.textAufPapier);
    schrift(this, 112, 98, 'Sammelkette', '#ffffff', 'links', 8);
    schrift(this, 212, 150, 'Anleger in der Reihenfolge der Lauftasche antippen:', FARBEN.textAufBoden, 'mitte', 8);
    schrift(this, 212, 161, 'innerster Bogen zuerst, Umschlag zuletzt.', FARBEN.textAufBoden, 'mitte', 8);
    this.tMeldung = schrift(this, 212, 124, '', GRUEN, 'mitte', 14).setVisible(false);
    this.tReihe = [];
    this.tAnleger = [];
    for (let i = 0; i < HOECHSTENS; i++) {
      this.tReihe.push(schrift(this, 34, 50 + i * 16, '', FARBEN.textAufPapier));
      this.tAnleger.push(schrift(this, 0, 66, '', FARBEN.textAufPapier, 'mitte', 8));
    }
    richteAus(this);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.tippe(p.worldX, p.worldY));
  }

  private melde(text: string, farbe: string): void {
    setze(this.tMeldung, text, farbe);
    this.meldungZeit = 1;
  }

  private tippe(x: number, y: number): void {
    const s = this.spiel;
    if (s.fertig) return;
    const anzahl = s.auftrag.anleger.length;
    for (let i = 0; i < anzahl; i++) {
      if (!trifft(anlegerFeld(i, anzahl), x, y)) continue;
      const antwort = s.greife(i);
      if (antwort === 'gelegt') spiele('zuteilen');
      else if (antwort === 'fertig') {
        spiele('puenktlich');
        this.melde(`geheftet: plus ${ZUSAMMENTRAGEN.punkteRichtig}`, GRUEN);
      } else if (antwort === 'falsch') {
        spiele('verspaetet');
        this.melde(`falscher Bogen: minus ${Math.abs(ZUSAMMENTRAGEN.punkteFehler)}`, ROT);
      }
      return;
    }
  }

  update(_zeit: number, delta: number): void {
    const s = this.spiel;
    const echt = delta / 1000;
    if (!s.fertig) {
      if (s.schritt((Math.min(delta, 100) / 1000) * TEMPO)) {
        spiele('abgelehnt');
        this.melde(`zu spät: minus ${Math.abs(ZUSAMMENTRAGEN.punkteFehler)}`, ROT);
      }
      if (s.fertig) spiele('schichtende');
    } else {
      this.endePause += echt;
      if (this.endePause > 0.8) {
        const w = s.auswertung();
        const daten: AuswertungDaten = {
          titel: 'Zusammentragen',
          punkte: w.punkte,
          kopf: `richtig: ${w.richtig}      Fehler: ${w.falsch + w.verspaetet}`,
          zeilen: [`Richtig zusammengetragene Broschüren: ${w.richtig}`, `Falscher Bogen aufgelegt: ${w.falsch}`, `Zeitlimit von ${ZUSAMMENTRAGEN.zeitlimit} Sekunden überschritten: ${w.verspaetet}`],
          tipp:
            w.falsch > w.richtig
              ? 'Tipp: Zuerst die Lauftasche lesen, dann den Anleger suchen.'
              : w.verspaetet > 2
                ? 'Tipp: Die Farbe hilft, den richtigen Anleger schneller zu finden.'
                : 'Sauber gearbeitet: Die Reihenfolge stimmt.',
          nochmals: 'Zusammentragen',
        };
        this.scene.start('VorschauAuswertung', daten);
        return;
      }
    }
    this.meldungZeit = Math.max(0, this.meldungZeit - echt);
    this.zeichne();
  }

  private zeichne(): void {
    const s = this.spiel;
    const e = ZUSAMMENTRAGEN;
    const a = s.auftrag;
    const m = this.maler;
    m.leeren();
    const schichtRest = Math.max(0, e.dauer - s.zeit);
    setze(this.tUhr, `Schicht ${minSek(schichtRest)}`);
    m.balken(66, 5, 60, 6, schichtRest / e.dauer, FARBEN.akzent);
    setze(this.tMitte, `richtig ${s.richtig}    Fehler ${s.falsch + s.verspaetet}`);
    setze(this.tPunkte, punkteText(s.punkte));

    // Lauftasche: Reihenfolge von oben nach unten
    setze(this.tAuftrag, `Broschüre ${a.nummer}`);
    for (let i = 0; i < HOECHSTENS; i++) {
      const t = this.tReihe[i];
      const teil = a.reihenfolge[i];
      t.setVisible(teil !== undefined);
      if (teil === undefined) continue;
      const y = 50 + i * 16;
      const erledigt = i < a.gelegt;
      const dran = i === a.gelegt;
      if (dran) m.rahmen(8, y - 3, 90, 15, FARBEN.akzent, 1);
      m.r(12, y, 16, 9, erledigt ? MF.silber : TEILFARBEN[teil]);
      setze(t, `${i + 1}. ${teilName(teil)}`, erledigt ? '#8f979f' : FARBEN.textAufPapier);
      if (erledigt) m.r(88, y + 2, 6, 5, GRUEN);
    }
    const rest = s.restzeit;
    setze(this.tRest, `noch ${anzeigeSekunden(Math.max(0, rest))} s`);
    const anteil = Math.max(0, rest / e.zeitlimit);
    m.balken(10, 164, 86, 6, anteil, anteil > 0.5 ? FARBEN.gut : anteil > 0.25 ? FARBEN.warnung : FARBEN.schlecht);

    // Anleger
    const anzahl = a.anleger.length;
    for (let i = 0; i < HOECHSTENS; i++) {
      const t = this.tAnleger[i];
      t.setVisible(i < anzahl);
      if (i >= anzahl) continue;
      const f = anlegerFeld(i, anzahl);
      const teil = a.anleger[i];
      const gelegt = a.reihenfolge.indexOf(teil) < a.gelegt;
      m.r(f.x, f.y, f.b, f.h, FARBEN.umriss);
      m.r(f.x + 1, f.y + 1, f.b - 2, f.h - 2, gelegt ? MF.silber : FARBEN.papier);
      // Stapel im Anleger
      if (!gelegt) {
        m.r(f.x + 6, f.y + 8, f.b - 12, 30, TEILFARBEN[teil]);
        for (let k = 4; k < 30; k += 5) m.r(f.x + 6, f.y + 8 + k, f.b - 12, 1, '#ffffff', 0.45);
      }
      t.setPosition(f.x + f.b / 2, f.y + 44);
      setze(t, teilName(teil), gelegt ? '#8f979f' : FARBEN.textAufPapier);
    }

    // Broschüre auf der Sammelkette: wächst mit jedem gelegten Teil
    for (let i = 0; i < a.gelegt; i++) {
      const breite = 30 + i * 3;
      m.r(Math.round(212 - breite / 2), 82 - i * 4, breite, 4, TEILFARBEN[a.reihenfolge[i]]);
      m.r(Math.round(212 - breite / 2), 85 - i * 4, breite, 1, FARBEN.umriss, 0.35);
    }

    this.tMeldung.setVisible(this.meldungZeit > 0);
  }
}

// ---------------------------------------------------------------- Auswertung der Vorschau-Spiele

export class VorschauAuswertungSzene extends Phaser.Scene {
  private daten!: AuswertungDaten;
  private kAuswahl: Rechteck = { x: 176, y: 146, b: 70, h: 30 };
  private kNochmals: Rechteck = { x: 248, y: 146, b: 70, h: 30 };

  constructor() {
    super('VorschauAuswertung');
  }

  init(daten: AuswertungDaten): void {
    this.daten = daten;
  }

  create(): void {
    const d = this.daten;
    const grund = new Maler(this.add.graphics());
    grund.r(0, 0, BREITE, HOEHE, FARBEN.wand);
    grund.r(0, 0, BREITE, 16, FARBEN.leiste);
    grund.r(0, 142, BREITE, 38, FARBEN.leiste);
    grund.r(4, 30, BREITE - 8, 108, FARBEN.papier);
    schrift(this, 4, 2, `Auswertung: ${d.titel}`, FARBEN.text);
    schrift(this, BREITE - 4, 2, punkteText(d.punkte), FARBEN.text, 'rechts');
    schrift(this, 4, 18, d.kopf, FARBEN.textAufBoden);
    schrift(this, BREITE - 4, 18, 'Vorschau: zählt nicht für die Bestleistung', FARBEN.textAufBoden, 'rechts');
    d.zeilen.forEach((zeile, i) => schrift(this, 10, 36 + i * 14, zeile, FARBEN.textAufPapier, 'links', i === 0 ? 10 : 9));
    schrift(this, 10, 112, d.tipp, FARBEN.textAufPapier);
    bild(this, this.kAuswahl.x, this.kAuswahl.y, 'schaltflaeche_blaettern');
    bild(this, this.kNochmals.x, this.kNochmals.y, 'schaltflaeche_nochmals_klein');
    schrift(this, this.kAuswahl.x + 35, 155, 'Auswahl', FARBEN.knopfText, 'mitte');
    schrift(this, this.kNochmals.x + 35, 155, 'Nochmals', FARBEN.knopfText, 'mitte');
    richteAus(this);
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (trifft(this.kNochmals, p.worldX, p.worldY)) this.scene.start(d.nochmals);
      else if (trifft(this.kAuswahl, p.worldX, p.worldY)) this.scene.start('Berufswahl', { bereich: 'ausruestung' });
    });
  }
}
