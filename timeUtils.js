// timeUtils.js
// Enthält Hilfsfunktionen zur Zeitberechnung und -formatierung.

import {
    useOverrideDate,
    overrideDate,
    useOverrideTime,
    overrideTime,
    overrideTimeSetAt,
} from './state.js'; // Importiere Zentralen State

/**
 * Gibt die aktuelle Zeit zurück (Echtzeit oder Testzeit).
 * Berücksichtigt Debug-Overrides.
 * @returns {Date} Das aktuelle Date-Objekt.
 */
export function getCurrentTime() {
    const nowForReal = new Date(); // Echte aktuelle Systemzeit

    if (useOverrideTime && overrideTime && overrideTimeSetAt) {
        // Fall 1: Zeit-Override ist aktiv (ggf. mit Datums-Override)
        const realElapsedMsSinceOverrideSet = nowForReal.getTime() - overrideTimeSetAt.getTime();
        // Starte mit der initialen Override-Zeit und addiere die seitdem vergangene Echtzeit
        const currentSimulatedTime = new Date(overrideTime.getTime() + realElapsedMsSinceOverrideSet);

        if (useOverrideDate && overrideDate) {
            // Wenn auch ein Datums-Override aktiv ist, kombiniere es:
            // Nimm das Datum von overrideDate und die simulierte Zeit von currentSimulatedTime.
            return new Date(
                overrideDate.getFullYear(),
                overrideDate.getMonth(),
                overrideDate.getDate(),
                currentSimulatedTime.getHours(),
                currentSimulatedTime.getMinutes(),
                currentSimulatedTime.getSeconds(),
                currentSimulatedTime.getMilliseconds()
            );
        } else {
            // Nur Zeit-Override: Verwende das heutige reale Datum mit der simulierten Zeit.
            // (Das overrideTime-Objekt enthält bereits das korrekte Datum, wenn es zusammen mit overrideDate gesetzt wurde,
            // oder das Datum des Tages, an dem der Zeit-Override allein gesetzt wurde).
            // Die currentSimulatedTime hat bereits das korrekte Datum (entweder von overrideTime oder das heutige, wenn nur Zeit gesetzt wurde).
            return currentSimulatedTime;
        }
    } else if (useOverrideDate && overrideDate) {
        // Fall 2: Nur Datums-Override ist aktiv (kein Zeit-Override)
        // Verwende das overrideDate und die aktuelle reale Uhrzeit.
        return new Date(
            overrideDate.getFullYear(),
            overrideDate.getMonth(),
            overrideDate.getDate(),
            nowForReal.getHours(),
            nowForReal.getMinutes(),
            nowForReal.getSeconds(),
            nowForReal.getMilliseconds()
        );
    } else {
        return new Date();
    }
}

/**
 * Parst einen Zeitstring (HH:MM oder HH:MM:SS) und gibt ein Date-Objekt zurück.
 * @param {string} timeString - Der Zeitstring im Format HH:MM oder HH:MM:SS.
 * @param {Date} [dateContextParam] - Das Datum, auf das die Zeit angewendet werden soll.
 *                                    Standard ist die von getCurrentTime() gelieferte Zeit.
 * @returns {Date|null} Das Date-Objekt oder null bei einem Fehler.
 */
export function parsePrayerTime(timeString, dateContextParam) {
    const dateContext = dateContextParam
        ? new Date(dateContextParam) // Erstelle eine Kopie, um das Original nicht zu verändern
        : getCurrentTime();

    if (!timeString || typeof timeString !== 'string' || !timeString.includes(':')) {
        return null;
    }
    try {
        const parts = timeString.split(':');
        if (parts.length < 2) {
            return null;
        }
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        const seconds = parts.length > 2 ? parseInt(parts[2], 10) : 0; // Standardmäßig 0 Sekunden

        if (
            isNaN(hours) || isNaN(minutes) || isNaN(seconds) ||
            hours < 0 || hours > 23 ||
            minutes < 0 || minutes > 59 ||
            seconds < 0 || seconds > 59
        ) {
            return null;
        }

        const date = new Date(dateContext.getTime()); // Erstelle eine neue Date-Instanz vom Kontext
        date.setHours(hours, minutes, seconds, 0); // Sekunden und Millisekunden auf 0 setzen (oder übernommene Sekunden)
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
    const endDate = new Date(prayerStartDate.getTime());
    if (!prayerConfig || typeof prayerConfig.adhanDurationMinutes !== 'number' || prayerConfig.adhanDurationMinutes <= 0) {
        return endDate;
    }
    endDate.setMinutes(endDate.getMinutes() + prayerConfig.adhanDurationMinutes);
    return endDate;
}

/**
 * Berechnet die Endzeit der Iqama basierend auf der Adhan-Endzeit und Dauer.
 * @param {object} prayerConfig - Das Konfigurationsobjekt des Gebets.
 * @param {Date} adhanEndTime - Die Endzeit des Adhans.
 * @returns {Date} Die Endzeit der Iqama (eine neue Date-Instanz).
 */
export function getIqamaEndTime(prayerConfig, adhanEndTime) {
    const iqamaEndTimeResult = new Date(adhanEndTime.getTime());
    if (!prayerConfig || typeof prayerConfig.iqamaDurationMinutes !== 'number' || prayerConfig.iqamaDurationMinutes < 0) {
        return iqamaEndTimeResult;
    }
    if (prayerConfig.iqamaDurationMinutes > 0) {
        iqamaEndTimeResult.setMinutes(iqamaEndTimeResult.getMinutes() + prayerConfig.iqamaDurationMinutes);
    }
    return iqamaEndTimeResult;
}

