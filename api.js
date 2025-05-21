// api.js
// Verantwortlich für die Kommunikation mit der Aladhan API zum Abrufen von Gebetszeiten und islamischem Datum.
// Unterstützt Standard-Methoden-IDs und Custom-Einstellungen (method=99) über methodSettings.
// Tune-Parameter ist hier auskommentiert.

import { getCurrentTime } from './timeUtils.js';
import {
    // Importiere die benötigten Konfigurationen
    methodSettingsParam, // Der String für method=99
     tuneOffsets,      // Tune ist hier auskommentiert, Import nicht nötig
} from './config.js';

/**
 * Ruft die Gebetszeiten von der API ab.
 * Verwendet method=99 mit dem methodSettings Parameter für Custom-Einstellungen.
 * Tune-Parameter ist auskommentiert.
 */
export function fetchPrayerTimes(lat, lon, method) {
    const currentDate = getCurrentTime();
    const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getFullYear()}`;

    // Basis-URL
    let apiUrl = `https://api.aladhan.com/v1/timings/${formattedDate}?latitude=${lat}&longitude=${lon}&method=${method}`;

    // --- KORRIGIERT: Füge methodSettings hinzu, wenn Methode 99 ist ---
    if (method === 99) {
        console.log('Verwende benutzerdefinierte Methode (99).');
        if (typeof methodSettingsParam !== 'undefined' && methodSettingsParam !== null && methodSettingsParam.trim() !== '') {
            apiUrl += `&methodSettings=${methodSettingsParam}`;
            console.log(` - Füge Parameter hinzu: &methodSettings=${methodSettingsParam}`);
        } else {
            console.warn(' - Methode 99 ist aktiv, aber methodSettingsParam ist nicht definiert oder leer in config.js!');
            // Die API wird wahrscheinlich ihre Standardwerte für Methode 99 verwenden (z.B. 15/15).
        }
    }
    // --- Ende Korrektur ---

    // --- Tune Parameter hinzufügen (AUSKOMMENTIERT) ---
    
    if (typeof tuneOffsets !== 'undefined' && tuneOffsets && tuneOffsets.trim() !== '') {
         apiUrl += `&tune=${tuneOffsets}`;
         console.log(` - Füge Parameter hinzu: &tune=${tuneOffsets}`);
    }
    
    // --- Ende Tune (AUSKOMMENTIERT) ---


    console.log('Finale API URL für Gebetszeiten:', apiUrl);
    console.log('Datum für API-Aufruf:', formattedDate);

    // Rest der fetch-Logik bleibt gleich...
    return fetch(apiUrl)
        .then((response) => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(`HTTP error! status: ${response.status}, message: ${text}`);
                });
            }
            return response.json();
        })
        .then((data) => {
            console.log('>>> API Antwort empfangen:', data); // Log zur Überprüfung der Antwort
            if (data.code === 200 && data.data && data.data.timings) {
                console.log('Gebetszeiten erfolgreich abgerufen:', data.data.timings);
                // Überprüfe hier die meta.params in der Konsole!
                if (data.data.meta && data.data.meta.method && data.data.meta.method.params) {
                    console.log('>>> API Meta Params:', data.data.meta.method.params);
                }
                return data.data.timings;
            } else {
                 const errorMessage = data.data || data.status || 'Unbekannter API Fehler.';
                 throw new Error(`API Error: ${errorMessage}`);
            }
        })
        .catch((error) => {
            console.error('Fehler beim Abrufen der Gebetszeiten:', error);
            throw error;
        });
}

// =========================================================================
// Die folgenden Funktionen zum Abrufen des islamischen Datums bleiben unverändert.
// =========================================================================

/**
 * Ruft das islamische Datum für ein gegebenes gregorianisches Datum ab.
 * @param {Date} date - Das gregorianische Datum.
 * @returns {Promise<object|null>} Ein Promise, das die Hijri-Daten oder null bei Fehler zurückgibt.
 */
export function fetchIslamicDateFor(date) {
    const formattedGregorianDate = `${date.getDate()}-${
        date.getMonth() + 1
    }-${date.getFullYear()}`;
    const apiUrl = `https://api.aladhan.com/v1/gToH?date=${formattedGregorianDate}`;

    // console.log(`API URL für islamisches Datum (${formattedGregorianDate}):`, apiUrl);

    return fetch(apiUrl)
        .then((response) => {
             if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} beim Abrufen des Hijri-Datums.`);
            }
            return response.json();
        })
        .then((data) => {
            if (data.code === 200 && data.data && data.data.hijri) {
                return data.data.hijri;
            } else {
                const errorMessage = data.data || data.status || 'Unbekannter Hijri API Fehler.';
                throw new Error(`Hijri API Error: ${errorMessage}`);
            }
        })
        .catch((error) => {
            console.error(
                `Fehler beim Abrufen des islamischen Datums (${formattedGregorianDate}):`,
                error
            );
            throw error;
        });
}

/**
 * Ruft das islamische Datum für das aktuelle Datum ab.
 * @returns {Promise<object|null>} Ein Promise, das die Hijri-Daten oder null bei Fehler zurückgibt.
 */
export function fetchCurrentIslamicDate() {
    return fetchIslamicDateFor(getCurrentTime());
}

/**
 * Ruft das islamische Datum für morgen ab.
 * @param {Date} today - Das heutige Datum als Referenz.
 * @returns {Promise<object|null>} Ein Promise, das die Hijri-Daten für morgen oder null bei Fehler zurückgibt.
 */
export function fetchIslamicDateForTomorrow(today) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return fetchIslamicDateFor(tomorrow);
}
