# Töne: Quellenliste

Das Spiel verwendet keine Tondateien. Alle Töne werden beim Spielen im Browser selbst erzeugt
(einfache Schwingungen, Code in `src/spiel/ton.ts`). Es gibt darum keine fremden Quellen und keine Lizenzen.

| Klang | Wann | Erzeugung |
|---|---|---|
| start | «Schicht starten» | zwei aufsteigende Rechtecktöne |
| zuteilen | Lauftasche zugeteilt | kurzer Dreieckton |
| abgelehnt | Maschine ist voll | tiefer Sägezahnton |
| puenktlich | Auftrag pünktlich fertig | zwei hohe aufsteigende Töne |
| verspaetet | Auftrag verspätet fertig | zwei tiefe absteigende Töne |
| schichtende | Schicht ist zu Ende | drei Dreiecktöne |
| bestleistung | neue Bestleistung | vier aufsteigende Töne |
