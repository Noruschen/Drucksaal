import { describe, expect, it } from 'vitest';
import { anzeigeSekunden, dauer, phasen, schnellsteDauer, tausender } from '../src/logik/dauer';
import { EINSTELLUNGEN, LEITSTAND, ZAHLENMODELL } from '../src/logik/daten';
import { Leitstand, type LeitstandEinstellungen } from '../src/logik/leitstand';
import { Schicht } from '../src/logik/schicht';
import { vergleiche, werteAus } from '../src/logik/auswertung';
import { simuliere } from '../src/logik/simulation';
import { zufallMitStartwert } from '../src/logik/zufall';
import type { Einstellungen } from '../src/logik/typen';
import { BESTLEISTUNG_VERSION, istNeueBestleistung, leseBestleistung, neueBestleistung } from '../src/logik/bestleistung';

const m = (id: string) => ZAHLENMODELL.maschinen.find((x) => x.id === id)!;
const TOLERANZ = 0.1;
const nah = (ist: number, soll: number) => expect(Math.abs(ist - soll)).toBeLessThanOrEqual(TOLERANZ);

// Schicht ohne automatische Lauftaschen, damit die Tests alles selbst steuern.
// Feste Werte für Termin und Punkte, damit die Tests nicht kippen, wenn die Einstelldatei angepasst wird.
const ohneTakt: Einstellungen = {
  ...EINSTELLUNGEN,
  ersteLauftascheNach: 9999,
  startLauftaschen: 0,
  schichtDauer: 180,
  terminFaktor: 2,
  terminZuschlag: 15,
  maxOffeneLauftaschen: 4,
  maxWartendProMaschine: 3,
  punktePuenktlich: 100,
  punkteVerspaetet: -50,
};
const neueSchicht = (e: Einstellungen = ohneTakt) => new Schicht(ZAHLENMODELL, e, zufallMitStartwert(7));

describe('Kontrollwerte des Zahlenmodells (Toleranz 0,1 s)', () => {
  it('4/0, 750 Exemplare: Digitaldruck 20 s, SM 52 20 s', () => {
    nah(dauer(m('digital'), 750, '4/0'), 20);
    nah(dauer(m('sm52'), 750, '4/0'), 20);
  });
  it('4/0, 3\'600 Exemplare: SM 52 39 s, RA 76 39 s', () => {
    nah(dauer(m('sm52'), 3600, '4/0'), 39);
    nah(dauer(m('ra76'), 3600, '4/0'), 39);
  });
  it('4/0, 10\'000 Exemplare: RA 76 55 s', () => {
    nah(dauer(m('ra76'), 10000, '4/0'), 55);
  });
  it('4/4, 3\'600 Exemplare: SM 52 78 s, RA 76 78 s', () => {
    nah(dauer(m('sm52'), 3600, '4/4'), 78);
    nah(dauer(m('ra76'), 3600, '4/4'), 78);
  });
  it('4/4 im Digitaldruck: Rüstzeit gleich, Leistung 25 Exemplare pro Sekunde', () => {
    nah(dauer(m('digital'), 500, '4/4'), 5 + 500 / 25);
  });
  it('Schwellen bei 4/4: rund 940 und 3\'600 Exemplare', () => {
    expect(dauer(m('digital'), 900, '4/4')).toBeLessThan(dauer(m('sm52'), 900, '4/4'));
    expect(dauer(m('digital'), 950, '4/4')).toBeGreaterThan(dauer(m('sm52'), 950, '4/4'));
    expect(dauer(m('sm52'), 3550, '4/4')).toBeLessThan(dauer(m('ra76'), 3550, '4/4'));
    expect(dauer(m('sm52'), 3650, '4/4')).toBeGreaterThan(dauer(m('ra76'), 3650, '4/4'));
  });
  it('4/4 auf SM 52: vier Phasen (rüsten, Schöndruck, rüsten, Widerdruck)', () => {
    expect(phasen(m('sm52'), 3600, '4/4').map((p) => p.bezeichnung)).toEqual(['rüstet', 'Schöndruck', 'rüstet', 'Widerdruck']);
    expect(phasen(m('digital'), 3600, '4/4').map((p) => p.bezeichnung)).toEqual(['rüstet', 'Fortdruck']);
  });
  it('Anzeige rundet auf ganze Sekunden auf, Zahlen im Format 1\'000', () => {
    expect(anzeigeSekunden(38.2)).toBe(39);
    expect(anzeigeSekunden(39)).toBe(39);
    expect(tausender(12000)).toBe("12'000");
    expect(tausender(750)).toBe('750');
  });
});

