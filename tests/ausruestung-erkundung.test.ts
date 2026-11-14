import { it } from 'vitest';
import { AUSRUESTUNG } from '../src/logik/daten';
import { simuliereAusruestung, type AusruestungEinstellungen } from '../src/logik/ausruestung';
import { zufallMitStartwert } from '../src/logik/zufall';

// Erkundung der Startwerte des Ausrüsters.
// Läuft nur mit: VITE_ERKUNDUNG=1 npx vitest run tests/ausruestung-erkundung.test.ts
it.runIf(import.meta.env.VITE_ERKUNDUNG === '1')('Erkundung Ausrüster', () => {
  const zeilen: string[] = [];
  const lauf = (name: string, e: AusruestungEinstellungen) => {
    const r = simuliereAusruestung(e, 300, (s) => zufallMitStartwert(500 + s));
    zeilen.push(`${name}: ${r.quote.toFixed(1)} % pünktlich, ${r.paletten.toFixed(1)} Paletten, ${r.fahrten.toFixed(1)} Fahrten`);
  };
  lauf('Startwerte', AUSRUESTUNG);
  // Kleinere Aufträge, schnellerer Takt, kürzere Rüstzeiten
  const klein = (bis: number, g1: number, g2: number, rF: number, rH: number): AusruestungEinstellungen => ({
    ...AUSRUESTUNG,
    auflageVon: 300,
    auflageBis: bis,
    falzen: { ...AUSRUESTUNG.falzen, ruestzeit: rF },
    heften: { ...AUSRUESTUNG.heften, ruestzeit: rH },
    groessen: [{ bis: g1, plaetze: 1 }, { bis: g2, plaetze: 2 }, { bis: 999999, plaetze: 3 }],
  });
  for (const [bis, g1, g2] of [[2400, 1000, 1800], [2000, 900, 1500], [2000, 1200, 1700]]) {
    for (const [rF, rH] of [[5, 9], [4, 8]]) {
      for (const takt of [10, 12, 14]) {
        for (const annahmeBis of [130, 145]) {
          for (const terminZuschlag of [30, 40]) {
            lauf(`bis ${bis} (${g1}/${g2}), Rüst ${rF}/${rH}, Takt ${takt}, Annahme ${annahmeBis}, Zuschlag ${terminZuschlag}`, { ...klein(bis, g1, g2, rF, rH), takt, annahmeBis, terminZuschlag });
          }
        }
      }
    }
  }
  throw new Error('\n' + zeilen.join('\n'));
});

// Erkundung der Vorschau C «Ausrüsterei leiten».
import { AUSRUESTEREI } from '../src/logik/daten';
import { simuliereAusruesterei } from '../src/logik/ausruesterei';

it.runIf(import.meta.env.VITE_ERKUNDUNG === '1')('Erkundung Ausrüsterei (Vorschau C)', () => {
  const zeilen: string[] = [];
  for (const takt of [4, 5, 6]) {
    for (const terminZuschlag of [6, 10, 14]) {
      for (const terminFaktor of [1.5, 2]) {
        const r = simuliereAusruesterei({ ...AUSRUESTEREI, takt, terminZuschlag, terminFaktor }, 300, (s) => zufallMitStartwert(900 + s));
        zeilen.push(`C Takt ${takt}, Zuschlag ${terminZuschlag}, Faktor ${terminFaktor}: ${r.quote.toFixed(1)} % pünktlich, ${r.auftraege.toFixed(1)} Aufträge, ${r.fahrten.toFixed(1)} Fahrten`);
      }
    }
  }
  throw new Error('\n' + zeilen.join('\n'));
});

// Erkundung der Vorschau mit Schneidemaschine, Wegen und Hilferuf.
import { AUSRUESTUNG_NEU } from '../src/logik/daten';

it.runIf(import.meta.env.VITE_ERKUNDUNG === '1')('Erkundung Ausrüster neu', () => {
  const zeilen: string[] = [];
  for (const takt of [6, 7, 8, 9]) {
    for (const annahmeBis of [140, 155]) {
      for (const terminZuschlag of [30, 40]) {
        for (const fahrzeit of [12, 15, 18]) {
          const r = simuliereAusruestung({ ...AUSRUESTUNG_NEU, takt, annahmeBis, terminZuschlag, fahrzeit }, 300, (s) => zufallMitStartwert(700 + s));
          zeilen.push(`N Takt ${takt}, Annahme ${annahmeBis}, Zuschlag ${terminZuschlag}, Fahrt ${fahrzeit}: ${r.quote.toFixed(1)} % pünktlich, ${r.paletten.toFixed(1)} Paletten, ${r.fahrten.toFixed(1)} Fahrten`);
        }
      }
    }
  }
  throw new Error('\n' + zeilen.join('\n'));
});
