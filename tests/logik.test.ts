import { describe, expect, it } from 'vitest';
import { anzeigeSekunden, dauer, phasen, schnellsteDauer, tausender } from '../src/logik/dauer';
import { EINSTELLUNGEN, LEITSTAND, VORSTUFE, ZAHLENMODELL as ECHTES_MODELL } from '../src/logik/daten';
import { Vorstufe } from '../src/logik/vorstufe';
import { Leitstand, type LeitstandEinstellungen } from '../src/logik/leitstand';
import { Schicht } from '../src/logik/schicht';
import { vergleiche, werteAus } from '../src/logik/auswertung';
import { simuliere } from '../src/logik/simulation';
import { zufallMitStartwert } from '../src/logik/zufall';
import type { Einstellungen, Zahlenmodell } from '../src/logik/typen';
import { BESTLEISTUNG_VERSION, istNeueBestleistung, leseBestleistung, neueBestleistung } from '../src/logik/bestleistung';

// Die Kontrollwerte prüfen das echte Zahlenmodell aus daten/maschinen.json.
const m = (id: string) => ECHTES_MODELL.maschinen.find((x) => x.id === id)!;

// Alle anderen Tests (Warteschlange, Termin, Punkte, Auswertung) rechnen mit einem festen Prüfmodell,
// damit sie nicht kippen, wenn Alexander das Zahlenmodell anpasst.
const ZAHLENMODELL: Zahlenmodell = {
  maschinen: [
    { id: 'digital', name: 'Digitaldruck', ruestzeit: 5, leistung: 50, vierVier: { durchgaenge: 1, leistungsFaktor: 0.5 } },
    { id: 'sm52', name: 'SM 52', ruestzeit: 15, leistung: 150, vierVier: { durchgaenge: 2, leistungsFaktor: 1 } },
    { id: 'ra76', name: 'RA 76', ruestzeit: 30, leistung: 400, vierVier: { durchgaenge: 2, leistungsFaktor: 1 } },
  ],
};
const TOLERANZ = 0.1;
const nah = (ist: number, soll: number) => expect(Math.abs(ist - soll)).toBeLessThanOrEqual(TOLERANZ);