describe('Liefertermin', () => {
  it('schnellste Dauer mal 2 plus 15 s, ab Erscheinen', () => {
    const s = neueSchicht();
    s.schritt(10);
    const a = s.auftragMit(3600, '4/0');
    nah(schnellsteDauer(ZAHLENMODELL, 3600, '4/0'), 39);
    nah(a.termin, 10 + 39 * 2 + 15);
  });
});

describe('Warteschlange', () => {
  it('arbeitet der Reihe nach ab und rechnet die Wartezeit ein', () => {
    const s = neueSchicht();
    const a = s.auftragMit(750, '4/0');
    const b = s.auftragMit(1500, '4/0');
    s.lauftascheAuflegen(a);
    s.lauftascheAuflegen(b);
    expect(s.zuteilen(a.nummer, 'sm52')).toEqual({ ok: true });
    nah(s.prognose(b).sm52!, 20 + 25);
    nah(s.prognose(b).digital!, 35);
    s.zuteilen(b.nummer, 'sm52');
    nah(s.besetztNoch(s.maschine('sm52')), 45);
    s.schritt(20.05);
    expect(s.ergebnisse.length).toBe(1);
    expect(s.maschine('sm52').laufend?.zuteilung.auftrag.nummer).toBe(b.nummer);
    s.schritt(25);
    expect(s.ergebnisse.length).toBe(2);
    nah(s.ergebnisse[1].fertigUm!, 45);
  });
  it('1 läuft plus 3 warten, dann lehnt die Maschine ab und die Lauftasche bleibt offen', () => {
    const s = neueSchicht({ ...ohneTakt, maxOffeneLauftaschen: 10 });
    const liste = [1, 2, 3, 4, 5].map(() => s.auftragMit(500, '4/0'));
    liste.forEach((a) => s.lauftascheAuflegen(a));
    for (let i = 0; i < 4; i++) expect(s.zuteilen(liste[i].nummer, 'digital').ok).toBe(true);
    expect(s.zuteilen(liste[4].nummer, 'digital')).toEqual({ ok: false, grund: 'voll' });
    expect(s.offen.length).toBe(1);
    expect(s.prognose(liste[4]).digital).toBeNull();
  });
  it('höchstens 4 offene Lauftaschen, dann fällt der Takt aus', () => {
    const s = neueSchicht({ ...ohneTakt, ersteLauftascheNach: 1, takt: 8 });
    s.schritt(100);
    expect(s.offen.length).toBe(4);
    expect(s.ergebnisse.length).toBe(0);
  });
});

