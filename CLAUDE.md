# Pixelart-Spiel «Druckerei», Version 1 (Produktionsleiter)

Diese Datei hält alle Regeln und Entscheide fest. Sie gilt für jede Arbeit an diesem Projekt.

## Für wen
Alexander: Drucktechnologe, Stv. Leiter Druck, Berufsschullehrer. Kein Programmierer.
Entscheide kurz und ohne Informatik-Jargon erklären.
Sprache: Schweizer Hochdeutsch, «ss» statt Eszett, Guillemets «», keine Gedankenstriche, Du-Form, Zahlen als 1'000.
Es spielen Alexander und später seine Lernenden (1. Lehrjahr, Medientechnologen EFZ Print).

## Ziel
Einfaches Pixelart-Spiel im Browser, am Mac und am iPhone, ohne Installation und ohne Anmeldung.
Bereich Produktionsleiter: Der Spieler sieht Lauftaschen und verteilt die Aufträge auf drei Maschinen: RA 76, SM 52, Digitaldruck.
Bereich Medientechnologe (seit 13.11.2026): Der Spieler überwacht am Leitstand Farbe und Passer im Fortdruck.

## Ablauf einer Runde
1. Eine Schicht dauert 180 Sekunden. In dieser Zeit kommen Lauftaschen. Danach kommen keine neuen, die Maschinen arbeiten im Zeitraffer fertig, dann folgt die Auswertung.
2. Lauftasche: Auflage in Exemplaren, Farbigkeit (4/0 oder 4/4), Liefertermin als Restzeit in Sekunden. Die Restzeit läuft ab dem Erscheinen sichtbar ab.
3. Zuteilen: Lauftasche antippen, dann Maschine antippen. Oder Lauftasche auf die Maschine ziehen.
4. Jede Maschine arbeitet ihre Warteschlange der Reihe nach ab: rüsten, dann drucken. Sichtbar pro Maschine: was läuft, was wartet, wie lange sie noch besetzt ist.
5. Eine Zuteilung lässt sich in Version 1 nicht zurücknehmen.
6. Vor dem Liefertermin fertig: Punkte. Zu spät: Abzug. Nicht verteilte Lauftasche am Schichtende: verspätet. Kosten spielen keine Rolle.
7. Auswertung: Punkte, Anzahl pünktlich, Anzahl verspätet. Pro verspäteten Auftrag: auf welcher Maschine er am frühesten fertig geworden wäre und um wie viele Sekunden. Dafür merkt sich das Spiel bei jeder Zuteilung die voraussichtliche Fertigzeit auf allen drei Maschinen, Wartezeit eingerechnet. Bei nicht verteilten Lauftaschen entfällt der Vergleich.

## Zahlenmodell (von Alexander bestätigt, NICHT ändern)
Massstab: 1 Spielsekunde entspricht 1 echten Minute.

| Maschine | Rüstzeit | Leistung bei 4/0 |
|---|---|---|
| Digitaldruck | 5 s | 50 Exemplare pro Sekunde |
| SM 52 | 15 s | 150 Exemplare pro Sekunde |
| RA 76 | 30 s | 400 Exemplare pro Sekunde |

Farbigkeit 4/4:
- SM 52 und RA 76: Schön- und Widerdruck in zwei Durchgängen. Rüstzeit und Laufzeit doppelt so lang wie bei 4/0.
- Digitaldruck: beidseitig in einem Durchgang. Rüstzeit gleich, Leistung 25 Exemplare pro Sekunde.

Formel: Dauer = Rüstzeit + Auflage geteilt durch Leistung. Die Logik rechnet mit Dezimalzahlen, die Anzeige rundet auf ganze Sekunden auf.

Kontrollwerte für die Tests (Toleranz 0,1 s):
- 4/0, 750 Exemplare: Digitaldruck 20 s, SM 52 20 s.
- 4/0, 3'600 Exemplare: SM 52 39 s, RA 76 39 s.
- 4/0, 10'000 Exemplare: RA 76 55 s.
- 4/4, 3'600 Exemplare: SM 52 78 s, RA 76 78 s.