// Schicht ohne automatische Lauftaschen, damit die Tests alles selbst steuern.
// Feste Werte für Termin und Punkte, damit die Tests nicht kippen, wenn die Einstelldatei angepasst wird.
const ohneTakt: Einstellungen = {
  ...EINSTELLUNGEN,
  ersteLauftascheNach: 9999,
  startLauftaschen: 0,
  hilferufAnteil: 0,
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
  // Stand 13.11.2026: Rüstzeit Digitaldruck 5 s, SM 52 12 s, RA 76 22 s. Bei 4/4 im zweiten Durchgang SM 52 7 s, RA 76 11 s.
  it('Rüstzeiten: Digitaldruck 5 s, SM 52 12 s, RA 76 22 s', () => {
    expect(m('digital').ruestzeit).toBe(5);
    expect(m('sm52').ruestzeit).toBe(12);
    expect(m('ra76').ruestzeit).toBe(22);
  });
  it('4/0, 750 Exemplare: Digitaldruck 20 s, SM 52 17 s', () => {
    nah(dauer(m('digital'), 750, '4/0'), 20);
    nah(dauer(m('sm52'), 750, '4/0'), 17);
  });
  it('4/0, 3\'600 Exemplare: SM 52 36 s, RA 76 31 s', () => {
    nah(dauer(m('sm52'), 3600, '4/0'), 36);
    nah(dauer(m('ra76'), 3600, '4/0'), 31);
  });
  it('4/0, 10\'000 Exemplare: RA 76 47 s', () => {
    nah(dauer(m('ra76'), 10000, '4/0'), 47);
  });
  it('4/4, 3\'600 Exemplare: SM 52 67 s (12 + 24 + 7 + 24), RA 76 51 s (22 + 9 + 11 + 9)', () => {
    nah(dauer(m('sm52'), 3600, '4/4'), 67);
    nah(dauer(m('ra76'), 3600, '4/4'), 51);
    expect(phasen(m('sm52'), 3600, '4/4').map((p) => p.dauer)).toEqual([12, 24, 7, 24]);
    expect(phasen(m('ra76'), 3600, '4/4').map((p) => p.dauer)).toEqual([22, 9, 11, 9]);
  });
  it('4/4 im Digitaldruck: Rüstzeit gleich, Leistung 25 Exemplare pro Sekunde', () => {
    nah(dauer(m('digital'), 500, '4/4'), 5 + 500 / 25);
  });
  it('Schwellen bei 4/0: 525 und 2\'400 Exemplare', () => {
    expect(dauer(m('digital'), 500, '4/0')).toBeLessThan(dauer(m('sm52'), 500, '4/0'));
    expect(dauer(m('digital'), 550, '4/0')).toBeGreaterThan(dauer(m('sm52'), 550, '4/0'));
    expect(dauer(m('sm52'), 2350, '4/0')).toBeLessThan(dauer(m('ra76'), 2350, '4/0'));
    expect(dauer(m('sm52'), 2450, '4/0')).toBeGreaterThan(dauer(m('ra76'), 2450, '4/0'));
  });
  it('Schwellen bei 4/4: 525 und 1\'680 Exemplare', () => {
    expect(dauer(m('digital'), 500, '4/4')).toBeLessThan(dauer(m('sm52'), 500, '4/4'));
    expect(dauer(m('digital'), 550, '4/4')).toBeGreaterThan(dauer(m('sm52'), 550, '4/4'));
    expect(dauer(m('sm52'), 1650, '4/4')).toBeLessThan(dauer(m('ra76'), 1650, '4/4'));
    expect(dauer(m('sm52'), 1700, '4/4')).toBeGreaterThan(dauer(m('ra76'), 1700, '4/4'));
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

describe('Hilferuf des Druckers', () => {
  it('der Fortdruck steht, bis der Produktionsleiter hilft, die Rüstzeit läuft normal', () => {
    const s = neueSchicht({ ...ohneTakt, hilferufAnteil: 1 });
    const a = s.auftragMit(3000, '4/0');
    s.lauftascheAuflegen(a);
    s.zuteilen(a.nummer, 'sm52');
    const m = s.maschine('sm52');
    // Rüsten 15 s ohne Störung
    s.schritt(15);
    expect(m.gestoert).toBe(false);
    // Der Hilferuf kommt im Fortdruck (20 s lang), spätestens nach 80 Prozent
    s.schritt(17);
    expect(m.gestoert).toBe(true);
    expect(s.hilferufe).toBe(1);
    const stand = m.laufend!.phasenZeit;
    s.schritt(30);
    expect(m.laufend!.phasenZeit).toBeCloseTo(stand, 5);
    expect(s.ergebnisse.length).toBe(0);
    expect(m.stillstand).toBeGreaterThan(29);
    expect(s.hilf('sm52')).toBe(true);
    expect(s.hilf('sm52')).toBe(false);
    s.schritt(20);
    expect(s.ergebnisse.length).toBe(1);
    // Fertig = 35 s Arbeit plus der Stillstand
    nah(s.ergebnisse[0].fertigUm!, 35 + m.stillstand);
  });
  it('ohne Hilferuf (Anteil 0) ändert sich nichts', () => {
    const s = neueSchicht();
    const a = s.auftragMit(3000, '4/0');
    s.lauftascheAuflegen(a);
    s.zuteilen(a.nummer, 'sm52');
    s.schritt(40);
    expect(s.hilferufe).toBe(0);
    nah(s.ergebnisse[0].fertigUm!, 35);
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
    const r = simuliere(ECHTES_MODELL, EINSTELLUNGEN, 300);
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

describe('Vorstufe (Bereich Polygraf)', () => {
  const fest = { ...VORSTUFE, dauer: 180, zeitlimit: 20, aenderungAnteil: 0, punktePuenktlich: 100, punkteVerspaetet: -50 };
  const neu = () => new Vorstufe(fest, zufallMitStartwert(4));
  /** Baut die Vorlage richtig nach. */
  const baueNach = (v: Vorstufe) => {
    const ziel = [...v.vorlage.seite];
    let letzte = v.setze('', -1);
    ziel.forEach((element, feld) => {
      if (element) letzte = v.setze(element, feld);
    });
    return letzte;
  };
  it('die Vorlage hat vier Elemente auf sechs Feldern', () => {
    const v = neu();
    expect(v.vorlage.seite.length).toBe(6);
    expect(v.vorlage.seite.filter((x) => x !== null).sort()).toEqual([...VORSTUFE.elemente].sort());
  });
  it('richtig nachgebaut innerhalb des Zeitlimits: plus 100 und nächste Lauftasche', () => {
    const v = neu();
    v.schritt(12);
    expect(baueNach(v)).toEqual({ art: 'fertig', puenktlich: true });
    expect(v.punkte).toBe(100);
    expect(v.vorlage.nummer).toBe(2);
    expect(v.arbeit.every((x) => x === null)).toBe(true);
    expect(v.vorlage.limit).toBeCloseTo(32, 5);
  });
  it('nach dem Zeitlimit fertig: Punktabzug', () => {
    const v = neu();
    v.schritt(25);
    expect(baueNach(v)).toEqual({ art: 'fertig', puenktlich: false });
    expect(v.punkte).toBe(-50);
    expect(v.verspaetet).toBe(1);
  });
  it('falsch gesetzte Elemente werden wieder entfernt, die richtigen bleiben', () => {
    const v = neu();
    const ziel = [...v.vorlage.seite];
    const belegt = ziel.map((e, i) => (e ? i : -1)).filter((i) => i >= 0);
    // Zwei Elemente vertauschen, die anderen richtig setzen.
    v.setze(ziel[belegt[0]]!, belegt[1]);
    v.setze(ziel[belegt[1]]!, belegt[0]);
    v.setze(ziel[belegt[2]]!, belegt[2]);
    const antwort = v.setze(ziel[belegt[3]]!, belegt[3]);
    expect(antwort.art).toBe('falsch');
    expect(v.fehlversuche).toBe(1);
    expect(v.arbeit[belegt[0]]).toBeNull();
    expect(v.arbeit[belegt[2]]).toBe(ziel[belegt[2]]);
    expect(v.vorlage.nummer).toBe(1);
  });
  it('Änderung durch den Kunden: Die fertige Seite zählt erst, wenn die Änderung umgesetzt ist', () => {
    const v = new Vorstufe({ ...fest, aenderungAnteil: 1 }, zufallMitStartwert(4));
    const vorher = [...v.vorlage.seite];
    v.schritt(8);
    expect(baueNach(v)).toEqual({ art: 'aenderung' });
    expect(v.punkte).toBe(0);
    expect(v.puenktlich).toBe(0);
    expect(v.vorlage.nummer).toBe(1);
    expect(v.vorlage.geaendert).toBe(true);
    expect(v.vorlage.seite).not.toEqual(vorher);
    expect(v.arbeit.every((x) => x === null)).toBe(true);
    // Das Zeitlimit beginnt für die Änderung neu.
    expect(v.vorlage.limit).toBeCloseTo(28, 5);
    v.schritt(10);
    // Dieselbe Lauftasche wird nur einmal geändert.
    expect(baueNach(v)).toEqual({ art: 'fertig', puenktlich: true });
    expect(v.punkte).toBe(100);
    expect(v.vorlage.nummer).toBe(2);
    expect(v.auswertung()).toMatchObject({ fertigeSeiten: 1, aenderungen: 1 });
  });
  it('im Schnitt wird etwa jede fünfte Lauftasche geändert', () => {
    const v = new Vorstufe({ ...fest, dauer: 100000, aenderungAnteil: 0.2 }, zufallMitStartwert(9));
    for (let i = 0; i < 600; i++) baueNach(v);
    const w = v.auswertung();
    const anteil = w.aenderungen / w.fertigeSeiten;
    expect(anteil).toBeGreaterThan(0.14);
    expect(anteil).toBeLessThan(0.26);
  });
  it('ein Element lässt sich verschieben und wegnehmen', () => {
    const v = neu();
    v.setze('titel', 0);
    v.setze('titel', 3);
    expect(v.arbeit[0]).toBeNull();
    expect(v.platzVon('titel')).toBe(3);
    v.entferne(3);
    expect(v.platzVon('titel')).toBe(-1);
  });
  it('nach drei Minuten ist Schluss, eine abgelaufene offene Lauftasche zählt als verspätet', () => {
    const v = neu();
    v.schritt(170);
    baueNach(v);
    const punkte = v.punkte;
    v.schritt(5);
    v.schritt(100);
    expect(v.fertig).toBe(true);
    expect(v.zeit).toBe(180);
    // Die zweite Lauftasche erschien bei 170 s, ihr Limit (190 s) ist bei Schichtende noch nicht abgelaufen.
    expect(v.punkte).toBe(punkte);
    expect(v.setze('titel', 0)).toEqual({ art: 'nichts' });
    expect(v.auswertung().fertigeSeiten).toBe(1);
    expect(v.auswertung().offenVerspaetet).toBe(false);
    // Ohne jede Eingabe: Die erste Lauftasche läuft ab und zählt am Schluss als verspätet, fertig ist keine Seite.
    const leer = neu();
    leer.schritt(200);
    expect(leer.auswertung()).toMatchObject({ fertigeSeiten: 0, verspaetet: 1, punkte: -50, offenVerspaetet: true });
  });
});
