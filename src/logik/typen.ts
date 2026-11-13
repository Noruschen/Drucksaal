// Datentypen der Spiellogik. Kein Bezug zu Phaser oder zum Browser.

export type Farbigkeit = '4/0' | '4/4';

export interface Maschinendaten {
  id: string;
  name: string;
  /** Rüstzeit in Sekunden bei 4/0 */
  ruestzeit: number;
  /** Exemplare pro Sekunde bei 4/0 */
  leistung: number;
  vierVier: {
    /** 2 = Schön- und Widerdruck in zwei Durchgängen (rüsten und drucken je zweimal) */
    durchgaenge: number;
    /** Faktor auf die Leistung bei 4/4 (Digitaldruck 0.5) */
    leistungsFaktor: number;
    /** Rüstzeit für den zweiten Durchgang (Widerdruck) in Sekunden. Ohne Angabe gilt die normale Rüstzeit. */
    ruestzeitZweiterDurchgang?: number;
  };
}

export interface Zahlenmodell {
  maschinen: Maschinendaten[];
}

export interface Auflagenklasse {
  anteil: number;
  von: number;
  bis: number;
}

export interface Einstellungen {
  schichtDauer: number;
  takt: number;
  ersteLauftascheNach: number;
  /** So viele Lauftaschen liegen zum Schichtbeginn bereit: je eine aus den ersten Auflagenklassen */
  startLauftaschen?: number;
  /** Anteil der Aufträge, bei denen der Drucker im Fortdruck um Hilfe ruft (0.2 = 20 Prozent) */
  hilferufAnteil?: number;
  maxOffeneLauftaschen: number;
  maxWartendProMaschine: number;
  anteilVierVier: number;
  auflagenSchritt: number;
  auflagenKlassen: Auflagenklasse[];
  terminFaktor: number;
  terminZuschlag: number;
  punktePuenktlich: number;
  punkteVerspaetet: number;
  zeitraffer: number;
}

/** Ein Auftrag. Später kommen weitere Felder dazu (Format, Kosten, Makulatur). */
export interface Auftrag {
  nummer: number;
  auflage: number;
  farbigkeit: Farbigkeit;
  /** Spielzeit, zu der die Lauftasche erschienen ist */
  erschienen: number;
  /** Liefertermin als Spielzeit */
  termin: number;
}

export type Phasenart = 'ruesten' | 'drucken';

export interface Phase {
  art: Phasenart;
  /** Anzeige: «rüstet», «Fortdruck», «Schöndruck», «Widerdruck» */
  bezeichnung: string;
  dauer: number;
}

/** Voraussichtliche Fertigzeit je Maschine im Moment der Zuteilung. null = Maschine war voll. */
export type Prognose = Record<string, number | null>;

export interface Zuteilung {
  auftrag: Auftrag;
  maschine: string;
  zugeteiltUm: number;
  prognose: Prognose;
}

export interface Ergebnis {
  auftrag: Auftrag;
  /** null = nicht verteilt */
  maschine: string | null;
  fertigUm: number | null;
  puenktlich: boolean;
  prognose: Prognose | null;
}