Folge: Bei freien Maschinen ist bei 4/0 der Digitaldruck bis 750 Exemplare am schnellsten, die SM 52 von 750 bis 3'600, darüber die RA 76. Bei 4/4 liegt die erste Schwelle bei rund 940, die zweite bei 3'600.

## Startwerte (Einstelldatei, Alexander passt sie an)
1. Auflagen 100 bis 12'000 Exemplare, so gemischt, dass alle drei Maschinen gebraucht werden. Vorschlag: 30 Prozent klein (100 bis 750), 40 Prozent mittel (800 bis 3'600), 30 Prozent gross (3'650 bis 12'000), in Schritten von 50.
2. Etwa ein Drittel der Aufträge ist 4/4.
3. Alle 10 Sekunden eine neue Lauftasche (Alexanders erster Vorschlag: 8).
4. Liefertermin: schnellste mögliche Dauer bei freier Maschine mal 2, plus 30 Sekunden, ab Erscheinen (erster Vorschlag: plus 15).
5. Höchstens 3 wartende Aufträge pro Maschine und höchstens 4 offene Lauftaschen. Sind 4 offen, kommt keine neue, die Fristen laufen weiter.
6. Punkte: pünktlich plus 100, verspätet minus 50.
7. Zeitraffer nach Schichtende: 8-fach (Vorschlag).

Teil von M1: Ein automatischer Test spielt viele Schichten durch und teilt jede Lauftasche der Maschine mit der frühesten Fertigzeit zu. Ziel: 70 bis 90 Prozent pünktlich. Liegt der Wert ausserhalb: bessere Startwerte vorschlagen, ändern nur mit Alexanders Freigabe.

