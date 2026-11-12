import { tonAn } from './speicher';

// Alle Töne werden im Browser selbst erzeugt (einfache Schwingungen). Es gibt keine Tondateien.
// Am iPhone darf Ton erst nach dem ersten Tippen starten: Der Tonausgang wird beim ersten Tippen geöffnet.

type Klang = 'start' | 'zuteilen' | 'abgelehnt' | 'puenktlich' | 'verspaetet' | 'schichtende' | 'bestleistung';

let ausgang: AudioContext | null = null;

function oeffne(): void {
  try {
    if (!ausgang) {
      const Bauart = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Bauart) return;
      ausgang = new Bauart();
    }
    // Auch nach einer Unterbrechung (Anruf, anderer Tab) wieder aufwecken.
    if (ausgang.state !== 'running') void ausgang.resume().catch(() => undefined);
  } catch {
    ausgang = null;
  }
}

/** Beim ersten Tippen den Tonausgang öffnen. */
export function bereiteTonVor(): void {
  for (const name of ['pointerdown', 'touchend', 'keydown']) document.addEventListener(name, oeffne, { passive: true });
}

function ton(frequenz: number, beginn: number, dauer: number, form: OscillatorType = 'square', lautstaerke = 0.06): void {
  if (!ausgang) return;
  const jetzt = ausgang.currentTime + beginn;
  const schwinger = ausgang.createOscillator();
  const regler = ausgang.createGain();
  schwinger.type = form;
  schwinger.frequency.setValueAtTime(frequenz, jetzt);
  regler.gain.setValueAtTime(lautstaerke, jetzt);
  regler.gain.exponentialRampToValueAtTime(0.0001, jetzt + dauer);
  schwinger.connect(regler).connect(ausgang.destination);
  schwinger.start(jetzt);
  schwinger.stop(jetzt + dauer + 0.02);
}

/** Spielt einen Klang. Ein Fehler beim Ton darf das Spiel nie stoppen. */
export function spiele(klang: Klang): void {
  try {
    spieleUngesichert(klang);
  } catch {
    // Ohne Ton weiterspielen.
  }
}

function spieleUngesichert(klang: Klang): void {
  if (!tonAn() || !ausgang || ausgang.state !== 'running') return;
  switch (klang) {
    case 'start':
      ton(523, 0, 0.1);
      ton(784, 0.1, 0.16);
      break;
    case 'zuteilen':
      ton(660, 0, 0.06, 'triangle', 0.09);
      break;
    case 'abgelehnt':
      ton(140, 0, 0.18, 'sawtooth', 0.05);
      break;
    case 'puenktlich':
      ton(880, 0, 0.08);
      ton(1175, 0.08, 0.14);
      break;
    case 'verspaetet':
      ton(247, 0, 0.12);
      ton(185, 0.12, 0.22);
      break;
    case 'schichtende':
      ton(392, 0, 0.18, 'triangle', 0.1);
      ton(392, 0.22, 0.18, 'triangle', 0.1);
      ton(294, 0.44, 0.4, 'triangle', 0.1);
      break;
    case 'bestleistung':
      [523, 659, 784, 1047].forEach((f, i) => ton(f, i * 0.1, 0.16));
      break;
  }
}
