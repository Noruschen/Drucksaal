# Bilderliste

Alle Bilder liegen in diesem Ordner als PNG mit transparentem Hintergrund, ohne Kantenglättung.
Erzeugt mit `npm run grafik` aus `src/grafik/bilder.ts` und `src/grafik/zeichnen.ts`.

Ein Bild selbst zeichnen: PNG mit gleichem Namen und gleicher Grösse in diesen Ordner legen
und in `src/grafik/bilder.ts` beim Bild `vonHand: true` eintragen. Dann überschreibt das Skript es nicht mehr.
Die Maschinen stehen unten in der Mitte des Bildes, die unterste Pixelreihe ist der Schatten am Boden.

| Datei | Grösse in Pixeln | Inhalt | Herkunft |
|---|---|---|---|
| drucksaal.png | 320 x 109 | Drucksaal als Hintergrund: Wand mit Fensterband, Boden mit gelber Markierung | Skript |
| digital_steht_1.png | 102 x 48 | Digitaldruckmaschine, steht | Skript |
| digital_ruestet_1.png | 102 x 48 | Digitaldruckmaschine, rüstet, Bewegungsbild 1 von 2 | Skript |
| digital_ruestet_2.png | 102 x 48 | Digitaldruckmaschine, rüstet, Bewegungsbild 2 von 2 | Skript |
| digital_druckt_1.png | 102 x 48 | Digitaldruckmaschine, druckt, Bewegungsbild 1 von 2 | Skript |
| digital_druckt_2.png | 102 x 48 | Digitaldruckmaschine, druckt, Bewegungsbild 2 von 2 | Skript |
| sm52_steht_1.png | 102 x 48 | SM 52, steht | Skript |
| sm52_ruestet_1.png | 102 x 48 | SM 52, rüstet, Bewegungsbild 1 von 2 | Skript |
| sm52_ruestet_2.png | 102 x 48 | SM 52, rüstet, Bewegungsbild 2 von 2 | Skript |
| sm52_druckt_1.png | 102 x 48 | SM 52, druckt, Bewegungsbild 1 von 2 | Skript |
| sm52_druckt_2.png | 102 x 48 | SM 52, druckt, Bewegungsbild 2 von 2 | Skript |
| ra76_steht_1.png | 102 x 48 | RA 76, steht | Skript |
| ra76_ruestet_1.png | 102 x 48 | RA 76, rüstet, Bewegungsbild 1 von 2 | Skript |
| ra76_ruestet_2.png | 102 x 48 | RA 76, rüstet, Bewegungsbild 2 von 2 | Skript |
| ra76_druckt_1.png | 102 x 48 | RA 76, druckt, Bewegungsbild 1 von 2 | Skript |
| ra76_druckt_2.png | 102 x 48 | RA 76, druckt, Bewegungsbild 2 von 2 | Skript |
| lauftasche.png | 76 x 48 | Lauftasche | Skript |
| lauftasche_gewaehlt.png | 76 x 48 | Lauftasche, angetippt (blauer Rand) | Skript |
| lauftasche_spaet.png | 76 x 48 | Lauftasche, Liefertermin abgelaufen (rötlich) | Skript |
| symbol_4-0.png | 17 x 9 | Symbol Farbigkeit 4/0: Schöndruckseite bedruckt, Rückseite leer | Skript |
| symbol_4-4.png | 17 x 9 | Symbol Farbigkeit 4/4: beide Seiten bedruckt | Skript |
| uhr_hell.png | 9 x 9 | Uhr, hell (für die dunkle Kopfleiste) | Skript |
| uhr_dunkel.png | 9 x 9 | Uhr, dunkel (für die Lauftasche) | Skript |
| schaltflaeche_start.png | 120 x 32 | Schaltfläche «Schicht starten» | Skript |
| schaltflaeche_nochmals.png | 110 x 30 | Schaltfläche «Nochmals» (grün) | Skript |
| schaltflaeche_blaettern.png | 70 x 30 | Schaltfläche «Zurück» und «Weiter» | Skript |
| schaltflaeche_blaettern_aus.png | 70 x 30 | Schaltfläche «Zurück» und «Weiter», nicht wählbar (grau) | Skript |

## Farbpalette «Werkhalle»

`#1aa7e0` `#20242e` `#2678a3` `#2b3445` `#3fa7d6` `#49b35a` `#56657a` `#7b8695` `#8d98a6` `#8fd3f0` `#9eadbd` `#c9d3dd` `#cfd3d0` `#d93a8a` `#d94a3d` `#e6ebf0` `#eaf4fb` `#f2a530` `#f2c230` `#f4d51e` `#fbfbf6` `#ffffff`

Zusatzfarben für einzelne Zustände (abgelaufene Lauftasche, grüne und graue Schaltfläche): `#2f8540` `#3d4a5e` `#7c8aa0` `#8fd69b` `#f6c9c2`
