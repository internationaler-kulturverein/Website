// prayerLogic.js
// Enthält die Logik zur Bestimmung des nächsten Gebets und des hervorzuhebenden Gebets.

import { prayerTimesConfig, jumaaConfig } from './config.js';
// Stelle sicher, dass getIqamaEndTime hier importiert wird:
import { parsePrayerTime, getAdhanEndTime, getIqamaEndTime } from './timeUtils.js';
import { initialDataLoaded, prayerTimesData } from './main.js';

/**
 * Findet das Gebet, das aktuell hervorgehoben werden soll (inkl. Adhan- und Iqama-Zeit).
 * @param {Date} now - Die aktuelle Zeit.
 * @returns {object|null} Das Konfigurationsobjekt des hervorzuhebenden Gebets
 *                        mit zusätzlichen Flags `isAdhanTime` und `isIqamaPeriod`, oder null.
 */
export function findPrayerToHighlight(now) {
    if (!initialDataLoaded) return null;

    const prayersWithTimes = [];
    const isFriday = now.getDay() === 5;

    // Helferfunktion, um Gebetsdaten aufzubereiten
    const processPrayer = (config, prayerTime, contextDate) => {
        const prayerDate = parsePrayerTime(prayerTime, contextDate);
        if (prayerDate) {
            const adhanEndTime = getAdhanEndTime(config, prayerDate);
            // Wichtig: Das "endDate" für die Hervorhebung ist jetzt das Iqama-Ende
            const iqamaEndTimeValue = getIqamaEndTime(config, adhanEndTime);
            prayersWithTimes.push({
                ...config,
                date: prayerDate, // Startzeit des Gebets
                adhanEndTime: adhanEndTime, // Ende der Adhan-Phase
                iqamaEndTime: iqamaEndTimeValue, // Ende der Iqama-Phase (und somit der Hervorhebung)
            });
        }
    };

    // Füge Hauptgebete hinzu
    prayerTimesConfig.forEach((config) => {
        if (isFriday && config.name === 'Dhuhr' && prayerTimesData['Jumaa']) return;
        const timeString = prayerTimesData[config.name];
        processPrayer(config, timeString, now);
    });

    // Füge Jumaa hinzu
    if (isFriday && prayerTimesData['Jumaa']) {
        const jumaaTimeString = prayerTimesData['Jumaa'];
        processPrayer(jumaaConfig, jumaaTimeString, now);
    }

    // Sortiere Gebete chronologisch nach Startzeit
    prayersWithTimes.sort((a, b) => a.date - b.date);

    let prayerToHighlight = null;
    for (const prayer of prayersWithTimes) {
        // Ein Gebet wird hervorgehoben, wenn 'now' VOR dem Ende seiner Iqama-Zeit liegt.
        if (now < prayer.iqamaEndTime) {
            prayerToHighlight = {
                ...prayer,
                // Flag für Blinken: Ist 'now' in der Adhan-Phase?
                isAdhanTime: now >= prayer.date && now < prayer.adhanEndTime,
                // Flag, um zu wissen, ob wir uns generell in der aktiven Phase befinden (Adhan ODER Iqama)
                // Dieses Flag ist implizit, da prayerToHighlight nur gesetzt wird, wenn now < prayer.iqamaEndTime
                // und now >= prayer.date (implizit durch die Sortierung und den Loop)
            };
            break;
        }
    }

    // Wenn kein Gebet für heute gefunden wurde (z.B. nach Isha + Iqama),
    // hebe Fajr von morgen hervor.
    if (!prayerToHighlight && prayersWithTimes.length > 0) {
        const fajrConfig = prayerTimesConfig.find((p) => p.name === 'Fajr');
        if (fajrConfig) {
            const timeString = prayerTimesData[fajrConfig.name];
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0,0,0,0); // Sicherstellen, dass es der Anfang von morgen ist

            const fajrTomorrowDate = parsePrayerTime(timeString, tomorrow);
            if (fajrTomorrowDate) {
                const fajrAdhanEnd = getAdhanEndTime(fajrConfig, fajrTomorrowDate);
                const fajrIqamaEnd = getIqamaEndTime(fajrConfig, fajrAdhanEnd);
                prayerToHighlight = {
                    ...fajrConfig,
                    date: fajrTomorrowDate,
                    adhanEndTime: fajrAdhanEnd,
                    iqamaEndTime: fajrIqamaEnd,
                    isAdhanTime: false, // Für Fajr morgen ist es noch nicht Adhan-Zeit
                };
            }
        }
    }
    return prayerToHighlight;
}

