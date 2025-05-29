// timeUtils.js
// Enthält Hilfsfunktionen zur Zeitberechnung und -formatierung.

import {
    useOverrideDate,
    overrideDate,
    useOverrideTime,
    overrideTime,
    overrideTimeSetAt,
} from './debug.js'; // Importiere Debug-Statusvariablen
import { timeOffset } from './main.js'; // Importiere den globalen timeOffset aus main.js

/**
 * Gibt die aktuelle Zeit zurück (Echtzeit oder Testzeit).
 * Berücksichtigt Debug-Overrides und den globalen timeOffset.
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
        // Fall 3: Kein Debug-Override aktiv. Verwende die echte Zeit + globalen timeOffset.
        // timeOffset ist in Stunden. Umrechnung in Millisekunden.
        const offsetMilliseconds = (typeof timeOffset === 'number' ? timeOffset : 0) * 60 * 60 * 1000;
        // ACHTUNG: In deiner ursprünglichen Logik hast du den Offset *subtrahiert*.
        // Normalerweise addiert man einen positiven Offset oder subtrahiert einen negativen.
        // Ich gehe davon aus, dass ein positiver timeOffset die Zeit "nach vorne" verschieben soll.
        // Wenn timeOffset z.B. 2 ist, soll es 2 Stunden später sein.
        // Wenn timeOffset -1 ist, soll es 1 Stunde früher sein.
        // Deine Logik: `baseDate.getTime() - offset`
        // Wenn timeOffset = 2 (2 Stunden in die Zukunft), dann `now - 2h` -> 2h in die Vergangenheit.
        // Wenn das so gewollt ist, behalte das Minus.
        // Üblicher wäre: `nowForReal.getTime() + offsetMilliseconds`
        // Ich behalte deine Logik mit Minus bei, falls das Absicht war:
        return new Date(nowForReal.getTime() - offsetMilliseconds);
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
        // console.warn(`Ungültiger Zeitstring für parsePrayerTime: ${timeString}`);
        return null;
    }
    try {
        const parts = timeString.split(':');
        if (parts.length < 2) {
            // console.warn(`Ungültiges Format in Zeitstring: ${timeString}`);
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
            // console.warn(`Ungültige Stunden/Minuten/Sekunden in Zeitstring: ${timeString}`);
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

/**
 * Formatiert ein Date-Objekt in einen "HH:MM"-String.
 * @param {Date|string} dateInput - Das zu formatierende Date-Objekt oder ein Zeitstring.
 * @returns {string} Die formatierte Zeit oder "Ungültig" bei Fehlern.
 */
export function formatTime(dateInput) {
    if (typeof dateInput === 'string') {
        // Wenn es bereits ein String ist (z.B. "05:30"), gib ihn direkt zurück,
        // aber stelle sicher, dass er das HH:MM Format hat (optional).
        // Für diese Funktion gehen wir davon aus, dass ein String bereits formatiert ist
        // oder dass die Eingabe ein Date-Objekt sein sollte.
        // Hier könnte man eine Validierung für den String einbauen.
        // Fürs Erste: Wenn es ein String ist, der ':' enthält, nehmen wir an, er ist ok.
        if (dateInput.includes(':')) return dateInput.substring(0,5); // Nur HH:MM
        return 'Ungültig'; // Oder versuche, ihn zu parsen
    }
    if (!(dateInput instanceof Date) || isNaN(dateInput.getTime())) {
        return 'Ungültig';
    }
    const hours = dateInput.getHours().toString().padStart(2, '0');
    const minutes = dateInput.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Du könntest hier auch calculateRemainingTime hinzufügen, falls es nicht woanders ist.
/**
 * Berechnet die verbleibende Zeit bis zu einem Zielzeitpunkt.
 * @param {Date} targetTime - Der Zielzeitpunkt.
 * @param {Date} currentTime - Die aktuelle Zeit.
 * @returns {{hours: number, minutes: number, seconds: number, totalSeconds: number, isPast: boolean}}
 */
export function calculateRemainingTime(targetTime, currentTime) {
    if (!(targetTime instanceof Date) || !(currentTime instanceof Date) || isNaN(targetTime.getTime()) || isNaN(currentTime.getTime())) {
        return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isPast: true };
    }

    let diffMs = targetTime.getTime() - currentTime.getTime();
    const isPast = diffMs < 0;

    if (isPast) {
        // Wenn das Ziel in der Vergangenheit liegt, können wir 0 zurückgeben oder die Differenz als positiv.
        // Für einen Countdown ist 0 sinnvoll.
        return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isPast: true };
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { hours, minutes, seconds, totalSeconds, isPast: false };
}