## Entscheide aus Rückfragen und Plan
| Datum | Entscheid |
|---|---|
| 12.11.2026 | Repository wird öffentlich, Veröffentlichung über GitHub Pages im Gratis-Konto. Alexander stellt es selbst um. |
| 12.11.2026 | Warteschlange: 1 Auftrag läuft, höchstens 3 warten. Volle Maschine lehnt die Zuteilung ab (blinkt rot), die Lauftasche bleibt offen. |
| 12.11.2026 | Auflösung 320 x 180 Spielpixel. Alles Antippbare mindestens 30 x 30 Spielpixel (deckt 44 Punkte am iPhone SE im Safari-Tab bei Faktor 3). |
| 12.11.2026 | Bei offenen Fragen gilt die empfohlene Antwort (Auftrag von Alexander). |
| 12.11.2026 | Annahme A: Genau zum Liefertermin fertig gilt als pünktlich. |
| 12.11.2026 | Annahme B: Bei 4/4 zeigen SM 52 und RA 76 vier Phasen: rüsten, Schöndruck, rüsten, Widerdruck. Gesamtdauer genau nach Zahlenmodell. |
| 12.11.2026 | Annahme C: Die Druckphase heisst im Spiel «Fortdruck». |
| 12.11.2026 | Annahme D: Reihenfolge von links nach rechts: Digitaldruck, SM 52, RA 76. |
| 12.11.2026 | Annahme E: Auflagen in Schritten von 50 Exemplaren. |
| 12.11.2026 | Annahme F: War eine Maschine bei der Zuteilung voll, fällt sie in der Auswertung aus dem Vergleich. |
| 12.11.2026 | Annahme G: War die gewählte Maschine schon die früheste, steht das in der Auswertung so. |
| 12.11.2026 | Sind 4 Lauftaschen offen, fällt der Takt aus. Abgelaufene Lauftaschen bleiben rot liegen und lassen sich weiter zuteilen. |
| 12.11.2026 | Zusätzliche Bibliothek: nur Vitest (Testwerkzeug, kommt nicht ins Spiel). |
| 12.11.2026 | Design: Variante 1 «Werkhalle» (hell, sachlich, Schrift Tiny5, Palette in `src/designs/varianten.ts`). Alexanders Wunsch dazu: «wie eine Druckerei halt», die Maschinen etwas realitätsgetreuer (umsetzen in M2). |
| 12.11.2026 | Alexander erlaubt das Übertragen auf «main» für die Veröffentlichung. |
| 12.11.2026 | Test der Startwerte: Mit Takt 8 und Zuschlag 15 waren nur 45 Prozent pünktlich. Über «empfohlen» umgestellt auf Takt 10 und Zuschlag 30 (rund 76 Prozent). Alexander kann zurückstellen: `daten/einstellungen.json`. Weitere geprüfte Paare: Takt 11 und Zuschlag 25 (80 Prozent), Takt 12 und Zuschlag 15 (82 Prozent). |
| 12.11.2026 | Alexander wünscht die drei Maschinen als Pixelart wie in Variante 1 statt Kästchen, etwas realitätsgetreuer. Umgesetzt (M2 vorgezogen): Offsetmaschinen von der Seite mit Leitstand, Auslage, vier Druckwerken, Anlagetisch und Anleger. Je zwei Bewegungsbilder für rüsten und drucken. |
| 12.11.2026 | Alexander wünscht eine schärfere, weniger pixelige Schrift. Umgesetzt: Barlow Semi Condensed (OFL), gezeichnet in der vollen Auflösung des Bildschirms. Die Grafik bleibt Pixelart mit ganzzahliger Skalierung ohne Kantenglättung. Das weicht bewusst von Regel 1 und 8 ab, nur für die Schrift. Einstellen in `src/spiel/hilfen.ts` (SCHRIFT). |
| 12.11.2026 | Alexander ordnet an: `public/schrift/pixelify-sans.woff2` löschen. Noch offen, weil die Mod «Arbeitsweise» das Löschen sperrt. |
| 12.11.2026 | Alexander wünscht ein Männchen, das die Lauftasche abholt, zur Maschine trägt und danach die nächste wartende holt. Umgesetzt: Jede Maschine hat einen Drucker (Figur). Er holt die zugeteilte Lauftasche am unteren Rand des Drucksaals und, wenn der nächste Auftrag startet, aus der Reihe unter der Maschine. Reine Darstellung: Die Zeiten des Zahlenmodells laufen unabhängig davon. |
| 12.11.2026 | M3: Bestleistung lokal mit Versionsnummer (`src/logik/bestleistung.ts`, Schlüssel `druckerei.bestleistung`). Töne selbst erzeugt, ohne Dateien (`src/spiel/ton.ts`), Schalter «Ton» auf dem Startbild. Home-Bildschirm über `public/manifest.webmanifest` und die Einträge in `index.html`. Kein Offline-Betrieb (nicht verlangt). |
| 13.11.2026 | Alexander ändert den Rahmen: Das Spiel heisst «Druckerei Wallimann» (sein Betrieb). Man wählt einen Bereich: Produktionsleiter (das bisherige Spiel) oder Medientechnologe. Regel 9 (fiktive Druckerei) gilt damit für den Namen nicht mehr. Herstellerlogos bleiben weg. |
| 13.11.2026 | Logo Wallimann: Alexander erlaubt, es von wallimann.ch zu holen. Der rote Schriftzug ist als Pixelart umgerechnet (`public/grafik/logo_wallimann.png`, 104 x 17, in `bilder.ts` als «vonHand» geführt, das Skript überschreibt es nicht). Die Originaldatei liegt nicht im Projekt. Es hängt als Firmenschild im Startbild. |
| 13.11.2026 | Eigene Arbeitsumgebung «drucksaal» mit Netzzugang zu wallimann.ch und noruschen.github.io (zum Prüfen der veröffentlichten Seite). |
| 13.11.2026 | Leitstand auf Alexanders Wunsch wie an der RA 76 gestaltet: Farbe auf dem Wallscreen (vier Streifen mit Tasten), Passer auf dem Monitor, davor das Pult mit Bogen, Messleiste und Steuerkreuz. Ohne Herstellerschriftzug. |
| 13.11.2026 | Maschinen nach Alexanders Fotos neu gezeichnet: RA 76 anthrazit mit hohen weissen Rahmen und schwarzem Glas auf dunklem Podest, Leitstand mit grossem Bildschirm. SM 52 silbern mit dunklem Sockel. Digitaldruck weiss mit dunkler Front. Farben in `MF` (`src/grafik/zeichnen.ts`). |
| 13.11.2026 | Neuer Bereich Medientechnologe (Leitstand im Fortdruck): Vier Farben (Cyan, Magenta, Yellow, Black) laufen vom Sollwert weg, Tasten für mehr und weniger Farbe. Passerkreuz Magenta unter dem Fadenzähler mit Steuerkreuz. Nur wenn alles in der Toleranz liegt, entstehen Gutbogen, sonst Makulatur. Logik in `src/logik/leitstand.ts`, Startwerte in `daten/leitstand.json` (Spielwerte, keine Fachwerte). Damit sind «Makulatur» und die Rolle am Leitstand aus der Liste «Später» vorgezogen. |
| 13.11.2026 | Bestleistung je Bereich getrennt gespeichert. |
| 12.11.2026 | Prüfhilfe: `?tempo=10` an der Adresse lässt die Schicht zehnmal so schnell laufen. |

