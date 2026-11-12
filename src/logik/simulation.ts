import { Schicht } from './schicht';
import type { Einstellungen, Zahlenmodell } from './typen';
import { zufallMitStartwert } from './zufall';

export interface Simulationsergebnis {
  schichten: number;
  auftraege: number;
  puenktlich: number;
  nichtVerteilt: number;
  /** Anteil pünktlicher Aufträge in Prozent */
  quote: number;
  auftraegeProSchicht: number;
}

/**
 * Spielt viele Schichten automatisch durch. Spielweise: Jede Lauftasche geht sofort
 * auf die Maschine mit der frühesten voraussichtlichen Fertigzeit. Ist diese voll,
 * auf die nächstbeste. Sind alle voll, bleibt die Lauftasche offen.
 */
export function simuliere(modell: Zahlenmodell, einstellungen: Einstellungen, schichten: number, startwert = 1): Simulationsergebnis {
  let auftraege = 0;
  let puenktlich = 0;
  let nichtVerteilt = 0;
  const dt = 0.25;
  for (let s = 0; s < schichten; s++) {
    const schicht = new Schicht(modell, einstellungen, zufallMitStartwert(startwert + s));
    let sicherung = 0;
    while (schicht.abschnitt !== 'fertig' && sicherung++ < 100000) {
      schicht.schritt(dt);
      for (const a of [...schicht.offen]) {
        const prognose = schicht.prognose(a);
        const frei = Object.entries(prognose).filter((p): p is [string, number] => p[1] !== null);
        if (frei.length === 0) continue;
        frei.sort((x, y) => x[1] - y[1]);
        schicht.zuteilen(a.nummer, frei[0][0]);
      }
    }
    auftraege += schicht.ergebnisse.length;
    puenktlich += schicht.puenktlich;
    nichtVerteilt += schicht.ergebnisse.filter((e) => e.maschine === null).length;
  }
  return {
    schichten,
    auftraege,
    puenktlich,
    nichtVerteilt,
    quote: auftraege === 0 ? 0 : (100 * puenktlich) / auftraege,
    auftraegeProSchicht: auftraege / schichten,
  };
}
