import { it } from 'vitest';
import { AUSRUESTUNG } from '../src/logik/daten';
import { simuliereAusruestung } from '../src/logik/ausruestung';
import { zufallMitStartwert } from '../src/logik/zufall';

// Erkundung der Startwerte des Ausrüsters.
// Läuft nur mit: VITE_ERKUNDUNG=1 npx vitest run tests/ausruestung-erkundung.test.ts
it.runIf(import.meta.env.VITE_ERKUNDUNG === '1')('Erkundung Ausrüster', () => {
  const zeilen: string[] = [];
  const lauf = (name: string, e: typeof AUSRUESTUNG) => {
    const r = simuliereAusruestung(e, 300, (s) => zufallMitStartwert(500 + s));
    zeilen.push(`${name}: ${r.quote.toFixed(1)} % pünktlich, ${r.paletten.toFixed(1)} Paletten, ${r.fahrten.toFixed(1)} Fahrten`);
  };
  lauf('Startwerte', AUSRUESTUNG);
  for (const takt of [15, 16, 20]) lauf(`Takt ${takt}`, { ...AUSRUESTUNG, takt });
  for (const z of [30, 50]) lauf(`Zuschlag ${z}`, { ...AUSRUESTUNG, terminZuschlag: z });
  throw new Error('\n' + zeilen.join('\n'));
});
