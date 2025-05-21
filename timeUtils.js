// timeUtils.js
// Enthält Hilfsfunktionen zur Zeitberechnung und -formatierung.

import { useOverrideDate, overrideDate, useOverrideTime, overrideTime, overrideTimeSetAt } from './debug.js';
import { timeOffset } from './main.js'; // Importiere timeOffset aus main.js

/**
 * Gibt die aktuelle Zeit zurück (Echtzeit oder Testzeit).
 * @returns {Date} Das aktuelle Date-Objekt.
 */
export function getCurrentTime() {
    let baseDate;

    if (useOverrideDate && overrideDate) {
        baseDate = new Date(overrideDate);
    } else {
        baseDate = new Date();
    }

    if (useOverrideTime && overrideTime && overrideTimeSetAt) {
        const realElapsedMs = new Date().getTime() - overrideTimeSetAt.getTime();
        baseDate.setHours(overrideTime.getHours());
        baseDate.setMinutes(overrideTime.getMinutes());
        baseDate.setSeconds(overrideTime.getSeconds());
        return new Date(baseDate.getTime() + realElapsedMs);
    } else {
        if (useOverrideDate) {
            const now = new Date();
            baseDate.setHours(
                now.getHours(),
                now.getMinutes(),
                now.getSeconds(),
                now.getMilliseconds()
            );
        }
        // Wende den globalen Zeitoffset an
        return new Date(baseDate.getTime() - timeOffset);
    }
}

/**
 * Parst einen Zeitstring (HH:MM) und gibt ein Date-Objekt zurück.
 * @param {string} timeString - Der Zeitstring im Format HH:MM.
 * @param {Date} [dateContext=new Date()] - Das Datum, auf das die Zeit angewendet werden soll.
 * @returns {Date|null} Das Date-Objekt oder null bei einem Fehler.
 */
export function parsePrayerTime(timeString, dateContext = new Date()) {
    if (
        !timeString ||
        typeof timeString !== 'string' ||
        !timeString.includes(':')
    ) {
        console.warn(`Ungültiger Zeitstring für parsePrayerTime: ${timeString}`);
        return null;
    }
    try {
        const parts = timeString.split(':');
        if (parts.length < 2) {
            console.warn(`Ungültiges Format in Zeitstring: ${timeString}`);
            return null;
        }
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        if (
            isNaN(hours) ||
            isNaN(minutes) ||
            hours < 0 ||
            hours > 23 ||
            minutes < 0 ||
            minutes > 59
        ) {
            console.warn(`Ungültige Stunden/Minuten in Zeitstring: ${timeString}`);
            return null;
        }
        const date = new Date(dateContext);
        date.setHours(hours, minutes, 0, 0);
        return date;
    } catch (e) {
        console.error(`Fehler beim Parsen des Zeitstrings "${timeString}":`, e);
        return null;
    }
}

/**
 * Berechnet die Endzeit des Adhan basierend auf der Startzeit und Dauer.
 * @param {object} prayerConfig - Das Konfigurationsobjekt des Gebets.
 * @param {Date} prayerStartDate - Die Startzeit des Gebets.
 * @returns {Date} Die Endzeit des Adhan.
 */
export function getAdhanEndTime(prayerConfig, prayerStartDate) {
    if (
        !prayerConfig ||
        !prayerStartDate ||
        prayerConfig.adhanDurationMinutes === 0
    ) {
        return prayerStartDate; // Keine Dauer, Endzeit = Startzeit
    }
    const endDate = new Date(prayerStartDate.getTime());
    endDate.setMinutes(
        endDate.getMinutes() + prayerConfig.adhanDurationMinutes
    );
    return endDate;
}
