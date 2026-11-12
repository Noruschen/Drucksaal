import { defineConfig } from 'vite';

// Der Basispfad muss genau dem Namen des Repositorys entsprechen
// (Gross- und Kleinschreibung zählt), sonst bleibt die Seite bei GitHub Pages weiss.
export default defineConfig({
  base: '/Drucksaal/',
  build: {
    rollupOptions: {
      input: {
        spiel: 'index.html',
        designs: 'designs.html',
      },
    },
  },
});