describe('Punkte und Schichtende', () => {
  it('pünktlich plus 100, verspätet minus 50, genau zum Termin gilt als pünktlich', () => {
    const s = neueSchicht();
    const a = s.auftragMit(750, '4/0');
    a.termin = 20;
    const b = s.auftragMit(750, '4/0');
    b.termin = 19.5;
    s.lauftascheAuflegen(a);
    s.lauftascheAuflegen(b);
    s.zuteilen(a.nummer, 'digital');
    s.zuteilen(b.nummer, 'sm52');
    s.schritt(21);
    expect(s.puenktlich).toBe(1);
    expect(s.verspaetet).toBe(1);
    expect(s.punkte).toBe(50);
  });
  it('nicht verteilte Lauftasche zählt am Schichtende als verspätet, ohne Vergleich', () => {
    const s = neueSchicht();
    s.lauftascheAuflegen(s.auftragMit(500, '4/0'));
    s.schritt(181);
    expect(s.abschnitt).toBe('fertig');
    const w = werteAus(s);
    expect(w.verspaetet).toBe(1);
    expect(w.punkte).toBe(-50);
    expect(w.verspaeteteAuftraege[0].vergleich).toBeNull();
  });
  it('nach 180 s kommen keine Lauftaschen mehr, die Maschinen arbeiten fertig', () => {
    const s = neueSchicht();
    s.schritt(170);
    const a = s.auftragMit(10000, '4/4');
    s.lauftascheAuflegen(a);
    s.zuteilen(a.nummer, 'ra76');
    s.schritt(15);
    expect(s.abschnitt).toBe('zeitraffer');
    expect(s.zuteilen(1, 'sm52')).toEqual({ ok: false, grund: 'beendet' });
    s.schritt(200);
    expect(s.abschnitt).toBe('fertig');
    nah(s.ergebnisse[0].fertigUm!, 170 + 110);
  });
});

describe('Auswertung', () => {
  it('nennt die früheste Maschine und die Sekunden', () => {
    const s = neueSchicht();
    // 6'000 Exemplare 4/0: Digitaldruck 125 s, RA 76 45 s, Liefertermin 45 mal 2 plus 15 = 105 s.
    const a = s.auftragMit(6000, '4/0');
    s.lauftascheAuflegen(a);
    s.zuteilen(a.nummer, 'digital');
    s.schritt(200);
    const w = werteAus(s);
    expect(w.verspaetet).toBe(1);
    const v = w.verspaeteteAuftraege[0];
    nah(v.verspaetung!, 20);
    expect(v.vergleich!.warBesteWahl).toBe(false);
    expect(v.vergleich!.besteMaschine).toBe('ra76');
    nah(v.vergleich!.frueherUm, 80);
  });
  it('volle Maschinen fallen aus dem Vergleich', () => {
    const v = vergleiche({
      auftrag: { nummer: 1, auflage: 100, farbigkeit: '4/0', erschienen: 0, termin: 10 },
      maschine: 'sm52',
      fertigUm: 30,
      puenktlich: false,
      prognose: { digital: null, sm52: 30, ra76: 40 },
    });
    expect(v).toEqual({ besteMaschine: 'sm52', warBesteWahl: true, frueherUm: 0 });
  });
});

describe('Schichtbeginn', () => {
  it('startet mit drei Lauftaschen: klein, mittel und gross', () => {
    const s = new Schicht(ZAHLENMODELL, { ...ohneTakt, startLauftaschen: 3 }, zufallMitStartwert(5));
    expect(s.offen.length).toBe(3);
    const k = ohneTakt.auflagenKlassen;
    s.offen.forEach((a, i) => {
      expect(a.auflage).toBeGreaterThanOrEqual(k[i].von);
      expect(a.auflage).toBeLessThanOrEqual(k[i].bis);
      expect(a.erschienen).toBe(0);
    });
  });
});

describe('Test der Startwerte', () => {
  it('spielt viele Schichten mit der Spielweise «früheste Fertigzeit» durch', () => {
    const r = simuliere(ZAHLENMODELL, EINSTELLUNGEN, 300);
    console.log(
      `Startwerte: ${r.quote.toFixed(1)} Prozent pünktlich, ${r.auftraegeProSchicht.toFixed(1)} Aufträge pro Schicht, ` +
        `${(r.nichtVerteilt / r.schichten).toFixed(1)} nicht verteilt pro Schicht (Ziel: 70 bis 90 Prozent)`,
    );
    expect(r.auftraege).toBeGreaterThan(0);
    expect(r.quote).toBeGreaterThanOrEqual(0);
    expect(r.quote).toBeLessThanOrEqual(100);
  });
});