Die Annahmen A bis G hat Alexander nicht einzeln bestätigt. Sie gelten über «empfohlen» und lassen sich ändern.

## Technik
1. Phaser 4.2.1, TypeScript, Vite. Tests mit Vitest.
2. Phaser-Befehle nie aus dem Gedächtnis schreiben. Quelle ist der Skills-Ordner im Paket: `node_modules/phaser/skills` (vorhanden, 28 Themen, darunter `v3-to-v4-migration`). Keine Befehle aus Phaser 3 ohne Prüfung in der Dokumentation von Version 4.
3. Veröffentlichung über GitHub Pages mit GitHub Actions (`.github/workflows/veroeffentlichen.yml`, startet bei Änderungen auf «main»). Basispfad in `vite.config.ts`: `/Drucksaal/`. Adresse: https://noruschen.github.io/Drucksaal/
4. Kein Server, keine Datenbank, keine Konten, keine Werbung, kein Tracking.
5. Entwickelt wird auf dem Zweig `claude/pixelart-druckerei-game-7bejba`.

## Regeln für das Spiel
1. Pixelart: feste interne Auflösung 320 x 180, ganzzahlige Skalierung, keine Kantenglättung.
2. Querformat. Die drei Maschinen stehen nebeneinander. Im Hochformat erscheint ein Hinweis zum Drehen.
3. Bedienung: Jede Aktion geht mit einem Finger (tippen, halten, ziehen). Tastatur und Maus sind nur Zusatz. Schaltflächen und Lauftasche am iPhone mindestens 44 Punkte, gemessen auf dem Bildschirm.
4. iPhone: Ton erst nach dem ersten Tippen. Zoomen (auch mit zwei Fingern), Scrollen und Textauswahl im Spiel abschalten, ein Eintrag im Seitenkopf allein reicht in Safari nicht. Notch und Home-Balken freihalten. Layout hält, wenn die Browserleiste ein- und ausfährt. Vollbild am iPhone nur über den Home-Bildschirm.
5. Spielstand: nur die Bestleistung, lokal, mit Versionsnummer. Zum Home-Bildschirm hinzufügbar. Kein Abgleich zwischen Geräten. Safari-Tab und Home-Bildschirm haben getrennte Speicher. Safari löscht lokal gespeicherte Daten einer Seite nach 7 Tagen Safari-Nutzung, an denen die Seite nicht benutzt wurde. Das Spiel auf dem Home-Bildschirm gehört nicht zu Safari und hat einen eigenen Zähler. Nachgeprüft am 12.11.2026 an Berichten zur WebKit-Ankündigung (Quellen von 2020 bis 2022, der Stand von 2026 ist nicht belegt). Daten gehen auch verloren, wenn man die Website-Daten in den Einstellungen löscht.
6. Daten: Zahlenmodell in `daten/maschinen.json`, Startwerte in `daten/einstellungen.json`. Nichts davon fest im Code.
7. Grafik: alle Grafiken selbst erzeugt als PNG in fester Farbpalette, per Skript im Projekt (`werkzeuge/`), austauschbar in `public/grafik/`, mit Bilderliste (Name, Grösse in Pixeln). Mindestens: Drucksaal, RA 76, SM 52, Digitaldruckmaschine (je steht, rüstet, druckt), Lauftasche, Symbole 4/0 und 4/4, Uhr, Schaltflächen.
8. Schrift: Jede Pixelschrift hat ä, ö, ü und Guillemets.
9. Inhalt: fiktive Druckerei, keine echten Kundennamen, keine Firmen- oder Herstellerlogos. Die Kürzel RA 76 und SM 52 sind erlaubt.
10. Fachbegriffe wie im Bildungsplan Medientechnologin/Medientechnologe EFZ (Lauftasche, Auflage, Rüstzeit, Fortdruck, Schön- und Widerdruck). Bei Unsicherheit Alexander fragen.
11. Töne nur selbst erzeugt oder CC0, mit Quellenliste (`public/ton/QUELLEN.md`).
12. Aufbau: Spiellogik (`src/logik/`: Dauer, Warteschlange, Termin, Punkte, Auswertung) getrennt von der Darstellung (`src/spiel/`). Die Logik hat automatische Tests, die Kontrollwerte gehören dazu.

