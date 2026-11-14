import Phaser from 'phaser';
import startDatei from '../../daten/start.json';
import { FAHNENMAST, GEBAEUDE, LASTWAGEN_BREITE, LASTWAGEN_HOEHE } from '../grafik/zeichnen.ts';
import { BREITE, FARBEN, HOEHE, Maler, ansicht, bild, richteAus, schrift, setzeBild, trifft, type Rechteck } from './hilfen';
import { spiele } from './ton';

// Startbildschirm: Firmengebäude von aussen. (Der frühere Startbildschirm ist mit ?start=alt erreichbar.)
// Alle paar Sekunden fährt der Lastwagen vorbei. «Beruf auswählen» führt durch die Eingangstür
// in die Firma und blendet zur Berufswahl über. Reine Darstellung, ohne Spielwerte.

type Bildobjekt = Phaser.GameObjects.Image;

// Vorschau: Mit ?fahne=neu in der Adresse stehen Baum und Fahnenmast weiter links, am Mast weht die rote Fahne.
const MIT_FAHNE = new URLSearchParams(window.location.search).get('fahne') === 'neu';
/** Bewegungsbilder der Fahne pro Sekunde */
const FAHNE_TAKT = 6;

/** Farbe der Überblendung: gleich beim Ausblenden hier und beim Einblenden der Berufswahl */
export const BLENDE = '#fbfbf6';
const K_BERUF: Rechteck = { x: 100, y: 146, b: 120, h: 32 };
/** Die Räder des Lastwagens stehen auf dieser Höhe der Strasse */
const STRASSE_Y = 142;
/** So stark wird am Ende auf die Tür vergrössert */
const ZOOM_ENDE = 9;

export class StartNeuSzene extends Phaser.Scene {
  private lastwagen!: Bildobjekt;
  /** Zeit bis zur nächsten Fahrt, in Sekunden */
  private bisFahrt = 0;
  private faehrt = false;
  private lastwagenX = 0;
  /** Fortschritt des Eintritts in Sekunden, null = noch nicht gestartet */
  private eintritt: number | null = null;
  private vorn!: Maler;
  private ausblenden: Phaser.GameObjects.GameObject[] = [];
  private fahne: Bildobjekt | null = null;
  private lauf = 0;

  constructor() {
    super('StartNeu');
  }

  create(): void {
    this.eintritt = null;
    this.faehrt = false;
    this.bisFahrt = startDatei.lastwagenErsteFahrt;

    bild(this, 0, 0, MIT_FAHNE ? 'firmengebaeude_fahne' : 'firmengebaeude', 0);
    this.fahne = MIT_FAHNE ? bild(this, FAHNENMAST.x + 2, FAHNENMAST.y - 2, 'fahne_1', 1) : null;
    this.lauf = 0;
    // Firmenschild an der Fassade
    const schild = new Maler(this.add.graphics().setDepth(1));
    schild.r(190, 60, 112, 23, FARBEN.umriss);
    schild.r(191, 61, 110, 21, FARBEN.papier);
    bild(this, 194, 63, 'logo_wallimann', 2);

    this.lastwagen = bild(this, -LASTWAGEN_BREITE, STRASSE_Y - LASTWAGEN_HOEHE, 'lastwagen_links', 3).setVisible(false);
    const knopf = bild(this, K_BERUF.x, K_BERUF.y, 'schaltflaeche_start', 4);
    const knopfText = schrift(this, 160, 155, 'Beruf auswählen', FARBEN.knopfText, 'mitte', 10);
    const titel = schrift(this, 160, 4, 'Druckerei Wallimann', FARBEN.umriss, 'mitte', 12);
    this.ausblenden = [knopf, knopfText, titel];
    this.vorn = new Maler(this.add.graphics().setDepth(8));
    richteAus(this);
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.eintritt === null && trifft(K_BERUF, p.worldX, p.worldY)) {
        spiele('start');
        this.eintritt = 0;
        // Schrift und Schaltfläche verschwinden, damit beim Vergrössern nichts unscharf wird.
        for (const objekt of this.ausblenden) (objekt as Bildobjekt).setVisible(false);
      }
    });
  }

  update(_zeit: number, delta: number): void {
    const dt = Math.min(delta, 100) / 1000;
    this.bewegeLastwagen(dt);
    this.lauf += dt;
    if (this.fahne) setzeBild(this.fahne, `fahne_${(Math.floor(this.lauf * FAHNE_TAKT) % 4) + 1}`);
    if (this.eintritt === null) return;
    this.eintritt += dt;
    const anteil = Math.min(1, this.eintritt / startDatei.eintrittDauer);
    this.zeichneEintritt(anteil);
    if (anteil >= 1) this.scene.start('Berufswahl', { nummer: 0, einblenden: true });
  }

  private bewegeLastwagen(dt: number): void {
    // Die Zeit bis zur nächsten Fahrt läuft immer, genau einmal pro Bild.
    this.bisFahrt -= dt;
    if (!this.faehrt) {
      if (this.bisFahrt > 0) return;
      this.faehrt = true;
      this.lastwagenX = BREITE;
      // Die nächste Fahrt beginnt im festen Abstand zum Start dieser Fahrt.
      this.bisFahrt += startDatei.lastwagenAlle;
      this.lastwagen.setVisible(true);
    }
    this.lastwagenX -= startDatei.lastwagenTempo * dt; // von rechts nach links
    // Leichtes Wippen beim Fahren
    const wippen = Math.floor(this.lastwagenX / 6) % 2 === 0 ? 0 : 1;
    this.lastwagen.setPosition(Math.round(this.lastwagenX), STRASSE_Y - LASTWAGEN_HOEHE - wippen);
    if (this.lastwagenX < -LASTWAGEN_BREITE) {
      this.faehrt = false;
      this.lastwagen.setVisible(false);
    }
  }

  /** Gang durch die Eingangstür: Die Tür geht auf, die Kamera fährt hinein, am Schluss blendet das Bild hell über. */
  private zeichneEintritt(anteil: number): void {
    const t = GEBAEUDE.tuer;
    const m = this.vorn;
    m.leeren();
    // Tür: Die beiden Flügel schieben sich zur Seite, dahinter ist es hell.
    const offen = Math.min(1, anteil / 0.35);
    const breite = Math.round(t.b * offen);
    m.r(t.x + (t.b - breite) / 2, t.y, breite, t.h, BLENDE);
    // Kamera: weich beschleunigen, Ausschnitt bleibt im Bild
    const weich = anteil * anteil * (3 - 2 * anteil);
    const zoom = 1 + (ZOOM_ENDE - 1) * weich * weich;
    const halbB = BREITE / 2 / zoom;
    const halbH = HOEHE / 2 / zoom;
    const zielX = t.x + t.b / 2;
    const zielY = t.y + t.h / 2 + 1;
    const kamera = this.cameras.main;
    kamera.setZoom(ansicht.faktor * zoom);
    kamera.centerOn(Math.max(halbB, Math.min(BREITE - halbB, zielX)), Math.max(halbH, Math.min(HOEHE - halbH, zielY)));
    // Überblendung in der zweiten Hälfte
    const blende = Math.max(0, (anteil - 0.55) / 0.45);
    if (blende > 0) m.r(0, 0, BREITE, HOEHE, BLENDE, blende);
  }
}
