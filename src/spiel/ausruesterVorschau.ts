import Phaser from 'phaser';
import { anzeigeSekunden, tausender } from '../logik/dauer';
import { AUSRUESTEREI, HEFTEN, ZUSAMMENTRAGEN } from '../logik/daten';
import { Ausruesterei, type Auftrag } from '../logik/ausruesterei';
import { HEFTKOPF, Heften, type Heftung } from '../logik/heften';
import { Zusammentragen } from '../logik/zusammentragen';
import { MF, WF } from '../grafik/zeichnen.ts';
import { BREITE, FARBEN, HOEHE, Maler, bild, minSek, richteAus, schrift, setze, setzeBild, trifft, type Rechteck } from './hilfen';
import { spiele } from './ton';

// Vorschau: drei andere Spiele für den Ausrüster. Aufruf mit ?ausruester=a, ?ausruester=b oder ?ausruester=c.
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
  /** Text zur Bestleistung. Fehlt er, ist es eine Vorschau, die nicht zählt. */
  best?: string;
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

// ---------------------------------------------------------------- Version C: Ausrüsterei leiten

/** Antippbare Fläche jeder Station und Lage ihres Maschinenbilds. Reihenfolge wie in daten/ausruesterei.json. */
const STATION_FELD: Record<string, { feld: Rechteck; bildX: number; bildY: number; steht: string; laeuft: [string, string] }> = {
  schneiden: { feld: { x: 2, y: 17, b: 66, h: 80 }, bildX: 7, bildY: 50, steht: 'schneidemaschine_steht', laeuft: ['schneidemaschine_bereit', 'schneidemaschine_schneidet'] },
  falzen: { feld: { x: 70, y: 17, b: 70, h: 80 }, bildX: 73, bildY: 52, steht: 'mbo_steht_1', laeuft: ['mbo_laeuft_1', 'mbo_laeuft_2'] },
  heften: { feld: { x: 142, y: 17, b: 128, h: 80 }, bildX: 144, bildY: 56, steht: 'hefter_steht_1', laeuft: ['hefter_laeuft_1', 'hefter_laeuft_2'] },
};
const SCHRITTFARBE: Record<string, string> = { schneiden: '#8e6bbf', falzen: '#f2a530', heften: '#3fa7d6' };
const K_ABFAHRT_C: Rechteck = { x: 288, y: 110, b: 30, h: 66 };

function eingangFeld(i: number): Rechteck {
  return { x: 3 + i * 47, y: 100, b: 45, h: 78 };
}

function rampeFeld(i: number): Rechteck {
  return { x: 194 + (i % 2) * 46, y: 110 + Math.floor(i / 2) * 34, b: 44, h: 32 };
}

export class AusruestereiSzene extends Phaser.Scene {
  private spiel!: Ausruesterei;
  private maler!: Maler;
  private vorn!: Maler;
  private tUhr!: Text;
  private tMitte!: Text;
  private tPunkte!: Text;
  private tLastwagen!: Text;
  private tMeldung!: Text;
  private stationTeile: { bild: Phaser.GameObjects.Image; status: Text; nummer: Text }[] = [];
  private kartenTeile: { nummer: Text; schritte: Text[]; rest: Text }[] = [];
  private rampeTexte: Text[] = [];
  /** Feste Plätze der Karten im Eingang: Auftragsnummer oder null. So rutscht beim Tippen keine Karte nach. */
  private plaetze: (number | null)[] = [];
  private bLastwagen!: Phaser.GameObjects.Image;
  private meldungZeit = 0;
  private abgelehnt: { feld: Rechteck; zeit: number } | null = null;
  private endePause = 0;
  private lauf = 0;

  constructor() {
    super('Ausruesterei');
  }

