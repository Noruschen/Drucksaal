import maschinenDatei from '../../daten/maschinen.json';
import einstellungenDatei from '../../daten/einstellungen.json';
import type { Einstellungen, Zahlenmodell } from './typen';

export const ZAHLENMODELL: Zahlenmodell = maschinenDatei as Zahlenmodell;
export const EINSTELLUNGEN: Einstellungen = einstellungenDatei as Einstellungen;