/**
 * Findet das Gebet, dessen Name als "nächstes Gebet" angezeigt werden soll.
 * Berücksichtigt Adhan- und Iqama-Phasen.
 * @param {Date} now - Die aktuelle Zeit.
 * @returns {object|null} Das Konfigurationsobjekt des nächsten Gebets oder null.
 */
export function findNextPrayer(now) {
    if (!initialDataLoaded) return null;

    let prayersToCheck = [];
    const isFriday = now.getDay() === 5;

    // Helferfunktion, um Gebetsdaten aufzubereiten (ähnlich wie oben, aber mit Iqama-Ende für die Logik)
    const processPrayerForNext = (config, prayerTime, contextDate) => {
        const prayerDate = parsePrayerTime(prayerTime, contextDate);
        if (prayerDate) {
            const adhanEndTime = getAdhanEndTime(config, prayerDate);
            const iqamaEndTimeValue = getIqamaEndTime(config, adhanEndTime);
            prayersToCheck.push({
                ...config,
                date: prayerDate,
                adhanEndTime: adhanEndTime, // Nicht unbedingt für Logik hier gebraucht, aber für Konsistenz
                iqamaEndTime: iqamaEndTimeValue, // Wichtig für die "aktiv" Prüfung
            });
        }
    };

    prayerTimesConfig.forEach((prayer) => {
        if (isFriday && prayer.name === 'Dhuhr' && prayerTimesData['Jumaa']) return;
        const timeString = prayerTimesData[prayer.name];
        processPrayerForNext(prayer, timeString, now);
    });

    if (isFriday && prayerTimesData['Jumaa']) {
        const jumaaTimeString = prayerTimesData['Jumaa'];
        processPrayerForNext(jumaaConfig, jumaaTimeString, now);
    }

    prayersToCheck.sort((a, b) => a.date - b.date);

    // 1. Prüfen, ob ein Gebet gerade in Adhan- oder Iqama-Phase ist
    for (const prayer of prayersToCheck) {
        // Wenn 'now' zwischen Gebetsstart und Iqama-Ende liegt, ist DIESES Gebet das "nächste" für die Anzeige
        if (now >= prayer.date && now < prayer.iqamaEndTime) {
            return { ...prayer }; // Gibt die Konfiguration des aktuellen Gebets zurück
        }
    }

    // 2. Wenn kein Gebet aktiv ist, finde das chronologisch nächste Gebet (dessen Startzeit in der Zukunft liegt)
    let chronologicallyNextPrayer = null;
    for (const prayer of prayersToCheck) {
        if (prayer.date && prayer.date > now) {
            chronologicallyNextPrayer = prayer;
            break;
        }
    }

    // 3. Wenn kein nächstes Gebet für heute gefunden wurde, nimm Fajr von morgen.
    if (!chronologicallyNextPrayer && prayersToCheck.length > 0) {
        const fajrConfig = prayerTimesConfig.find((p) => p.name === 'Fajr');
        if (fajrConfig) {
            const timeString = prayerTimesData[fajrConfig.name];
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0,0,0,0);
            const fajrTomorrowDate = parsePrayerTime(timeString, tomorrow);
            if (fajrTomorrowDate) {
                // Für "Nächstes Gebet" brauchen wir hier nicht die vollen Endzeiten, nur das Datum
                chronologicallyNextPrayer = { ...fajrConfig, date: fajrTomorrowDate };
            }
        }
    }

    return chronologicallyNextPrayer;
}