## Arbeitsweise
- Meilensteine stehen in `MEILENSTEINE.md`. Nach jedem Meilenstein: Tests, Commit, veröffentlichen, Kurzbericht mit Link (was geht, was Alexander von Hand testet, Mac und iPhone getrennt, was nicht getestet werden konnte), dann STOPP bis «weiter».
- Später, nicht jetzt: Format der Aufträge, Kosten, Makulatur, Schwierigkeitsstufen, Rolle Drucker mit Minispielen (Passer, Farbe, Stapel). Nichts davon bauen, aber nicht verbauen.

## Nicht tun
1. Nichts löschen ohne Auftrag.
2. Keine zusätzlichen Bibliotheken ohne Rückfrage.
3. Nichts bauen, das nicht zum aktuellen Schritt oder Meilenstein gehört.
4. Das Zahlenmodell nicht ändern. Keine Fachwerte oder Fachbegriffe erfinden. Was fehlt, als fehlend melden.

## Ordner
```
index.html            Spielseite
designs.html          Testseite mit vier Designs
daten/                Zahlenmodell und Startwerte (ab M1)
src/logik/            Spiellogik ohne Phaser (ab M1)
src/spiel/            Darstellung mit Phaser
src/grafik/           Zeichenfunktionen der Pixelart (`zeichnen.ts`) und Liste der Bilder (`bilder.ts`)
src/designs/          Testseite: Varianten und Aufbau
tests/                automatische Tests
werkzeuge/            Skript für die PNG-Dateien (`grafik-erzeugen.ts`)
public/grafik/        PNG-Dateien und BILDERLISTE.md
public/schrift/       Pixelschriften mit LIZENZEN.md
public/ton/           Töne mit QUELLEN.md (ab M3)
```

## Befehle
- `npm run dev`: lokal starten
- `npm test`: Tests
- `npm run build`: bauen (prüft auch den Code)
- `npm run grafik`: alle PNG-Dateien in `public/grafik/` neu erzeugen, samt `BILDERLISTE.md`
- `VITE_ERKUNDUNG=1 npx vitest run tests/startwerte-erkundung.test.ts`: Startwerte durchspielen und Alternativen vergleichen
