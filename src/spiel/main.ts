import Phaser from 'phaser';
import { BREITE, FARBEN, HOEHE, SCHRIFT } from './hilfen';
import { AuswertungSzene, SchichtSzene, StartSzene } from './szenen';

// Phaser-Befehle nach dem Skills-Ordner im Paket (node_modules/phaser/skills, Version 4.2.1):
// game-setup-and-config, scale-and-responsive, scenes, text-and-bitmaptext,
// graphics-and-shapes, input-keyboard-mouse-touch.

const platz = document.getElementById('platz')!;
const spielfeld = document.getElementById('spiel')!;
let spiel: Phaser.Game | null = null;

/**
 * Ganzzahlige Skalierung in echten Bildpunkten des Geräts: Das Spielfeld bekommt
 * genau die Grösse 320 x 180 mal Faktor. Phaser füllt dieses Feld dann exakt aus.
 */
function passeGroesseAn(): void {
  const dpr = window.devicePixelRatio || 1;
  const feld = platz.getBoundingClientRect();
  let faktor = Math.floor(Math.min((feld.width * dpr) / BREITE, (feld.height * dpr) / HOEHE));
  // Sehr kleine Fenster: lieber unscharf verkleinern als abschneiden.
  if (faktor < 1) faktor = Math.min((feld.width * dpr) / BREITE, (feld.height * dpr) / HOEHE);
  spielfeld.style.width = `${(BREITE * faktor) / dpr}px`;
  spielfeld.style.height = `${(HOEHE * faktor) / dpr}px`;
  spiel?.scale.refresh();
}

/** iPhone: Zoomen, Scrollen und Textauswahl im Spiel abschalten. */
function sperreGesten(): void {
  const stopp = (e: Event): void => e.preventDefault();
  for (const name of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick', 'contextmenu', 'selectstart']) {
    document.addEventListener(name, stopp, { passive: false });
  }
  document.addEventListener('touchmove', stopp, { passive: false });
  // Doppeltippen zoomt in Safari: zweites Tippen innert 300 ms nicht als Zoom werten.
  let letztesEnde = 0;
  document.addEventListener(
    'touchend',
    (e) => {
      const jetzt = Date.now();
      if (jetzt - letztesEnde < 300) e.preventDefault();
      letztesEnde = jetzt;
    },
    { passive: false },
  );
}

async function start(): Promise<void> {
  sperreGesten();
  const datei = new FontFace(SCHRIFT.familie, `url(${import.meta.env.BASE_URL}schrift/${SCHRIFT.datei})`);
  try {
    await datei.load();
    document.fonts.add(datei);
  } catch {
    // Ohne Pixelschrift läuft das Spiel mit der Ersatzschrift weiter.
  }
  passeGroesseAn();
  spiel = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'spiel',
    backgroundColor: FARBEN.leiste,
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.NO_CENTER,
      width: BREITE,
      height: HOEHE,
      expandParent: false,
    },
    scene: [StartSzene, SchichtSzene, AuswertungSzene],
  });
  window.addEventListener('resize', passeGroesseAn);
  window.addEventListener('orientationchange', () => setTimeout(passeGroesseAn, 200));
  window.visualViewport?.addEventListener('resize', passeGroesseAn);
}

void start();
