import Phaser from 'phaser';
import { BREITE, FARBEN, HOEHE, SCHRIFT, ansicht } from './hilfen';
import { bereiteTonVor } from './ton';
import { AuswertungSzene, BerufswahlSzene, EinfuehrungSzene, LadeSzene, SchichtSzene, StartSzene } from './szenen';
import { VorstufeAuswertungSzene, VorstufeSzene } from './vorstufeSzenen';
import { LeitstandAuswertungSzene, LeitstandSzene } from './leitstandSzenen';

// Phaser-Befehle nach dem Skills-Ordner im Paket (node_modules/phaser/skills, Version 4.2.1):
// game-setup-and-config, scale-and-responsive, scenes, cameras, text-and-bitmaptext,
// graphics-and-shapes, sprites-and-images, loading-assets, input-keyboard-mouse-touch.

const platz = document.getElementById('platz')!;
const spielfeld = document.getElementById('spiel')!;
let spiel: Phaser.Game | null = null;

/**
 * Ganzzahlige Skalierung in echten Bildpunkten des Geräts.
 * Die Zeichenfläche hat genau 320 x 180 mal Faktor Bildpunkte. Die Pixelart wird um den
 * ganzen Faktor vergrössert (ohne Kantenglättung), die Schrift in voller Auflösung gezeichnet.
 */
function berechne(): { faktor: number; zoom: number } {
  const dpr = window.devicePixelRatio || 1;
  const feld = platz.getBoundingClientRect();
  const genau = Math.min((feld.width * dpr) / BREITE, (feld.height * dpr) / HOEHE);
  const faktor = Math.max(1, Math.floor(genau));
  // Sehr kleine Fenster (Faktor unter 1): lieber verkleinern als abschneiden.
  const zoom = genau >= 1 ? 1 / dpr : genau / dpr;
  return { faktor, zoom };
}

function passeGroesseAn(): void {
  const { faktor, zoom } = berechne();
  ansicht.faktor = faktor;
  spielfeld.style.width = `${BREITE * faktor * zoom}px`;
  spielfeld.style.height = `${HOEHE * faktor * zoom}px`;
  if (!spiel) return;
  spiel.scale.setZoom(zoom);
  spiel.scale.resize(BREITE * faktor, HOEHE * faktor);
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
  bereiteTonVor();
  const datei = new FontFace(SCHRIFT.familie, `url(${import.meta.env.BASE_URL}schrift/${SCHRIFT.datei})`);
  try {
    await datei.load();
    document.fonts.add(datei);
  } catch {
    // Ohne die Schriftdatei läuft das Spiel mit der Ersatzschrift des Geräts weiter.
  }
  const { faktor, zoom } = berechne();
  ansicht.faktor = faktor;
  spielfeld.style.width = `${BREITE * faktor * zoom}px`;
  spielfeld.style.height = `${HOEHE * faktor * zoom}px`;
  spiel = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'spiel',
    backgroundColor: FARBEN.leiste,
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.NONE,
      width: BREITE * faktor,
      height: HOEHE * faktor,
      zoom,
      expandParent: false,
    },
    scene: [LadeSzene, StartSzene, BerufswahlSzene, EinfuehrungSzene, SchichtSzene, AuswertungSzene, LeitstandSzene, LeitstandAuswertungSzene, VorstufeSzene, VorstufeAuswertungSzene],
  });
  window.addEventListener('resize', passeGroesseAn);
  window.addEventListener('orientationchange', () => setTimeout(passeGroesseAn, 200));
  window.visualViewport?.addEventListener('resize', passeGroesseAn);
}

void start();
