import type { Auftrag, Farbigkeit, Maschinendaten, Phase, Zahlenmodell } from './typen';

/** Phasen eines Auftrags auf einer Maschine, in der Reihenfolge der Abarbeitung. */
export function phasen(m: Maschinendaten, auflage: number, farbigkeit: Farbigkeit): Phase[] {
  if (farbigkeit === '4/0') {
    return [
      { art: 'ruesten', bezeichnung: 'rüstet', dauer: m.ruestzeit },
      { art: 'drucken', bezeichnung: 'Fortdruck', dauer: auflage / m.leistung },
    ];
  }
  const leistung = m.leistung * m.vierVier.leistungsFaktor;
  if (m.vierVier.durchgaenge <= 1) {
    return [
      { art: 'ruesten', bezeichnung: 'rüstet', dauer: m.ruestzeit },
      { art: 'drucken', bezeichnung: 'Fortdruck', dauer: auflage / leistung },
    ];
  }
  const namen = ['Schöndruck', 'Widerdruck'];
  const liste: Phase[] = [];
  for (let i = 0; i < m.vierVier.durchgaenge; i++) {
    // Für den Widerdruck ist das Rüsten kürzer, wenn das Zahlenmodell es so angibt.
    const ruesten = i === 0 ? m.ruestzeit : (m.vierVier.ruestzeitZweiterDurchgang ?? m.ruestzeit);
    liste.push({ art: 'ruesten', bezeichnung: 'rüstet', dauer: ruesten });
    liste.push({ art: 'drucken', bezeichnung: namen[i] ?? 'Fortdruck', dauer: auflage / leistung });
  }
  return liste;
}

/** Dauer eines Auftrags = Rüstzeit + Auflage geteilt durch Leistung (bei 4/4 nach Zahlenmodell). */
export function dauer(m: Maschinendaten, auflage: number, farbigkeit: Farbigkeit): number {
  return phasen(m, auflage, farbigkeit).reduce((summe, p) => summe + p.dauer, 0);
}

/** Schnellste mögliche Dauer, wenn alle Maschinen frei sind. */
export function schnellsteDauer(modell: Zahlenmodell, auflage: number, farbigkeit: Farbigkeit): number {
  return Math.min(...modell.maschinen.map((m) => dauer(m, auflage, farbigkeit)));
}

export function dauerFuerAuftrag(m: Maschinendaten, a: Auftrag): number {
  return dauer(m, a.auflage, a.farbigkeit);
}

/** Die Anzeige rundet auf ganze Sekunden auf. */
export function anzeigeSekunden(sekunden: number): number {
  return Math.max(0, Math.ceil(sekunden - 1e-9));
}

/** Zahl im Schweizer Format: 1'000 */
export function tausender(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}
