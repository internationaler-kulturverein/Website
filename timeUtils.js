// timeUtils.js
// Enthält Hilfsfunktionen zur Zeitberechnung und -formatierung.

import {
    useOverrideDate,
    overrideDate,
    useOverrideTime,
    overrideTime,
    overrideTimeSetAt,
} from './debug.js'; // Annahme: Diese Datei existiert und exportiert die Variablen
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
        const realElapsedMs =
            new Date().getTime() - overrideTimeSetAt.getTime();
        baseDate.setHours(overrideTime.getHours());
        baseDate.setMinutes(overrideTime.getMinutes());
        baseDate.setSeconds(overrideTime.getSeconds());
        // Wende den Zeitunterschied seit dem Setzen der Override-Zeit an
        return new Date(baseDate.getTime() + realElapsedMs);
    } else {
        if (useOverrideDate) {
            // Wenn nur overrideDate gesetzt ist, aber nicht overrideTime,
            // nimm das Datum von overrideDate und die aktuelle Uhrzeit des Systems.
            const now = new Date(); // Aktuelle Systemzeit für H, M, S
            baseDate.setHours(
                now.getHours(),
                now.getMinutes(),
                now.getSeconds(),
                now.getMilliseconds()
            );
        }
        // Wende den globalen Zeitoffset an, falls vorhanden und eine Zahl
        const offset = typeof timeOffset === 'number' ? timeOffset : 0;
        return new Date(baseDate.getTime() - offset);
    }
}

/**
 * Parst einen Zeitstring (HH:MM) und gibt ein Date-Objekt zurück.
 * @param {string} timeString - Der Zeitstring im Format HH:MM.
 * @param {Date} [dateContextParam] - Das Datum, auf das die Zeit angewendet werden soll.
 *                                    Standard ist die von getCurrentTime() gelieferte Zeit.
 * @returns {Date|null} Das Date-Objekt oder null bei einem Fehler.
 */
export function parsePrayerTime(timeString, dateContextParam) {
    // Wenn kein dateContextParam übergeben wird, nutze getCurrentTime() als Basis.
    const dateContext = dateContextParam
        ? new Date(dateContextParam)
        : getCurrentTime();

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
        // Erstelle eine neue Date-Instanz vom Kontext, um den Kontext nicht zu verändern
        const date = new Date(dateContext.getTime());
        date.setHours(hours, minutes, 0, 0); // Sekunden und Millisekunden auf 0 setzen
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
 * @returns {Date} Die Endzeit des Adhan (eine neue Date-Instanz).
 */
export function getAdhanEndTime(prayerConfig, prayerStartDate) {
    // Erstelle immer eine Kopie, um das Original nicht zu verändern
    const endDate = new Date(prayerStartDate.getTime());

    if (
        !prayerConfig ||
        typeof prayerConfig.adhanDurationMinutes !== 'number' ||
        prayerConfig.adhanDurationMinutes <= 0 // Dauer muss positiv sein für eine Änderung
    ) {
        return endDate; // Keine gültige Dauer, Endzeit = Startzeit
    }

    endDate.setMinutes(
        endDate.getMinutes() + prayerConfig.adhanDurationMinutes
    );
    return endDate;
}

/**
 * Berechnet die Endzeit der Iqama basierend auf der Adhan-Endzeit und Dauer.
 * @param {object} prayerConfig - Das Konfigurationsobjekt des Gebets.
 * @param {Date} adhanEndTime - Die Endzeit des Adhans.
 * @returns {Date} Die Endzeit der Iqama (eine neue Date-Instanz).
 */
export function getIqamaEndTime(prayerConfig, adhanEndTime) {
    // Erstelle immer eine Kopie, um das Original nicht zu verändern
    const iqamaEndTimeResult = new Date(adhanEndTime.getTime());

    if (
        !prayerConfig ||
        typeof prayerConfig.iqamaDurationMinutes !== 'number' ||
        prayerConfig.iqamaDurationMinutes < 0 // Dauer kann 0 sein (keine Iqama-Verzögerung), aber nicht negativ
    ) {
        return iqamaEndTimeResult; // Keine gültige Dauer, Endzeit = Adhan-Endzeit
    }

    if (prayerConfig.iqamaDurationMinutes > 0) {
        iqamaEndTimeResult.setMinutes(
            iqamaEndTimeResult.getMinutes() + prayerConfig.iqamaDurationMinutes
        );
    }
    return iqamaEndTimeResult;
}

/**
 * Formatiert ein Date-Objekt in einen "HH:MM"-String.
 * @param {Date} date - Das zu formatierende Date-Objekt.
 * @returns {string} Die formatierte Zeit oder "Ungültig" bei Fehlern.
 */
export function formatTime(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        // console.warn('Ungültiges Datum für formatTime:', date); // Optional für Debugging
        return 'Ungültig';
    }
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}