describe('Bestleistung', () => {
  it('wird mit Versionsnummer gespeichert und wieder gelesen', () => {
    const b = neueBestleistung(1250, 14, 3, '12.11.2026');
    expect(b.version).toBe(BESTLEISTUNG_VERSION);
    expect(leseBestleistung(JSON.stringify(b))).toEqual(b);
  });
  it('verwirft kaputte Daten und andere Versionen', () => {
    expect(leseBestleistung(null)).toBeNull();
    expect(leseBestleistung('kein JSON')).toBeNull();
    expect(leseBestleistung(JSON.stringify({ version: BESTLEISTUNG_VERSION + 1, punkte: 900 }))).toBeNull();
    expect(leseBestleistung(JSON.stringify({ version: BESTLEISTUNG_VERSION, punkte: 'viel' }))).toBeNull();
  });
  it('nur ein höherer Punktestand ist eine neue Bestleistung', () => {
    const b = neueBestleistung(500, 6, 2, '12.11.2026');
    expect(istNeueBestleistung(100, null)).toBe(true);
    expect(istNeueBestleistung(600, b)).toBe(true);
    expect(istNeueBestleistung(500, b)).toBe(false);
    expect(istNeueBestleistung(-50, b)).toBe(false);
  });
});

describe('Leitstand (Bereich Medientechnologe)', () => {
  const ruhig: LeitstandEinstellungen = { ...LEITSTAND, dauer: 10, bogenProSekunde: 100, toleranz: 0.25, schrittFarbe: 0.1, driftAmAnfang: 0, driftAmEnde: 0, passerVon: 999, passerBis: 999, passerMax: 3 };
  it('ohne Abweichung entstehen nur Gutbogen', () => {
    const l = new Leitstand(ruhig, zufallMitStartwert(1));
    l.schritt(10);
    expect(l.fertig).toBe(true);
    expect(l.gutbogen).toBe(1000);
    expect(l.makulatur).toBe(0);
    expect(l.auswertung().anteil).toBeCloseTo(100, 5);
  });
  it('Farbe ausserhalb der Toleranz ergibt Makulatur, bis man zurückstellt', () => {
    const l = new Leitstand(ruhig, zufallMitStartwert(1));
    for (let i = 0; i < 3; i++) l.stelleFarbe(0, 1);
    expect(l.inToleranz(0)).toBe(false);
    l.schritt(4);
    expect(l.makulatur).toBe(400);
    l.stelleFarbe(0, -1);
    expect(l.inToleranz(0)).toBe(true);
    l.schritt(6);
    expect(l.gutbogen).toBe(600);
    expect(l.auswertung().farbeAusserhalb[0].sekunden).toBeCloseTo(4, 1);
  });
  it('verschobener Passer ergibt Makulatur, das Steuerkreuz stellt ihn zurück', () => {
    const l = new Leitstand(ruhig, zufallMitStartwert(1));
    l.stellePasser(1, 0);
    l.stellePasser(0, -1);
    expect(l.passerStimmt).toBe(false);
    l.schritt(2);
    l.stellePasser(-1, 0);
    l.stellePasser(0, 1);
    expect(l.passerStimmt).toBe(true);
    l.schritt(8);
    expect(l.makulatur).toBe(200);
    expect(l.gutbogen).toBe(800);
  });
  it('Passer bleibt im erlaubten Bereich, Farbwert zwischen -1 und +1', () => {
    const l = new Leitstand(ruhig, zufallMitStartwert(1));
    for (let i = 0; i < 10; i++) l.stellePasser(1, 1);
    expect(l.passer).toEqual({ x: 3, y: 3 });
    for (let i = 0; i < 30; i++) l.stelleFarbe(2, -1);
    expect(l.farben[2].wert).toBe(-1);
  });
  it('mit den Startwerten laufen Farben und Passer von selbst weg', () => {
    const l = new Leitstand(LEITSTAND, zufallMitStartwert(3));
    l.schritt(LEITSTAND.dauer);
    const w = l.auswertung();
    expect(l.fertig).toBe(true);
    expect(w.gutbogen + w.makulatur).toBe(LEITSTAND.dauer * LEITSTAND.bogenProSekunde);
    expect(w.makulatur).toBeGreaterThan(0);
  });
});
