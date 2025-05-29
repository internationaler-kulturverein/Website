// api.js
// Verantwortlich für die Kommunikation mit der Aladhan API zum Abrufen von Gebetszeiten und islamischem Datum.

import { getCurrentTime } from './timeUtils.js';
import {
    methodSettingsParam,
    tuneOffsets,
} from './config.js';

/**
 * Ruft die Gebetszeiten von der API ab.
 */
export function fetchPrayerTimes(lat, lon, method) {
    const currentDate = getCurrentTime(); // Nimmt ggf. timeOffset aus main.js
    const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getFullYear()}`;

    let apiUrl = `https://api.aladhan.com/v1/timings/${formattedDate}?latitude=${lat}&longitude=${lon}&method=${method}`;

    if (method === 99) {
        // console.log('Verwende benutzerdefinierte Methode (99).'); // Optionales Logging
        if (typeof methodSettingsParam !== 'undefined' && methodSettingsParam !== null && methodSettingsParam.trim() !== '') {
            apiUrl += `&methodSettings=${methodSettingsParam}`;
        }
    }
    if (typeof tuneOffsets !== 'undefined' && tuneOffsets && tuneOffsets.trim() !== '') {
         apiUrl += `&tune=${tuneOffsets}`;
    }

    // console.log('Finale API URL für Gebetszeiten:', apiUrl); // Optionales Logging

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
            if (data.code === 200 && data.data && data.data.timings) {
                return data.data.timings;
            } else {
                 const errorMessage = data.data || data.status || 'Unbekannter API Fehler.';
                 throw new Error(`API Error: ${errorMessage}`);
            }
        })
        .catch((error) => {
            console.error('Fehler beim Abrufen der Gebetszeiten:', error);
            throw error; // Wichtig, damit der Aufrufer den Fehler behandeln kann
        });
}

/**
 * Ruft das islamische Datum für ein gegebenes gregorianisches Datum von der API ab.
 * @param {Date} date - Das gregorianische Datum.
 * @returns {Promise<object|null>}
 */
export function fetchIslamicDateFor(date) {
    const formattedGregorianDate = `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
    const apiUrl = `https://api.aladhan.com/v1/gToH?date=${formattedGregorianDate}`;

    return fetch(apiUrl)
        .then((response) => {
             if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} beim Abrufen des Hijri-Datums.`);
            }
            return response.json();
        })
        .then((data) => {
            if (data.code === 200 && data.data && data.data.hijri) {
                // Füge eine 'source'-Eigenschaft hinzu, um die Herkunft zu kennzeichnen
                return { ...data.data.hijri, source: 'api' };
            } else {
                const errorMessage = data.data || data.status || 'Unbekannter Hijri API Fehler.';
                throw new Error(`Hijri API Error: ${errorMessage}`);
            }
        })
        .catch((error) => {
            console.error(`Fehler beim Abrufen des islamischen Datums für ${formattedGregorianDate}:`, error);
            throw error;
        });
}

/**
 * Ruft das islamische Datum für das aktuelle Datum von der API ab.
 * @returns {Promise<object|null>}
 */
export function fetchCurrentIslamicDate() {
    return fetchIslamicDateFor(getCurrentTime());
}

/**
 * Ruft das islamische Datum für morgen von der API ab.
 * @param {Date} today - Das heutige Datum als Referenz.
 * @returns {Promise<object|null>}
 */
export function fetchIslamicDateForTomorrow(today) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return fetchIslamicDateFor(tomorrow);
}
