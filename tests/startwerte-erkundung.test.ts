import { it } from 'vitest';
import { EINSTELLUNGEN, ZAHLENMODELL } from '../src/logik/daten';
import { simuliere } from '../src/logik/simulation';

// Erkundung: Wie verändert sich der Anteil pünktlicher Aufträge mit anderen Startwerten?
// Läuft nur mit: VITE_ERKUNDUNG=1 npx vitest run tests/startwerte-erkundung.test.ts
it.runIf(import.meta.env.VITE_ERKUNDUNG === '1')('Erkundung der Startwerte', () => {
  const zeilen: string[] = [];
  const lauf = (name: string, e: typeof EINSTELLUNGEN) => {
    const r = simuliere(ZAHLENMODELL, e, 400);
    zeilen.push(`${name}: ${r.quote.toFixed(1)} % pünktlich, ${r.auftraegeProSchicht.toFixed(1)} Aufträge, ${(r.nichtVerteilt / r.schichten).toFixed(2)} nicht verteilt`);
  };
  lauf('Startwerte', EINSTELLUNGEN);
  for (const takt of [9, 10, 11, 12, 14]) lauf(`Takt ${takt}`, { ...EINSTELLUNGEN, takt });
  for (const z of [25, 35, 45, 60]) lauf(`Zuschlag ${z}`, { ...EINSTELLUNGEN, terminZuschlag: z });
  for (const f of [2.5, 3, 4]) lauf(`Faktor ${f}`, { ...EINSTELLUNGEN, terminFaktor: f });
  for (const [t, z] of [[10, 25], [10, 30], [10, 40], [11, 25], [12, 20], [12, 25], [9, 40]]) lauf(`Takt ${t}, Zuschlag ${z}`, { ...EINSTELLUNGEN, takt: t, terminZuschlag: z });
  lauf('Takt 10, Faktor 3', { ...EINSTELLUNGEN, takt: 10, terminFaktor: 3 });
  throw new Error('\n' + zeilen.join('\n'));
});
