// prayerLogic.js
// Enthält die Logik zur Bestimmung des nächsten Gebets und des hervorzuhebenden Gebets.

import { prayerTimesConfig, jumaaConfig } from './config.js';
import { parsePrayerTime, getAdhanEndTime } from './timeUtils.js';
import { initialDataLoaded, prayerTimesData } from './main.js'; // Importiere Status aus main.js

/**
 * Findet das Gebet, das aktuell hervorgehoben werden soll (inkl. Adhan-Zeit).
 * @param {Date} now - Die aktuelle Zeit.
 * @returns {object|null} Das Konfigurationsobjekt des hervorzuhebenden Gebets oder null.
 */
export function findPrayerToHighlight(now) {
    if (!initialDataLoaded) return null;

    const prayersWithTimes = [];
    const isFriday = now.getDay() === 5;

    // Füge Hauptgebete hinzu (außer Dhuhr am Freitag, wenn Jumaa existiert)
    prayerTimesConfig.forEach((config) => {
        if (isFriday && config.name === 'Dhuhr' && prayerTimesData['Jumaa']) return;
        const timeString = prayerTimesData[config.name];
        const prayerDate = parsePrayerTime(timeString, now);
        if (prayerDate) {
            const prayerEndDate = getAdhanEndTime(config, prayerDate);
            prayersWithTimes.push({
                ...config,
                date: prayerDate,
                endDate: prayerEndDate,
            });
        }
    });

    // Füge Jumaa hinzu, wenn es Freitag ist und Jumaa-Zeit existiert
    if (isFriday && prayerTimesData['Jumaa']) {
        const jumaaTimeString = prayerTimesData['Jumaa'];
        const jumaaDate = parsePrayerTime(jumaaTimeString, now);
        if (jumaaDate) {
            const jumaaEndDate = getAdhanEndTime(jumaaConfig, jumaaDate);
            prayersWithTimes.push({
                ...jumaaConfig,
                date: jumaaDate,
                endDate: jumaaEndDate,
            });
        }
    }

    // Sortiere Gebete chronologisch nach Startzeit
    prayersWithTimes.sort((a, b) => a.date - b.date);

    // Finde das erste Gebet, dessen Endzeit (inkl. Adhan) in der Zukunft liegt
    let prayerToHighlight = null;
    for (const prayer of prayersWithTimes) {
        if (now < prayer.endDate) {
            prayerToHighlight = prayer;
            break;
        }
    }

    // Wenn kein Gebet für heute gefunden wurde (z.B. nach Isha),
    // hebe Fajr von morgen hervor.
    if (!prayerToHighlight && prayersWithTimes.length > 0) {
        const fajrConfig = prayerTimesConfig.find((p) => p.name === 'Fajr');
        if (fajrConfig) {
            const timeString = prayerTimesData[fajrConfig.name];
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const fajrTomorrowDate = parsePrayerTime(timeString, tomorrow);
            if (fajrTomorrowDate) {
                const fajrTomorrowEndDate = getAdhanEndTime(
                    fajrConfig,
                    fajrTomorrowDate
                );
                // Wichtig: Das zurückgegebene Objekt muss die Daten für morgen enthalten
                prayerToHighlight = {
                    ...fajrConfig,
                    date: fajrTomorrowDate,
                    endDate: fajrTomorrowEndDate,
                };
            }
        }
    }
    return prayerToHighlight;
}

/**
 * Findet das chronologisch nächste Gebet (basierend auf der Startzeit).
 * @param {Date} now - Die aktuelle Zeit.
 * @returns {object|null} Das Konfigurationsobjekt des nächsten Gebets oder null.
 */
export function findNextPrayer(now) {
    if (!initialDataLoaded) return null;

    let prayersToCheck = [];
    const isFriday = now.getDay() === 5;

    // Füge Hauptgebete hinzu (außer Dhuhr am Freitag, wenn Jumaa existiert)
    prayerTimesConfig.forEach((prayer) => {
        if (isFriday && prayer.name === 'Dhuhr' && prayerTimesData['Jumaa']) return;
        const timeString = prayerTimesData[prayer.name];
        const prayerDate = parsePrayerTime(timeString, now);
        if (prayerDate) {
            prayersToCheck.push({ ...prayer, date: prayerDate });
        }
    });

    // Füge Jumaa hinzu, wenn es Freitag ist und Jumaa-Zeit existiert
    if (isFriday && prayerTimesData['Jumaa']) {
        const jumaaTimeString = prayerTimesData['Jumaa'];
        const jumaaDate = parsePrayerTime(jumaaTimeString, now);
        if (jumaaDate) {
            prayersToCheck.push({ ...jumaaConfig, date: jumaaDate });
        }
    }

    // Sortiere Gebete chronologisch nach Startzeit
    prayersToCheck.sort((a, b) => a.date - b.date);

    // Finde das erste Gebet, dessen Startzeit in der Zukunft liegt
    let chronologicallyNextPrayer = null;
    for (const prayer of prayersToCheck) {
        if (prayer.date && prayer.date > now) {
            chronologicallyNextPrayer = prayer;
            break;
        }
    }

    // Wenn kein nächstes Gebet für heute gefunden wurde (z.B. nach Isha),
    // nimm Fajr von morgen.
    if (!chronologicallyNextPrayer && prayersToCheck.length > 0) {
        const fajrConfig = prayerTimesConfig.find((p) => p.name === 'Fajr');
        if (fajrConfig) {
            const timeString = prayerTimesData[fajrConfig.name];
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const fajrTomorrowDate = parsePrayerTime(timeString, tomorrow);
            if (fajrTomorrowDate) {
                // Wichtig: Das zurückgegebene Objekt muss die Daten für morgen enthalten
                chronologicallyNextPrayer = { ...fajrConfig, date: fajrTomorrowDate };
            }
        }
    }

    return chronologicallyNextPrayer;
}
