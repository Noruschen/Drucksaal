import maschinenDatei from '../../daten/maschinen.json';
import einstellungenDatei from '../../daten/einstellungen.json';
import leitstandDatei from '../../daten/leitstand.json';
import type { LeitstandEinstellungen } from './leitstand';
import vorstufeDatei from '../../daten/vorstufe.json';
import type { VorstufeEinstellungen } from './vorstufe';
import ausruestungDatei from '../../daten/ausruestung.json';
import type { AusruestungEinstellungen } from './ausruestung';
import type { Einstellungen, Zahlenmodell } from './typen';

export const ZAHLENMODELL: Zahlenmodell = maschinenDatei as Zahlenmodell;
export const EINSTELLUNGEN: Einstellungen = einstellungenDatei as Einstellungen;
export const LEITSTAND: LeitstandEinstellungen = leitstandDatei as LeitstandEinstellungen;
export const VORSTUFE: VorstufeEinstellungen = vorstufeDatei as VorstufeEinstellungen;
export const AUSRUESTUNG: AusruestungEinstellungen = ausruestungDatei as AusruestungEinstellungen;