  create(): void {
    const e = AUSRUESTEREI;
    this.spiel = new Ausruesterei(e, Math.random);
    if (TEMPO > 1) (window as unknown as { druckereiPruefung?: Ausruesterei }).druckereiPruefung = this.spiel;
    this.meldungZeit = 0;
    this.abgelehnt = null;
    this.endePause = 0;
    this.lauf = 0;
    this.plaetze = Array.from({ length: e.maxEingang }, () => null);
    this.ordnePlaetze();

    const grund = new Maler(this.add.graphics());
    grund.r(0, 0, BREITE, HOEHE, FARBEN.leiste);
    grund.r(0, 16, BREITE, 62, FARBEN.wand);
    grund.r(0, 78, BREITE, 20, FARBEN.boden);
    bild(this, 4, 3, 'uhr_hell');
    this.bLastwagen = bild(this, 272, 50, 'lastwagen_heck', 1);
    this.maler = new Maler(this.add.graphics().setDepth(2));
    this.vorn = new Maler(this.add.graphics().setDepth(7));

    this.tUhr = schrift(this, 16, 2, '', FARBEN.text);
    this.tMitte = schrift(this, 192, 2, '', FARBEN.text, 'mitte');
    this.tPunkte = schrift(this, BREITE - 4, 2, '', FARBEN.text, 'rechts');
    this.tLastwagen = schrift(this, 295, 18, '', FARBEN.textAufBoden, 'mitte', 8).setAlign('center');
    this.tMeldung = schrift(this, 295, 40, '', GRUEN, 'mitte', 10).setDepth(9).setVisible(false);
    schrift(this, 194, 99, 'Rampe', FARBEN.text, 'links', 8);
    schrift(this, K_ABFAHRT_C.x + 15, 130, 'Ab-\nfahrt', FARBEN.knopfText, 'mitte').setAlign('center').setDepth(6);

    this.stationTeile = e.stationen.map((st) => {
      const lage = STATION_FELD[st.id];
      const mitte = lage.feld.x + lage.feld.b / 2;
      schrift(this, mitte, 18, st.name, FARBEN.textAufBoden, 'mitte', 9);
      return {
        bild: bild(this, lage.bildX, lage.bildY, lage.steht, 1),
        status: schrift(this, mitte, 29, '', FARBEN.textAufBoden, 'mitte', 8),
        nummer: schrift(this, mitte, 45, '', FARBEN.textAufPapier, 'mitte', 8).setDepth(6),
      };
    });
    this.kartenTeile = [];
    for (let i = 0; i < e.maxEingang; i++) {
      const f = eingangFeld(i);
      this.kartenTeile.push({
        nummer: schrift(this, f.x + 4, f.y + 2, '', FARBEN.textAufPapier, 'links', 10),
        schritte: e.stationen.map((_, k) => schrift(this, f.x + 10, f.y + 17 + k * 11, '', FARBEN.textAufPapier, 'links', 8)),
        rest: schrift(this, f.x + 4, f.y + 56, '', FARBEN.textAufPapier),
      });
    }
    this.rampeTexte = [];
    for (let i = 0; i < e.rampePlaetze; i++) {
      const f = rampeFeld(i);
      this.rampeTexte.push(schrift(this, f.x + f.b / 2, f.y + 4, '', FARBEN.textAufPapier, 'mitte', 10));
    }
    richteAus(this);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.tippe(p.worldX, p.worldY));
  }

  /** Hält die festen Plätze im Eingang aktuell: Weggeschickte Aufträge geben ihren Platz frei, neue nehmen den ersten freien. */
  private ordnePlaetze(): void {
    const da = new Set(this.spiel.eingang.map((a) => a.nummer));
    this.plaetze = this.plaetze.map((n) => (n !== null && da.has(n) ? n : null));
    for (const a of this.spiel.eingang) {
      if (this.plaetze.includes(a.nummer)) continue;
      const frei = this.plaetze.indexOf(null);
      if (frei >= 0) this.plaetze[frei] = a.nummer;
    }
  }

  /** Wohin ein Auftrag als Nächstes geht, in Worten. */
  private naechstesZiel(a: Auftrag): string {
    return a.erledigt < a.weg.length ? `weiter: ${a.weg[a.erledigt]}` : 'weiter: Rampe';
  }

  private lehneAb(feld: Rechteck): void {
    this.abgelehnt = { feld, zeit: 0.4 };
    spiele('abgelehnt');
  }

  private tippe(x: number, y: number): void {
    const s = this.spiel;
    if (s.fertig) return;
    // Aufträge im Eingang
    for (let i = 0; i < this.plaetze.length; i++) {
      const f = eingangFeld(i);
      const nummer = this.plaetze[i];
      if (nummer === null || !trifft(f, x, y)) continue;
      if (s.tippe(nummer) === 'besetzt') this.lehneAb(f);
      else spiele('zuteilen');
      this.ordnePlaetze();
      return;
    }
    // Stationen: fertigen Auftrag weiterschicken
    for (const st of s.stationen) {
      const feld = STATION_FELD[st.daten.id].feld;
      if (!trifft(feld, x, y)) continue;
      if (!st.auftrag) return;
      const antwort = s.tippe(st.auftrag.nummer);
      if (antwort === 'besetzt') this.lehneAb(feld);
      else if (antwort !== 'laeuft') spiele('zuteilen');
      return;
    }
    // Rampe: in den Lastwagen laden
    for (let i = 0; i < s.rampe.length; i++) {
      const f = rampeFeld(i);
      if (!trifft(f, x, y)) continue;
      if (s.tippe(s.rampe[i].nummer) === 'besetzt') this.lehneAb(f);
      else spiele('zuteilen');
      return;
    }
    if (trifft(K_ABFAHRT_C, x, y)) {
      const vorher = s.punkte;
      if (s.abfahrt()) {
        const plus = s.punkte - vorher;
        spiele(plus >= 0 ? 'puenktlich' : 'verspaetet');
        setze(this.tMeldung, plus >= 0 ? `plus ${plus}` : `minus ${Math.abs(plus)}`, plus >= 0 ? GRUEN : ROT);
        this.meldungZeit = 1.2;
      } else {
        this.lehneAb(K_ABFAHRT_C);
      }
      return;
    }
  }

  update(_zeit: number, delta: number): void {
    const s = this.spiel;
    const echt = delta / 1000;
    this.lauf += echt;
    if (!s.fertig) {
      s.schritt((Math.min(delta, 100) / 1000) * TEMPO);
      this.ordnePlaetze();
      if (s.fertig) spiele('schichtende');
    } else {
      this.endePause += echt;
      if (this.endePause > 0.8) {
        const w = s.auswertung();
        const daten: AuswertungDaten = {
          titel: 'Ausrüsterei leiten',
          punkte: w.punkte,
          kopf: `pünktlich: ${w.puenktlich}      verspätet: ${w.verspaetet}`,
          zeilen: [
            `Pünktlich abgefahren: ${w.puenktlich} ${w.puenktlich === 1 ? 'Auftrag' : 'Aufträge'}`,
            `Zu spät abgefahren: ${w.verspaetet - w.nichtGeliefert}`,
            `Am Schichtende nicht abgefahren: ${w.nichtGeliefert}`,
            `Fahrten des Lastwagens: ${w.fahrten}`,
            `Fertige Aufträge blieben auf den Maschinen liegen: ${anzeigeSekunden(w.stillstand)} s`,
          ],
          tipp:
            w.stillstand > 30
              ? 'Tipp: Fertige Aufträge sofort weiterschicken, sonst steht die Maschine.'
              : w.nichtGeliefert > 3
                ? 'Tipp: Gegen Schichtende früher verladen und abfahren.'
                : w.verspaetet > w.puenktlich
                  ? 'Tipp: Aufträge mit wenig Restzeit zuerst weiterschicken.'
                  : 'Sauber gearbeitet: Die Ausrüsterei läuft rund.',
          nochmals: 'Ausruesterei',
        };
        this.scene.start('VorschauAuswertung', daten);
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

  private restBalken(a: Auftrag, x: number, y: number, b: number): void {
    const rest = a.termin - this.spiel.zeit;
    const anteil = rest / (a.termin - a.erschienen);
    this.maler.balken(x, y, b, 4, rest <= 0 ? 1 : anteil, rest <= 0 ? FARBEN.schlecht : anteil > 0.5 ? FARBEN.gut : anteil > 0.25 ? FARBEN.warnung : FARBEN.schlecht);
  }

  private zeichne(): void {
    const s = this.spiel;
    const e = AUSRUESTEREI;
    const m = this.maler;
    m.leeren();
    this.vorn.leeren();
    const schichtRest = Math.max(0, e.dauer - s.zeit);
    setze(this.tUhr, `Schicht ${minSek(schichtRest)}`);
    m.balken(66, 5, 60, 6, schichtRest / e.dauer, FARBEN.akzent);
    setze(this.tMitte, `pünktlich ${s.puenktlich}    verspätet ${s.verspaetet}`);
    setze(this.tPunkte, punkteText(s.punkte));
    const blinkt = Math.floor(this.lauf * 4) % 2 === 0;
    const bewegung = Math.floor(this.lauf * 6) % 2;

    // Stationen
    s.stationen.forEach((st, i) => {
      const lage = STATION_FELD[st.daten.id];
      const t = this.stationTeile[i];
      const f = lage.feld;
      const a = st.auftrag;
      const laeuft = a !== null && st.rest > 0;
      const wartet = a !== null && st.rest === 0;
      setzeBild(t.bild, laeuft ? lage.laeuft[bewegung] : lage.steht);
      setze(t.status, laeuft ? `läuft ${anzeigeSekunden(st.rest)} s` : wartet && a ? this.naechstesZiel(a) : 'frei', wartet ? GRUEN : FARBEN.textAufBoden);
      m.balken(f.x + 5, 40, f.b - 10, 4, laeuft ? 1 - st.rest / st.daten.dauer : wartet ? 1 : 0, wartet ? FARBEN.gut : FARBEN.akzent);
      t.nummer.setVisible(a !== null);
      if (a) {
        // Zettel mit der Auftragsnummer an der Maschine
        const mitte = f.x + f.b / 2;
        m.r(mitte - 14, 44, 28, 12, wartet && blinkt ? FARBEN.gut : FARBEN.umriss);
        m.r(mitte - 13, 45, 26, 10, FARBEN.papier);
        setze(t.nummer, `Nr ${a.nummer}`);
        if (wartet) m.rahmen(f.x, f.y, f.b, f.h, FARBEN.gut, blinkt ? 2 : 1);
      }
    });

    // Lastwagen
    const da = s.lastwagenDa;
    this.bLastwagen.setVisible(da);
    setze(this.tLastwagen, da ? `${s.geladen.length} von ${e.lastwagenPlaetze}\ngeladen` : `unterwegs\n${anzeigeSekunden(s.unterwegsBis - s.zeit)} s`);

    // Eingang
    for (let i = 0; i < e.maxEingang; i++) {
      const f = eingangFeld(i);
      const t = this.kartenTeile[i];
      const a = s.eingang.find((x) => x.nummer === this.plaetze[i]);
      const sichtbar = a !== undefined;
      t.nummer.setVisible(sichtbar);
      t.rest.setVisible(sichtbar);
      t.schritte.forEach((x) => x.setVisible(false));
      if (!a) {
        m.rahmen(f.x, f.y, f.b, f.h, FARBEN.maschineDunkel);
        continue;
      }
      m.r(f.x, f.y, f.b, f.h, FARBEN.maschineDunkel);
      m.r(f.x + 1, f.y + 1, f.b - 2, f.h - 2, FARBEN.papier);
      setze(t.nummer, `Nr ${a.nummer}`);
      a.weg.forEach((id, k) => {
        const text = t.schritte[k];
        text.setVisible(true);
        setze(text, id);
        m.r(f.x + 3, f.y + 20 + k * 11, 5, 6, SCHRITTFARBE[id] ?? FARBEN.akzent);
      });
      const rest = a.termin - s.zeit;
      setze(t.rest, rest <= 0 ? 'zu spät' : `${anzeigeSekunden(rest)} s`, rest <= 0 ? FARBEN.schlecht : FARBEN.textAufPapier);
      this.restBalken(a, f.x + 3, f.y + 70, f.b - 6);
    }

    // Rampe
    for (let i = 0; i < e.rampePlaetze; i++) {
      const f = rampeFeld(i);
      const a = s.rampe[i];
      this.rampeTexte[i].setVisible(a !== undefined);
      m.r(f.x, f.y, f.b, f.h, FARBEN.warnung);
      m.r(f.x + 1, f.y + 1, f.b - 2, f.h - 2, a ? FARBEN.papier : FARBEN.maschine);
      if (!a) continue;
      setze(this.rampeTexte[i], `Nr ${a.nummer}`);
      this.restBalken(a, f.x + 4, f.y + 23, f.b - 8);
    }

    // Abfahrt
    const bereit = da && s.geladen.length > 0;
    m.r(K_ABFAHRT_C.x, K_ABFAHRT_C.y, K_ABFAHRT_C.b, K_ABFAHRT_C.h, FARBEN.umriss);
    m.r(K_ABFAHRT_C.x + 1, K_ABFAHRT_C.y + 1, K_ABFAHRT_C.b - 2, K_ABFAHRT_C.h - 2, bereit ? FARBEN.gut : FARBEN.maschineDunkel);

    this.tMeldung.setVisible(this.meldungZeit > 0);
    if (this.abgelehnt && Math.floor(this.abgelehnt.zeit * 10) % 2 === 0) {
      const f = this.abgelehnt.feld;
      this.vorn.r(f.x, f.y, f.b, f.h, FARBEN.schlecht, 0.45);
    }
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
    schrift(this, BREITE - 4, 18, d.best ?? 'Vorschau: zählt nicht für die Bestleistung', FARBEN.textAufBoden, 'rechts');
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
