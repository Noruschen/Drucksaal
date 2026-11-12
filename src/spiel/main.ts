import Phaser from 'phaser';

// Leeres Gerüst (Schritt 3). Das Spiel selbst entsteht ab Meilenstein M1.
// Befehle nach dem Skills-Ordner im Phaser-Paket (node_modules/phaser/skills),
// Version 4.2.1: game-setup-and-config und scale-and-responsive.

class Geruest extends Phaser.Scene {
  create(): void {
    this.add.rectangle(160, 90, 300, 160, 0x2f3a52);
    this.add.text(160, 90, 'Druckerei: Gerüst steht', { fontSize: '12px', color: '#ffffff' }).setOrigin(0.5);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'spiel',
  backgroundColor: '#1b1f2a',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 320,
    height: 180,
    zoom: Phaser.Scale.MAX_ZOOM,
  },
  scene: Geruest,
});
